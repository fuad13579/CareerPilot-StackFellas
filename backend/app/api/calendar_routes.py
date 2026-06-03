"""Calendar routes for event/deadline management."""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import CalendarEvent
from app.models.calendar_models import CalendarEventCreate, CalendarEventResponse
from app.services.user_context_service import require_anonymous_user_id


router = APIRouter()


@router.post("/events", response_model=CalendarEventResponse)
def create_event(
    request: CalendarEventCreate,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> CalendarEventResponse:
    """Create a new calendar event."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    db_event = CalendarEvent(
        anonymous_user_id=anonymous_user_id,
        title=request.title,
        description=request.description,
        event_date=request.event_date,
        related_application_id=request.related_application_id,
        linked_type=request.linked_type,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return CalendarEventResponse(
        id=db_event.id,
        title=db_event.title,
        description=db_event.description,
        event_date=db_event.event_date,
        related_application_id=db_event.related_application_id,
        linked_type=db_event.linked_type,
        created_at=db_event.created_at.isoformat(),
    )


@router.get("/events", response_model=list[CalendarEventResponse])
def get_events(
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> list[CalendarEventResponse]:
    """Get all calendar events."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    events = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.anonymous_user_id == anonymous_user_id)
        .order_by(CalendarEvent.event_date.asc())
        .all()
    )

    return [
        CalendarEventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            event_date=event.event_date,
            related_application_id=event.related_application_id,
            linked_type=event.linked_type,
            created_at=event.created_at.isoformat(),
        )
        for event in events
    ]


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> dict:
    """Delete a calendar event."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.anonymous_user_id == anonymous_user_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}
