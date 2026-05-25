"""Pydantic models for the cover letter generation endpoint."""
from pydantic import BaseModel, Field


class CoverLetterRequest(BaseModel):
    """Request body for cover letter generation."""

    cv_id: str = Field(..., min_length=1, description="ID of the uploaded CV")
    job_title: str = Field(..., min_length=1, description="Job title position")
    company: str = Field(..., min_length=1, description="Company name")
    job_description: str = Field(..., min_length=1, description="Job description with requirements")


class CoverLetterResponse(BaseModel):
    """Response for cover letter generation."""

    cover_letter: str
    cv_id: str
    job_title: str
    company: str
    used_context: str | None = None