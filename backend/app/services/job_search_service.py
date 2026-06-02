import logging
from datetime import datetime
from typing import Any

import httpx

from app.models.job_models import JobCard

logger = logging.getLogger(__name__)

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
REMOTIVE_SOURCE = "Remotive"

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
    Fetch jobs from live sources. Primary: Remotive.
    
    Returns:
        Tuple of (source, jobs, error_message)
        If error, jobs will be empty and error_message will be set
    """
    source, jobs, is_error, message = await search_remotive(query, location, limit)
    
    if is_error:
        logger.error(f"Live job fetch failed: {message}")
        return source, [], message
    
    return source, jobs, None