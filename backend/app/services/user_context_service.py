"""Anonymous user helpers for request validation and persistence."""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database_models import CVProfile


USER_ID_HEADER_MESSAGE = "Anonymous user ID is missing. Please refresh CareerPilot and try again."
CV_OWNERSHIP_MESSAGE = "This CV does not belong to the current CareerPilot profile."


def require_anonymous_user_id(anonymous_user_id: str | None) -> str:
    """Validate that a request has an anonymous user ID."""
    if not anonymous_user_id or not anonymous_user_id.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_ID_HEADER_MESSAGE)
    return anonymous_user_id.strip()


def get_cv_profile_for_user(db: Session, cv_id: str, anonymous_user_id: str) -> CVProfile | None:
    """Return a CV profile only if it belongs to the current anonymous user."""
    result = db.execute(
        select(CVProfile).where(
            CVProfile.cv_id == cv_id,
            CVProfile.anonymous_user_id == anonymous_user_id,
        )
    )
    return result.scalar_one_or_none()


def require_cv_for_user(db: Session, cv_id: str, anonymous_user_id: str) -> CVProfile:
    """Ensure the CV exists and belongs to the current anonymous user."""
    profile = get_cv_profile_for_user(db, cv_id, anonymous_user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=CV_OWNERSHIP_MESSAGE,
        )
    return profile
