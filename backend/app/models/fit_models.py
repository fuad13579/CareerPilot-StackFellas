from pydantic import BaseModel, Field


class FitScoreRequest(BaseModel):
    cv_id: str = Field(..., min_length=1)
    job_posting: str = Field(..., min_length=1)


class FitScoreResponse(BaseModel):
    cv_id: str
    fit_score: float
    skill_score: float
    keyword_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    matched_keywords: list[str]
    explanation: str
