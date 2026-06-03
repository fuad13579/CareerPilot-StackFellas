import asyncio
import logging
import os
from datetime import datetime
from typing import Any

import httpx

from app.models.job_models import JobCard

logger = logging.getLogger(__name__)

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
REMOTIVE_SOURCE = "Remotive"

# Adzuna — free tier (250 calls/month). Sign up at
# https://developer.adzuna.com/ to get app_id + app_key.
# If the env vars are missing, search_adzuna is silently skipped.
ADZUNA_API_URL = "https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"
ADZUNA_SOURCE = "Adzuna"
ADZUNA_DEFAULT_COUNTRY = os.getenv("ADZUNA_COUNTRY", "us")

# Arbeitnow — free, no key required.
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"
ARBEITNOW_SOURCE = "Arbeitnow"

# Timeout for API requests (seconds)
REQUEST_TIMEOUT = 10.0


def _normalize_description(description: str | None, max_length: int = 500) -> str:
    """Clean and truncate job description."""
    if not description:
        return ""
    # Clean HTML tags
    clean = description.replace("<br>", "\n").replace("<br/>", "\n").replace("<p>", "").replace("</p>", "\n")
    # Remove extra whitespace
    clean = " ".join(clean.split())
    # Truncate
    if len(clean) > max_length:
        clean = clean[:max_length].rsplit(" ", 1)[0] + "..."
    return clean


def _extract_salary(job: dict[str, Any]) -> str | None:
    """Extract salary information from job data."""
    salary = job.get("salary")
    if not salary or str(salary).strip() == "":
        return None
    salary_str = str(salary).strip()
    if salary_str.lower() in {"null", "none", ""}:
        return None
    return salary_str


def _extract_job_skills(job: dict[str, Any]) -> list[str]:
    """Extract skills from job data (title, description, tags, category)."""
    from app.services.job_skill_extraction_service import extract_skills_from_job
    return extract_skills_from_job(job)


def _normalize_job(raw_job: dict[str, Any]) -> JobCard | None:
    """Normalize a raw job dict to JobCard, or return None if invalid."""
    try:
        job_id = raw_job.get("id") or raw_job.get("job_id") or str(hash(str(raw_job.get("url", ""))))
        if not job_id:
            return None

        role = raw_job.get("title") or raw_job.get("role")
        if not role:
            return None

        return JobCard(
            job_id=str(job_id),
            role=role,
            company=raw_job.get("company_name") or raw_job.get("company") or "Unknown Company",
            location=raw_job.get("candidate_required_location") or raw_job.get("location") or None,
            deadline=raw_job.get("application_deadline") or raw_job.get("deadline") or None,
            salary=_extract_salary(raw_job),
            required_skills=_extract_job_skills(raw_job),
            description=_normalize_description(raw_job.get("description")),
            job_url=raw_job.get("url") or raw_job.get("job_url") or None,
            source=raw_job.get("source") or REMOTIVE_SOURCE,
            is_live=True,
            fetched_at=datetime.utcnow(),
            # fit_score, matched_skills, missing_skills, reason default to None / []
            # here. They are filled in by the recommendation service only when
            # a CV is in play — see enrich_job_with_fit_score.
        )
    except Exception:
        return None


