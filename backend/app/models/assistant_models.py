"""Pydantic models for the AI assistant endpoint."""
from pydantic import BaseModel, Field


class AssistantQueryRequest(BaseModel):
    """Request body for AI assistant queries."""

    cv_id: str = Field(..., min_length=1, description="ID of the uploaded CV")
    session_id: str = Field(..., min_length=1, description="Session ID for conversation memory")
    question: str = Field(..., min_length=1, description="User's career question")


class AssistantSource(BaseModel):
    """Source chunk from CV context."""

    section: str
    text: str
    score: float | None = None


class AssistantQueryResponse(BaseModel):
    """Response from AI assistant."""

    session_id: str
    answer: str
    retrieved_context: str
    sources: list[AssistantSource]