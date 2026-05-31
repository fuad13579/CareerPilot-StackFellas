import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.models.job_models import JobSearchRequest, JobSearchResponse
from app.services.job_search_service import fetch_live_jobs
from app.services.job_recommendation_service import (
    enrich_job_with_fit_score,
    sort_jobs_by_fit_score,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_cv_skills(cv_id: str) -> list[str]:
    """Extract skills from a CV profile."""
    from app.models.database_models import CVProfile
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        result = db.execute(select(CVProfile).where(CVProfile.cv_id == cv_id))
        cv_profile = result.scalar_one_or_none()
        
        if not cv_profile:
            logger.warning(f"CV not found: {cv_id}")
            return []
        
        # Try to read processed CV text for skill extraction
        skills = []
        if cv_profile.processed_text_path:
            try:
                with open(cv_profile.processed_text_path, 'r', encoding='utf-8') as f:
                    cv_text = f.read()
                    # Extract skills from CV text
                    from app.services.job_skill_extraction_service import extract_skills
                    skills = extract_skills(cv_text)
            except Exception as e:
                logger.error(f"Failed to read CV text: {e}")
        
        return skills
    finally:
        db.close()


@router.get("/search", response_model=JobSearchResponse)
async def search_jobs(
    cv_id: str,
    query: str = "software internship",
    location: str = "remote",
    limit: int = 10,
    allow_demo: bool = False,
) -> dict[str, Any]:
    """
    Search for live jobs and calculate fit scores based on CV skills.
    
    Args:
        cv_id: Required. CV profile ID to match skills against.
        query: Job search query (default: "software internship")
        location: Location filter (default: "remote")
        limit: Max results (default: 10, max: 50)
        allow_demo: If True, returns demo jobs for testing (not live data)
    
    Returns:
        JobSearchResponse with live jobs, fit scores, and sorted by match.
    """
    # Validate cv_id
    if not cv_id:
        raise HTTPException(status_code=400, detail="cv_id is required")
    
    # Check if CV exists
    cv_skills = await get_cv_skills(cv_id)
    if not cv_skills:
        logger.info(f"No skills found for CV {cv_id}, using empty skill set")
    
    logger.info(f"Searching jobs: query='{query}', location='{location}', limit={limit}, cv_skills={cv_skills}")
    
    # Fetch live jobs
    source, jobs, error = await fetch_live_jobs(query, location, min(limit, 50))
    
    # If no live jobs and demo allowed, return demo data
    if not jobs and allow_demo:
        logger.info("allow_demo=True, returning demo jobs")
        return _get_demo_response(cv_skills)
    
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
        "is_live": len(jobs) > 0 and error is None,
        "source": source,
        "error": error,
    }


def _get_demo_response(cv_skills: list[str]) -> dict[str, Any]:
    """Generate demo jobs for testing when allow_demo=True."""
    from datetime import datetime
    
    demo_jobs = [
        {
            "job_id": "demo-backend-001",
            "role": "Junior Backend Developer",
            "company": "DemoTech Solutions",
            "location": "Remote",
            "deadline": None,
            "salary": "$80,000 - $100,000",
            "required_skills": ["Python", "FastAPI", "SQL", "REST API"],
            "description": "Join our team to build scalable backend services.",
            "job_url": "https://example.com/jobs/backend-dev",
            "source": "Demo",
            "is_live": False,
            "fetched_at": datetime.utcnow().isoformat(),
            "fit_score": 50.0,
            "matched_skills": cv_skills[:2] if cv_skills else [],
            "missing_skills": ["FastAPI", "REST API"],
            "reason": "Demo job - allow_demo was enabled",
        },
        {
            "job_id": "demo-frontend-001",
            "role": "Frontend Developer Intern",
            "company": "CareerDemo Labs",
            "location": "Remote",
            "deadline": None,
            "salary": "$50,000 - $70,000",
            "required_skills": ["React", "JavaScript", "HTML", "CSS"],
            "description": "Build modern user interfaces with React.",
            "job_url": "https://example.com/jobs/frontend-intern",
            "source": "Demo",
            "is_live": False,
            "fetched_at": datetime.utcnow().isoformat(),
            "fit_score": 25.0,
            "matched_skills": [],
            "missing_skills": ["React", "JavaScript", "HTML", "CSS"],
            "reason": "Demo job - allow_demo was enabled",
        },
    ]
    
    # Enrich demo jobs with fit scores
    for job in demo_jobs:
        from app.services.job_recommendation_service import calculate_fit_score
        from app.models.job_models import JobCard
        
        job_card = JobCard(
            job_id=job["job_id"],
            role=job["role"],
            company=job["company"],
            location=job["location"],
            deadline=job["deadline"],
            salary=job["salary"],
            required_skills=job["required_skills"],
            description=job["description"],
            job_url=job["job_url"],
            source=job["source"],
            is_live=False,
            fetched_at=datetime.utcnow(),
            fit_score=0.0,
            matched_skills=[],
            missing_skills=[],
            reason=None,
        )
        
        fit = calculate_fit_score(cv_skills, job_card)
        job["fit_score"] = fit.fit_score
        job["matched_skills"] = fit.matched_skills
        job["missing_skills"] = fit.missing_skills
        job["reason"] = f"Demo job matching {fit.match_count}/{fit.total_required} skills"
    
    sorted_jobs = sort_jobs_by_fit_score(demo_jobs)
    
    return {
        "jobs": sorted_jobs,
        "total": len(sorted_jobs),
        "is_live": False,
        "source": "Demo",
        "error": None,
    }