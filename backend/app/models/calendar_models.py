"""Pydantic models for calendar endpoints."""
from pydantic import BaseModel, Field


class CalendarEventCreate(BaseModel):
    """Request model for creating a calendar event."""
    title: str = Field(..., min_length=1, description="Event title")
    description: str | None = Field(None, description="Event description")
    event_date: str = Field(..., description="Event date")
    related_application_id: int | None = Field(None, description="Related application ID")


class CalendarEventResponse(BaseModel):
    """Response model for calendar event."""
    id: int
    title: str
    description: str | None
    event_date: str
    related_application_id: int | None
    created_at: str