import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job_models import JobSearchRequest, JobSearchResponse
from app.models.database_models import CVProfile
from app.services.job_search_service import fetch_live_jobs
from app.services.job_recommendation_service import (
    enrich_job_with_fit_score,
    sort_jobs_by_fit_score,
)
from app.services.user_context_service import require_anonymous_user_id

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_cv_skills(cv_id: str, anonymous_user_id: str, db: Session) -> list[str]:
    """Extract skills from a CV profile."""
    result = db.execute(
        select(CVProfile).where(
            CVProfile.cv_id == cv_id,
            CVProfile.anonymous_user_id == anonymous_user_id,
        )
    )
    cv_profile = result.scalar_one_or_none()

    if not cv_profile:
        logger.warning("CV not found or not owned by current user: %s", cv_id)
        return []

    skills: list[str] = []
    if cv_profile.processed_text_path:
        try:
            with open(cv_profile.processed_text_path, "r", encoding="utf-8") as f:
                cv_text = f.read()
                from app.services.job_skill_extraction_service import extract_skills

                skills = extract_skills(cv_text)
        except Exception as e:
            logger.error("Failed to read CV text: %s", e)

    return skills


@router.get("/search", response_model=JobSearchResponse)
async def search_jobs(
    cv_id: str,
    query: str = "software internship",
    location: str = "remote",
    limit: int = 10,
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Search for live jobs and calculate fit scores based on CV skills.
    
    Args:
        cv_id: Required. CV profile ID to match skills against.
        query: Job search query (default: "software internship")
        location: Location filter (default: "remote")
        limit: Max results (default: 10, max: 50)
    
    Returns:
        JobSearchResponse with live jobs, fit scores, and sorted by match.
        If cv_id is missing/invalid, returns empty jobs with requires_cv=true.
    """
    try:
        anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    except HTTPException:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": None,
            "requires_cv": True,
            "message": "Anonymous user ID is missing. Please refresh CareerPilot and try again.",
        }

    if not cv_id or cv_id.strip() == "":
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": None,
            "requires_cv": True,
            "message": "Please upload your CV first to get personalized job recommendations.",
        }

    cv_skills = await get_cv_skills(cv_id, anonymous_user_id, db)
    if not cv_skills:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": None,
            "requires_cv": True,
            "message": "This CV does not belong to the current CareerPilot profile.",
        }
    
    logger.info(f"Searching jobs: query='{query}', location='{location}', limit={limit}, cv_skills={cv_skills}")
    
    # Fetch live jobs
    source, jobs, error = await fetch_live_jobs(query, location, min(limit, 50))
    
    # If no live jobs available, return empty response
    if not jobs:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": source,
            "error": error or "No jobs found matching your criteria. Try a different search.",
            "requires_cv": False,
        }
    
    # Build response with fit scores
    enriched_jobs = []
    for job in jobs:
        enriched = enrich_job_with_fit_score(job, cv_skills)
        enriched_jobs.append(enriched)
    
    # Sort by fit score
    sorted_jobs = sort_jobs_by_fit_score(enriched_jobs)
    
    return {
        "jobs": sorted_jobs,
        "total": len(sorted_jobs),
        "is_live": error is None,
        "source": source,
        "error": error,
        "requires_cv": False,
    }
