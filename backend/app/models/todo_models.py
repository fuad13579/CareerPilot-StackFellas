"""Pydantic models for todo endpoints."""
from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    """Request model for creating a todo."""
    title: str = Field(..., min_length=1, description="Todo title")
    description: str | None = Field(None, description="Todo description")
    due_date: str | None = Field(None, description="Due date")
    linked_type: str | None = Field(None, description="Link type: 'goal' or 'application'")
    linked_id: int | None = Field(None, description="Linked item ID")


class TodoUpdate(BaseModel):
    """Request model for updating a todo."""
    title: str | None = Field(None, description="Todo title")
    description: str | None = Field(None, description="Todo description")
    is_completed: bool | None = Field(None, description="Completion status")
    due_date: str | None = Field(None, description="Due date")
    linked_type: str | None = Field(None, description="Link type: 'goal' or 'application'")
    linked_id: int | None = Field(None, description="Linked item ID")


class TodoResponse(BaseModel):
    """Response model for todo."""
    id: int
    title: str
    description: str | None
    is_completed: bool
    due_date: str | None
    linked_type: str | None
    linked_id: int | None
    created_at: str


class TodoStats(BaseModel):
    """Response model for todo statistics."""
    total: int
    completed: int
    remaining: int
    progress_percentage: float