async def search_remotive(query: str, location: str, limit: int) -> tuple[str, list[JobCard], bool, str | None]:
    """
    Search for jobs using Remotive API.

    Args:
        query: Search query for jobs
        location: Location filter (e.g., "remote")
        limit: Maximum number of results

    Returns:
        Tuple of (source_name, list of JobCards, is_error, message)
    """
    logger.info(f"Searching Remotive for: {query}, location: {location}")

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            params: dict[str, Any] = {"limit": limit}
            if query:
                params["search"] = query
            # Remotive supports category filtering
            response = await client.get(REMOTIVE_API_URL, params=params)
            response.raise_for_status()

            try:
                data = response.json()
            except Exception as e:
                logger.error(f"Invalid JSON response from Remotive: {e}")
                return REMOTIVE_SOURCE, [], True, "Invalid API response format."

            if not isinstance(data, dict):
                logger.error("Remotive API response is not a dictionary")
                return REMOTIVE_SOURCE, [], True, "Invalid API response format."

            jobs_data = data.get("jobs")
            if not isinstance(jobs_data, list):
                logger.error("Remotive API 'jobs' field is not a list")
                return REMOTIVE_SOURCE, [], True, "Invalid jobs format."

            # Convert jobs, filtering out invalid ones
            jobs = [job for job in (_normalize_job(raw_job) for raw_job in jobs_data) if job]

            if not jobs:
                logger.info("No jobs found on Remotive")
                return REMOTIVE_SOURCE, [], False, "No jobs found matching your criteria."

            logger.info(f"Found {len(jobs)} jobs from Remotive")
            return REMOTIVE_SOURCE, jobs[:limit], False, None

    except httpx.TimeoutException:
        logger.error("Remotive API timeout")
        return REMOTIVE_SOURCE, [], True, "Job API timed out. Please try again."

    except httpx.HTTPStatusError as e:
        logger.error(f"Remotive API HTTP error: {e.response.status_code}")
        return REMOTIVE_SOURCE, [], True, f"Job API returned status {e.response.status_code}."

    except httpx.RequestError as e:
        logger.error(f"Remotive API request error: {e}")
        return REMOTIVE_SOURCE, [], True, "Network error connecting to job API."

    except Exception as e:
        logger.error(f"Remotive API unexpected error: {str(e)}")
        return REMOTIVE_SOURCE, [], True, f"Unexpected error: {str(e)}"


async def fetch_live_jobs(query: str, location: str, limit: int) -> tuple[str, list[JobCard], str | None]:
    """
    Fetch jobs from live sources, fanning out in parallel and merging
    results. Sources, in priority order:

    1. Adzuna   — best free-text search; requires ADZUNA_APP_ID/KEY env
                  vars, silently skipped when not configured.
    2. Arbeitnow — free, no key, decent `search` support.
    3. Remotive  — kept as a no-key fallback (its public search filter
                   is currently broken upstream, so we treat it as a
                   general pool).

    Results are de-duplicated by ``job_url`` (falling back to
    ``(company, role)`` when URL is missing) and truncated to ``limit``.

    Returns:
        Tuple of (combined_source_label, jobs, error_message).
        If all sources fail, jobs is empty and error_message is set to
        the most informative failure reason.
    """
    # Build the list of source coroutines. Each helper returns the
    # standard (source, jobs, is_error, message) tuple.
    tasks: list = [search_arbeitnow(query, location, limit)]

    adzuna_id = os.getenv("ADZUNA_APP_ID", "").strip()
    adzuna_key = os.getenv("ADZUNA_APP_KEY", "").strip()
    if adzuna_id and adzuna_key:
        tasks.insert(0, search_adzuna(query, location, limit, adzuna_id, adzuna_key))

    tasks.append(search_remotive(query, location, limit))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    collected: list[JobCard] = []
    sources: list[str] = []
    errors: list[str] = []
    seen_keys: set[str] = set()

    for entry in results:
        if isinstance(entry, Exception):
            logger.error("Live job source raised: %s", entry)
            errors.append(str(entry))
            continue

        source, jobs, is_error, message = entry
        if is_error or not jobs:
            if message:
                errors.append(f"{source}: {message}")
            continue

        for job in jobs:
            key = (job.job_url or "").strip().lower() or f"{job.company.strip().lower()}|{job.role.strip().lower()}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            collected.append(job)
            if source not in sources:
                sources.append(source)

    if not collected:
        logger.warning(
            "All live job sources failed: %s",
            " | ".join(errors) if errors else "no sources configured",
        )
        return (
            "None" if not sources else "+".join(sources),
            [],
            errors[0] if errors else "No live job sources are currently available.",
        )

    # Interleave by source priority so each source contributes to the
    # first page when there are more results than `limit`. Otherwise the
    # first-priority source (Adzuna) would crowd out the others.
    by_source: dict[str, list[JobCard]] = {}
    for job in collected:
        by_source.setdefault(job.source, []).append(job)
    interleaved: list[JobCard] = []
    queue: list[list[JobCard]] = [by_source[s] for s in (ADZUNA_SOURCE, ARBEITNOW_SOURCE, REMOTIVE_SOURCE) if s in by_source]
    queue.extend(v for k, v in by_source.items() if k not in {ADZUNA_SOURCE, ARBEITNOW_SOURCE, REMOTIVE_SOURCE})
    while queue and len(interleaved) < limit:
        for bucket in queue:
            if bucket and len(interleaved) < limit:
                interleaved.append(bucket.pop(0))
        queue = [b for b in queue if b]

    return ("+".join(sources) if sources else "Live", interleaved, None)


