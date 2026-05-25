"""API routes for direct skills-based fit scoring (no CV text needed)."""
import logging

from fastapi import APIRouter

from app.models.skills_fit_models import SkillsFitRequest, SkillsFitResponse
from app.services.skills_fit_service import calculate_skills_fit


logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/skills/score", response_model=SkillsFitResponse)
def score_skills_fit(request: SkillsFitRequest) -> SkillsFitResponse:
    """
    Calculate a fit score by directly comparing user skills against job required skills.

    Use this endpoint after extracting skills from a CV and a job listing independently.
    This does not require the CV to be stored in the system.

    Args:
        request: SkillsFitRequest with user_skills and job_skills lists

    Returns:
        SkillsFitResponse with fit_score, matched_skills, missing_skills
    """
    logger.info(
        f"Skills fit request: {len(request.user_skills)} user skills, "
        f"{len(request.job_skills)} job skills"
    )

    return calculate_skills_fit(
        user_skills=request.user_skills,
        job_skills=request.job_skills,
    )