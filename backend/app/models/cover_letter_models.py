"""Pydantic models for the cover letter generation endpoint."""
from pydantic import BaseModel, Field


class CoverLetterRequest(BaseModel):
    """Request body for cover letter generation."""

    cv_id: str = Field(..., min_length=1, description="ID of the uploaded CV")
    job_title: str = Field(..., min_length=1, description="Job title position")
    company: str = Field(..., min_length=1, description="Company name")
    job_description: str = Field(..., min_length=1, description="Job description with requirements")
    location: str | None = Field(None, description="Job location")
    required_skills: list[str] = Field(default_factory=list, description="Required skills for the job")
    job_url: str | None = Field(None, description="URL to the job posting")
    application_id: str | None = Field(None, description="Saved tracker application ID")
    next_action: str | None = Field(None, description="Next recommended action")


class CoverLetterResponse(BaseModel):
    """Response for cover letter generation."""

    cover_letter: str
    cv_id: str
    job_title: str
    company: str
    used_context: str | None = None