# ---------------------------------------------------------------------------
# Adzuna — https://developer.adzuna.com/
# Free tier: 250 calls/month. Has a real free-text `what` parameter and a
# `where` location filter, which makes it the strongest Remotive
# replacement for the search bar.
# ---------------------------------------------------------------------------


def _adzuna_to_jobcard(raw: dict[str, Any]) -> JobCard | None:
    try:
        adzuna_id = raw.get("id")
        title = raw.get("title")
        company = (raw.get("company") or {}).get("display_name")
        location = (raw.get("location") or {}).get("display_name")
        if not adzuna_id or not title or not company:
            return None
        salary_min = raw.get("salary_min")
        salary_max = raw.get("salary_max")
        if salary_min and salary_max:
            salary = f"{int(salary_min):,} - {int(salary_max):,}"
        else:
            salary = None
        created = raw.get("created")
        deadline = created.split("T", 1)[0] if isinstance(created, str) else None
        return JobCard(
            job_id=f"adzuna-{adzuna_id}",
            role=title,
            company=company,
            location=location,
            deadline=deadline,
            salary=salary,
            required_skills=_extract_job_skills(raw),
            description=_normalize_description(raw.get("description")),
            job_url=raw.get("redirect_url") or raw.get("url"),
            source=ADZUNA_SOURCE,
            is_live=True,
            fetched_at=datetime.utcnow(),
        )
    except Exception as e:
        logger.warning("Adzuna parse failed: %s (id=%r title=%r)", e, raw.get("id"), raw.get("title"))
        return None


async def search_adzuna(
    query: str,
    location: str,
    limit: int,
    app_id: str,
    app_key: str,
) -> tuple[str, list[JobCard], bool, str | None]:
    """
    Search Adzuna's free public API.

    The `what` parameter is the real free-text search and is what makes
    this source useful for the dashboard search bar.
    """
    logger.info("Adzuna search query=%r location=%r limit=%d", query, location, limit)
    try:
        params: dict[str, Any] = {
            "app_id": app_id,
            "app_key": app_key,
            "results_per_page": min(limit, 50),
            "what": query or "software",
            "content-type": "application/json",
        }
        if location and location.strip() and location.lower() != "remote":
            params["where"] = location
        # `what_or` broadens the result; `what_and` would narrow. We use
        # the default behavior which is `what` (AND) — what users expect.
        url = ADZUNA_API_URL.format(country=ADZUNA_DEFAULT_COUNTRY, page=1)
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                logger.warning("Adzuna non-200 (%d): %s", response.status_code, response.text[:200])
            response.raise_for_status()
            try:
                data = response.json()
            except Exception as e:
                logger.error("Invalid JSON from Adzuna: %s", e)
                return ADZUNA_SOURCE, [], True, "Invalid API response format."
            if not isinstance(data, dict):
                return ADZUNA_SOURCE, [], True, "Invalid API response format."
            results = data.get("results")
            if not isinstance(results, list):
                return ADZUNA_SOURCE, [], True, "Invalid jobs format."
            jobs = [j for j in (_adzuna_to_jobcard(r) for r in results) if j]
            if not jobs:
                return ADZUNA_SOURCE, [], False, "No jobs found matching your criteria."
            logger.info("Adzuna returned %d jobs", len(jobs))
            return ADZUNA_SOURCE, jobs[:limit], False, None
    except httpx.TimeoutException:
        return ADZUNA_SOURCE, [], True, "Adzuna timed out."
    except httpx.HTTPStatusError as e:
        return ADZUNA_SOURCE, [], True, f"Adzuna returned status {e.response.status_code}."
    except httpx.RequestError as e:
        return ADZUNA_SOURCE, [], True, f"Adzuna network error: {e}"
    except Exception as e:
        logger.exception("Adzuna unexpected error")
        return ADZUNA_SOURCE, [], True, f"Adzuna unexpected error: {e}"


