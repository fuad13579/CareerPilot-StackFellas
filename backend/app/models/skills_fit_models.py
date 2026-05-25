"""Pydantic models for the direct skills fit score endpoint."""
from pydantic import BaseModel, Field


class SkillsFitRequest(BaseModel):
    """Request body for direct skills-based fit scoring."""

    user_skills: list[str] = Field(
        default=...,
        min_length=0,
        description="List of skills from the user's CV or profile",
    )
    job_skills: list[str] = Field(
        default=...,
        min_length=0,
        description="List of required skills from the job listing",
    )


class SkillsFitResponse(BaseModel):
    """Structured response for skills-based fit scoring."""

    fit_score: float = Field(..., ge=0, le=100, description="Overall fit percentage")
    matched_skills: list[str] = Field(
        ..., description="Skills present in both user and job"
    )
    missing_skills: list[str] = Field(
        ..., description="Skills required by job but missing from user profile"
    )
    match_count: int = Field(..., description="Number of matched skills")
    total_required: int = Field(..., description="Total number of required skills")