"""Cover letter generation routes."""
from fastapi import APIRouter, HTTPException, status

from app.models.cover_letter_models import CoverLetterRequest, CoverLetterResponse
from app.services.cover_letter_service import process_cover_letter_request


router = APIRouter()


@router.post("/generate", response_model=CoverLetterResponse)
def generate_cover_letter(request: CoverLetterRequest) -> CoverLetterResponse:
    """
    Generate a personalized cover letter using CV context and job details.

    Retrieves relevant CV sections via RAG and generates a tailored cover letter.
    """
    try:
        return process_cover_letter_request(
            cv_id=request.cv_id,
            job_title=request.job_title,
            company=request.company,
            job_description=request.job_description,
        )
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