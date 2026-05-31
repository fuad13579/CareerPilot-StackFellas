from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class JobSearchRequest(BaseModel):
    cv_id: str = Field(..., description="CV profile ID for skill matching")
    query: str = Field(default="software internship", description="Job search query")
    location: str = Field(default="remote", description="Job location filter")
    limit: int = Field(default=10, ge=1, le=50, description="Max results to return")


class JobSearchResponse(BaseModel):
    jobs: list["JobCard"] = Field(default_factory=list, description="List of job cards")
    total: int = Field(0, description="Total number of jobs returned")
    is_live: bool = Field(False, description="Whether data came from live source")
    source: Optional[str] = Field(None, description="Source platform")
    error: Optional[str] = Field(None, description="Error message if any")
    requires_cv: bool = Field(False, description="Whether a valid CV is required")
    message: Optional[str] = Field(None, description="Informational message to user")


class JobCard(BaseModel):
    job_id: str = Field(..., description="External or generated job ID")
    role: str = Field(..., description="Job title/role")
    company: str = Field(..., description="Company name")
    location: Optional[str] = Field(None, description="Job location")
    deadline: Optional[str] = Field(None, description="Application deadline")
    salary: Optional[str] = Field(None, description="Salary range or 'Not listed'")
    required_skills: list[str] = Field(default_factory=list, description="Extracted required skills")
    description: str = Field(default="", description="Job description (truncated to ~500 chars)")
    job_url: Optional[str] = Field(None, description="URL to job posting")
    source: str = Field(..., description="Source platform (e.g., Remotive)")
    is_live: bool = Field(True, description="Whether this is from live data")
    fetched_at: datetime = Field(default_factory=datetime.utcnow, description="When data was fetched")
    # Fit score fields
    fit_score: float = Field(..., description="Match percentage 0-100")
    matched_skills: list[str] = Field(default_factory=list, description="Skills matching CV")
    missing_skills: list[str] = Field(default_factory=list, description="Skills not in CV")
    reason: Optional[str] = Field(None, description="Explanation of fit score")


class FitScoreResponse(BaseModel):
    fit_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    match_count: int
    total_required: int