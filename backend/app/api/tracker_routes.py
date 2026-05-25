"""Tracker routes for job application management."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Application
from app.models.tracker_models import ApplicationCreate, ApplicationResponse, StatusUpdate


router = APIRouter()


@router.post("/applications", response_model=ApplicationResponse)
def create_application(request: ApplicationCreate, db: Session = Depends(get_db)) -> ApplicationResponse:
    """Create a new job application tracker entry."""
    db_app = Application(
        job_id=request.job_id,
        role=request.role,
        company=request.company,
        location=request.location,
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
        status=db_app.status,
        fit_score=db_app.fit_score,
        job_url=db_app.job_url,
        notes=db_app.notes,
        created_at=db_app.created_at.isoformat(),
        updated_at=db_app.updated_at.isoformat(),
    )


@router.get("/applications", response_model=list[ApplicationResponse])
def get_applications(db: Session = Depends(get_db)) -> list[ApplicationResponse]:
    """Get all saved job applications."""
    apps = db.query(Application).order_by(Application.created_at.desc()).all()

    return [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            role=app.role,
            company=app.company,
            location=app.location,
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
def update_application_status(application_id: int, request: StatusUpdate, db: Session = Depends(get_db)) -> ApplicationResponse:
    """Update the status of an application."""
    app = db.query(Application).filter(Application.id == application_id).first()
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
        status=app.status,
        fit_score=app.fit_score,
        job_url=app.job_url,
        notes=app.notes,
        created_at=app.created_at.isoformat(),
        updated_at=app.updated_at.isoformat(),
    )


@router.delete("/applications/{application_id}")
def delete_application(application_id: int, db: Session = Depends(get_db)) -> dict:
    """Delete an application."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(app)
    db.commit()
    return {"message": "Application deleted"}