# ---------------------------------------------------------------------------
# Arbeitnow — https://www.arbeitnow.com/api/job-board-api
# Free, no API key. Supports a real `search` parameter for free-text
# filtering. Mostly EU/international roles, good backup for Adzuna.
# ---------------------------------------------------------------------------


def _arbeitnow_to_jobcard(raw: dict[str, Any]) -> JobCard | None:
    try:
        slug = raw.get("slug")
        title = raw.get("title")
        company = raw.get("company_name")
        if not slug or not title or not company:
            return None
        # created_at is unix seconds in arbeitnow's payload
        created = raw.get("created_at")
        deadline = None
        if isinstance(created, (int, float)):
            try:
                deadline = datetime.utcfromtimestamp(created).date().isoformat()
            except Exception:
                deadline = None
        return JobCard(
            job_id=f"arbeitnow-{slug}",
            role=title,
            company=company,
            location=raw.get("location") or "Remote",
            deadline=deadline,
            salary=None,
            required_skills=_extract_job_skills(raw),
            description=_normalize_description(raw.get("description")),
            job_url=raw.get("url") or f"https://www.arbeitnow.com/job/{slug}",
            source=ARBEITNOW_SOURCE,
            is_live=True,
            fetched_at=datetime.utcnow(),
        )
    except Exception:
        return None


async def search_arbeitnow(
    query: str, location: str, limit: int
) -> tuple[str, list[JobCard], bool, str | None]:
    """
    Search Arbeitnow's free public API. No key required.

    Arbeitnow supports a working `search` parameter for free-text
    filtering — much better than Remotive's broken one.
    """
    logger.info("Searching Arbeitnow for: %r", query)
    try:
        params: dict[str, Any] = {}
        if query and query.strip():
            params["search"] = query.strip()
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(ARBEITNOW_API_URL, params=params)
            response.raise_for_status()
            try:
                data = response.json()
            except Exception as e:
                logger.error("Invalid JSON from Arbeitnow: %s", e)
                return ARBEITNOW_SOURCE, [], True, "Invalid API response format."
            if not isinstance(data, dict):
                return ARBEITNOW_SOURCE, [], True, "Invalid API response format."
            results = data.get("data")
            if not isinstance(results, list):
                return ARBEITNOW_SOURCE, [], True, "Invalid jobs format."
            jobs = [j for j in (_arbeitnow_to_jobcard(r) for r in results) if j]
            if not jobs:
                return ARBEITNOW_SOURCE, [], False, "No jobs found matching your criteria."
            logger.info("Arbeitnow returned %d jobs", len(jobs))
            return ARBEITNOW_SOURCE, jobs[:limit], False, None
    except httpx.TimeoutException:
        return ARBEITNOW_SOURCE, [], True, "Arbeitnow timed out."
    except httpx.HTTPStatusError as e:
        return ARBEITNOW_SOURCE, [], True, f"Arbeitnow returned status {e.response.status_code}."
    except httpx.RequestError as e:
        return ARBEITNOW_SOURCE, [], True, f"Arbeitnow network error: {e}"
    except Exception as e:
        logger.exception("Arbeitnow unexpected error")
        return ARBEITNOW_SOURCE, [], True, f"Arbeitnow unexpected error: {e}"