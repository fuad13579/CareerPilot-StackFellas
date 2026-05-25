"""Calendar routes for event/deadline management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import CalendarEvent
from app.models.calendar_models import CalendarEventCreate, CalendarEventResponse


router = APIRouter()


@router.post("/events", response_model=CalendarEventResponse)
def create_event(request: CalendarEventCreate, db: Session = Depends(get_db)) -> CalendarEventResponse:
    """Create a new calendar event."""
    db_event = CalendarEvent(
        title=request.title,
        description=request.description,
        event_date=request.event_date,
        related_application_id=request.related_application_id,
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
        created_at=db_event.created_at.isoformat(),
    )


@router.get("/events", response_model=list[CalendarEventResponse])
def get_events(db: Session = Depends(get_db)) -> list[CalendarEventResponse]:
    """Get all calendar events."""
    events = db.query(CalendarEvent).order_by(CalendarEvent.event_date.asc()).all()

    return [
        CalendarEventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            event_date=event.event_date,
            related_application_id=event.related_application_id,
            created_at=event.created_at.isoformat(),
        )
        for event in events
    ]


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)) -> dict:
    """Delete a calendar event."""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}