import logging
from typing import Any

import httpx

from app.models.job_models import JobCard
from app.services.job_skill_extraction_service import extract_skills_from_job
from app.utils.query_parser import parse_query


logger = logging.getLogger(__name__)

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
REMOTIVE_SOURCE = "Remotive"
FALLBACK_SOURCE = "Fallback Demo Data"

# Fallback demo jobs for when external API fails
FALLBACK_JOBS = [
    {
        "job_id": "fallback-backend-001",
        "role": "Junior Backend Developer",
        "company": "DemoTech Solutions",
        "location": "Remote",
        "deadline": None,
        "salary": None,
        "required_skills": ["Python", "FastAPI", "REST API", "SQL"],
        "description": "Demo backend role for testing CareerPilot job search and fit scoring.",
        "job_url": None,
        "source": FALLBACK_SOURCE,
    },
    {
        "job_id": "fallback-frontend-001",
        "role": "Frontend Developer Intern",
        "company": "CareerDemo Labs",
        "location": "Remote",
        "deadline": None,
        "salary": None,
        "required_skills": ["React", "JavaScript", "HTML", "CSS"],
        "description": "Demo frontend internship for testing CareerPilot job search and fit scoring.",
        "job_url": None,
        "source": FALLBACK_SOURCE,
    },
    {
        "job_id": "fallback-data-001",
        "role": "Data Analyst Intern",
        "company": "Insight Demo Group",
        "location": "Remote",
        "deadline": None,
        "salary": None,
        "required_skills": ["Python", "SQL", "Data Analysis", "Pandas"],
        "description": "Demo data role for testing CareerPilot job search and fit scoring.",
        "job_url": None,
        "source": FALLBACK_SOURCE,
    },
]


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


def _normalize_job(raw_job: dict[str, Any]) -> JobCard | None:
    """Normalize a raw job dict to JobCard, or return None if invalid."""
    try:
        job_id = raw_job.get("id") or raw_job.get("job_id") or str(hash(raw_job.get("url", "")))
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
            required_skills=extract_skills_from_job(raw_job),
            description=_normalize_description(raw_job.get("description")),
            job_url=raw_job.get("url") or raw_job.get("job_url") or None,
            source=raw_job.get("source") or REMOTIVE_SOURCE,
        )
    except Exception:
        return None


def _convert_remotive_job(raw_job: dict[str, Any]) -> JobCard | None:
    """Convert a Remotive API job to JobCard format."""
    return _normalize_job(raw_job)


def get_fallback_jobs() -> list[JobCard]:
    """Return the list of fallback demo jobs."""
    jobs = []
    for fallback in FALLBACK_JOBS:
        jobs.append(
            JobCard(
                job_id=fallback["job_id"],
                role=fallback["role"],
                company=fallback["company"],
                location=fallback["location"],
                deadline=fallback["deadline"],
                salary=fallback["salary"],
                required_skills=fallback["required_skills"],
                description=fallback["description"],
                job_url=fallback["job_url"],
                source=fallback["source"],
            )
        )
    return jobs


async def search_jobs(query: str, max_results: int = 20) -> tuple[str, list[JobCard], bool, str | None]:
    """
    Search for jobs using Remotive API with robust error handling.

    Args:
        query: Natural language search query
        max_results: Maximum number of results to return

    Returns:
        Tuple of (source_name, list of JobCards, is_fallback, message)
    """
    # Parse the natural language query
    parsed = parse_query(query)
    search_term = parsed["raw_query"]

    logger.info(f"Searching Remotive for: {search_term}")

    # If no search term, return fallback
    if not search_term:
        logger.warning("No search terms extracted from query")
        return FALLBACK_SOURCE, get_fallback_jobs(), True, "No search terms provided. Showing fallback demo jobs."

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params: dict[str, Any] = {"limit": max_results}
            if search_term:
                params["search"] = search_term

            response = await client.get(REMOTIVE_API_URL, params=params)
            response.raise_for_status()

            # Parse JSON
            try:
                data = response.json()
            except Exception as e:
                logger.error(f"Invalid JSON response from Remotive: {e}")
                return FALLBACK_SOURCE, get_fallback_jobs(), True, "Invalid API response format. Showing fallback demo jobs."

            # Validate response structure
            if not isinstance(data, dict):
                logger.error("Remotive API response is not a dictionary")
                return FALLBACK_SOURCE, get_fallback_jobs(), True, "Invalid API response format. Showing fallback demo jobs."

            jobs_data = data.get("jobs")
            if not isinstance(jobs_data, list):
                logger.error("Remotive API 'jobs' field is not a list")
                return FALLBACK_SOURCE, get_fallback_jobs(), True, "Invalid jobs format. Showing fallback demo jobs."

            if not jobs_data:
                logger.info("No jobs found on Remotive")
                return FALLBACK_SOURCE, get_fallback_jobs(), True, "No jobs found from external API. Showing fallback demo jobs."

            # Convert jobs, filtering out invalid ones
            jobs = []
            for raw_job in jobs_data:
                job = _convert_remotive_job(raw_job)
                if job:
                    jobs.append(job)

            if not jobs:
                logger.warning("All jobs from Remotive were invalid")
                return FALLBACK_SOURCE, get_fallback_jobs(), True, "No valid jobs from external API. Showing fallback demo jobs."

            logger.info(f"Found {len(jobs)} jobs from Remotive")
            return REMOTIVE_SOURCE, jobs[:max_results], False, "Jobs fetched successfully"

    except httpx.TimeoutException:
        logger.error("Remotive API timeout")
        return FALLBACK_SOURCE, get_fallback_jobs(), True, "External job API timed out. Showing fallback demo jobs."

    except httpx.HTTPStatusError as e:
        logger.error(f"Remotive API HTTP error: {e.response.status_code}")
        return FALLBACK_SOURCE, get_fallback_jobs(), True, f"External job API returned status {e.response.status_code}. Showing fallback demo jobs."

    except httpx.RequestError as e:
        logger.error(f"Remotive API request error: {e}")
        return FALLBACK_SOURCE, get_fallback_jobs(), True, "Network error connecting to job API. Showing fallback demo jobs."

    except Exception as e:
        logger.error(f"Remotive API unexpected error: {str(e)}")
        return FALLBACK_SOURCE, get_fallback_jobs(), True, "Unexpected error from job API. Showing fallback demo jobs."