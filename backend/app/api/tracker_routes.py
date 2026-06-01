"""Tracker routes for job application management."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Application
from app.models.tracker_models import ApplicationCreate, ApplicationResponse, StatusUpdate
from app.services.user_context_service import require_anonymous_user_id


router = APIRouter()


@router.post("/applications", response_model=ApplicationResponse)
def create_application(
    request: ApplicationCreate,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> ApplicationResponse:
    """Create a new job application tracker entry."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    db_app = Application(
        anonymous_user_id=anonymous_user_id,
        job_id=request.job_id,
        role=request.role,
        company=request.company,
        location=request.location,
        deadline=request.deadline,
        next_action=request.next_action,
        job_description=request.job_description,
        required_skills=json.dumps(request.required_skills or []),
        status=request.status,
        fit_score=request.fit_score,
        job_url=request.job_url,
        notes=request.notes,
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)

    return ApplicationResponse(
        id=db_app.id,
        job_id=db_app.job_id,
        role=db_app.role,
        company=db_app.company,
        location=db_app.location,
        deadline=db_app.deadline,
        next_action=db_app.next_action,
        job_description=db_app.job_description,
        required_skills=json.loads(db_app.required_skills) if db_app.required_skills else [],
        status=db_app.status,
        fit_score=db_app.fit_score,
        job_url=db_app.job_url,
        notes=db_app.notes,
        created_at=db_app.created_at.isoformat(),
        updated_at=db_app.updated_at.isoformat(),
    )


@router.get("/applications", response_model=list[ApplicationResponse])
def get_applications(
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> list[ApplicationResponse]:
    """Get all saved job applications."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    apps = (
        db.query(Application)
        .filter(Application.anonymous_user_id == anonymous_user_id)
        .order_by(Application.created_at.desc())
        .all()
    )

    return [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            role=app.role,
            company=app.company,
            location=app.location,
            deadline=app.deadline,
            next_action=app.next_action,
            job_description=app.job_description,
            required_skills=json.loads(app.required_skills) if app.required_skills else [],
            status=app.status,
            fit_score=app.fit_score,
            job_url=app.job_url,
            notes=app.notes,
            created_at=app.created_at.isoformat(),
            updated_at=app.updated_at.isoformat(),
        )
        for app in apps
    ]


@router.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    request: StatusUpdate,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> ApplicationResponse:
    """Update the status of an application."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.anonymous_user_id == anonymous_user_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = request.status
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)

    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        role=app.role,
        company=app.company,
        location=app.location,
        deadline=app.deadline,
        next_action=app.next_action,
        job_description=app.job_description,
        required_skills=json.loads(app.required_skills) if app.required_skills else [],
        status=app.status,
        fit_score=app.fit_score,
        job_url=app.job_url,
        notes=app.notes,
        created_at=app.created_at.isoformat(),
        updated_at=app.updated_at.isoformat(),
    )


@router.delete("/applications/{application_id}")
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> dict:
    """Delete an application."""
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.anonymous_user_id == anonymous_user_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(app)
    db.commit()
    return {"message": "Application deleted"}
