"""Direct skills-based fit score calculation (no NLP/text needed)."""
from app.models.skills_fit_models import SkillsFitResponse


def calculate_skills_fit(user_skills: list[str], job_skills: list[str]) -> SkillsFitResponse:
    """
    Calculate fit score by comparing user skills directly against job required skills.

    Args:
        user_skills: List of skills from the user's CV or profile.
        job_skills: List of required skills from the job listing.

    Returns:
        SkillsFitResponse with fit score, matched/missing skills.
    """
    user_set = {s.strip().lower() for s in user_skills if s.strip()}
    job_set = {s.strip().lower() for s in job_skills if s.strip()}

    matched = user_set & job_set
    missing = job_set - user_set

    total = len(job_set)
    match_count = len(matched)
    # 100% when no skills required (nothing to match against)
    # 0% when no match found but there are requirements
    fit_score = 100.0 if total == 0 else round((match_count / total) * 100, 2)

    return SkillsFitResponse(
        fit_score=fit_score,
        matched_skills=sorted(matched),
        missing_skills=sorted(missing),
        match_count=match_count,
        total_required=total,
    )