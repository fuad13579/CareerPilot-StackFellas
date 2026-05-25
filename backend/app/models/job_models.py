from pydantic import BaseModel, Field


class JobSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language job search query")


class JobCard(BaseModel):
    job_id: str = Field(..., description="External or generated job ID")
    role: str = Field(..., description="Job title/role")
    company: str = Field(..., description="Company name")
    location: str | None = Field(None, description="Job location")
    deadline: str | None = Field(None, description="Application deadline")
    salary: str | None = Field(None, description="Salary range or 'Not specified'")
    required_skills: list[str] = Field(default_factory=list, description="Extracted required skills")
    description: str = Field(..., description="Job description (truncated to ~500 chars)")
    job_url: str | None = Field(None, description="URL to job posting")
    source: str = Field(..., description="Source platform (e.g., Remotive)")


class JobSearchResponse(BaseModel):
    query: str = Field(..., description="Original search query")
    source: str = Field(..., description="Data source used")
    total_results: int = Field(..., description="Total number of jobs returned")
    jobs: list[JobCard] = Field(..., description="List of job cards")
    is_fallback: bool = Field(False, description="Whether fallback demo jobs were used")
    message: str | None = Field(None, description="Status message")