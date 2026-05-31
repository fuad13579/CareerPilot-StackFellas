"""Cover letter generation routes."""
from fastapi import APIRouter, Header, HTTPException, status

from app.models.cover_letter_models import CoverLetterRequest, CoverLetterResponse
from app.services.cover_letter_service import process_cover_letter_request
from app.services.user_context_service import require_anonymous_user_id


router = APIRouter()


@router.post("/generate", response_model=CoverLetterResponse)
def generate_cover_letter(
    request: CoverLetterRequest,
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> CoverLetterResponse:
    """
    Generate a personalized cover letter using CV context and job details.

    Retrieves relevant CV sections via RAG and generates a tailored cover letter.
    """
    try:
        anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
        from app.database import SessionLocal
        from app.services.user_context_service import require_cv_for_user

        db = SessionLocal()
        try:
            require_cv_for_user(db, request.cv_id, anonymous_user_id)
        finally:
            db.close()

        return process_cover_letter_request(
            cv_id=request.cv_id,
            job_title=request.job_title,
            company=request.company,
            job_description=request.job_description,
            location=request.location,
            required_skills=request.required_skills,
            job_url=request.job_url,
        )
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV not found. Please upload a CV first or build the RAG index. Error: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating cover letter: {exc}",
        ) from exc
