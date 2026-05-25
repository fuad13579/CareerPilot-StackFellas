import logging
from typing import Any

import httpx

from app.models.job_models import JobCard
from app.services.job_skill_extraction_service import extract_skills_from_job
from app.utils.query_parser import parse_query


logger = logging.getLogger(__name__)

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
REMOTIVE_SOURCE = "Remotive"


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


def _convert_remotive_job(raw_job: dict[str, Any]) -> JobCard:
    """Convert a Remotive API job to our JobCard format."""
    job_id = raw_job.get("id") or raw_job.get("job_id") or str(hash(raw_job.get("url", "")))
    
    return JobCard(
        job_id=str(job_id),
        role=raw_job.get("title", "Unknown Role"),
        company=raw_job.get("company_name", "Unknown Company"),
        location=raw_job.get("candidate_required_location") or None,
        deadline=raw_job.get("application_deadline") or None,
        salary=_extract_salary(raw_job),
        required_skills=extract_skills_from_job(raw_job),
        description=_normalize_description(raw_job.get("description")),
        job_url=raw_job.get("url") or None,
        source=REMOTIVE_SOURCE,
    )


def _create_fallback_job(keyword: str) -> JobCard:
    """Create a demo fallback job when API fails."""
    return JobCard(
        job_id=f"fallback-{hash(keyword)}",
        role=f"{keyword.title()} Developer (Demo)",
        company="Sample Company Inc.",
        location="Remote",
        deadline=None,
        salary=None,
        required_skills=[keyword.title()],
        description=f"This is a demo job listing for {keyword}. The external API is currently unavailable.",
        job_url="https://remotive.com",
        source="Demo Fallback",
    )


async def search_jobs(query: str, max_results: int = 20) -> tuple[str, list[JobCard], bool]:
    """
    Search for jobs using Remotive API.
    
    Args:
        query: Natural language search query
        max_results: Maximum number of results to return
    
    Returns:
        Tuple of (source_name, list of JobCards, is_fallback)
    """
    # Parse the natural language query
    parsed = parse_query(query)
    search_term = parsed["raw_query"]
    
    logger.info(f"Searching Remotive for: {search_term}")
    
    # If no search term, return empty with fallback
    if not search_term:
        logger.warning("No search terms extracted from query")
        return REMOTIVE_SOURCE, [_create_fallback_job("general")], True
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params: dict[str, Any] = {"limit": max_results}
            if search_term:
                params["search"] = search_term
            
            response = await client.get(REMOTIVE_API_URL, params=params)
            response.raise_for_status()
            
            data = response.json()
            jobs_data = data.get("jobs", [])
            
            if not jobs_data:
                logger.info("No jobs found on Remotive")
                return REMOTIVE_SOURCE, [], False
            
            jobs = [_convert_remotive_job(raw) for raw in jobs_data]
            
            logger.info(f"Found {len(jobs)} jobs from Remotive")
            return REMOTIVE_SOURCE, jobs[:max_results], False
    
    except httpx.TimeoutException:
        logger.error("Remotive API timeout")
        return REMOTIVE_SOURCE, [_create_fallback_job(search_term.split()[0] if search_term else "developer")], True
    
    except httpx.HTTPStatusError as e:
        logger.error(f"Remotive API HTTP error: {e.response.status_code}")
        return REMOTIVE_SOURCE, [_create_fallback_job(search_term.split()[0] if search_term else "developer")], True
    
    except Exception as e:
        logger.error(f"Remotive API error: {str(e)}")
        return REMOTIVE_SOURCE, [_create_fallback_job(search_term.split()[0] if search_term else "developer")], True