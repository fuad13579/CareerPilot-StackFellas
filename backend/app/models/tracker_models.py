"""Pydantic models for tracker endpoints."""
from pydantic import BaseModel, Field


class ApplicationCreate(BaseModel):
    """Request model for creating an application."""
    job_id: str = Field(..., description="External job ID")
    role: str = Field(..., description="Job title/role")
    company: str = Field(..., description="Company name")
    location: str | None = Field(None, description="Job location")
    status: str = Field(default="Applied", description="Application status: Applied, Interviewing, Offer, or Rejected")
    fit_score: float | None = Field(None, description="Fit score percentage")
    job_url: str | None = Field(None, description="URL to job posting")
    notes: str | None = Field(None, description="Additional notes")


class ApplicationResponse(BaseModel):
    """Response model for application."""
    id: int
    job_id: str
    role: str
    company: str
    location: str | None
    status: str
    fit_score: float | None
    job_url: str | None
    notes: str | None
    created_at: str
    updated_at: str


class StatusUpdate(BaseModel):
    """Request model for updating application status."""
    status: str = Field(..., description="New status value")