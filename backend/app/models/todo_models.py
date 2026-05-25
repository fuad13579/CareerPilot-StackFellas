"""Pydantic models for todo endpoints."""
from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    """Request model for creating a todo."""
    title: str = Field(..., min_length=1, description="Todo title")
    description: str | None = Field(None, description="Todo description")
    due_date: str | None = Field(None, description="Due date")


class TodoUpdate(BaseModel):
    """Request model for updating a todo."""
    title: str | None = Field(None, description="Todo title")
    description: str | None = Field(None, description="Todo description")
    is_completed: bool | None = Field(None, description="Completion status")
    due_date: str | None = Field(None, description="Due date")


class TodoResponse(BaseModel):
    """Response model for todo."""
    id: int
    title: str
    description: str | None
    is_completed: bool
    due_date: str | None
    created_at: str