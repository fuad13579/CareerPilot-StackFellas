from fastapi import APIRouter, HTTPException, status

from app.models.fit_models import FitScoreRequest, FitScoreResponse
from app.services.cv_chunking_service import load_processed_cv_text
from app.services.fit_score import calculate_fit_score


router = APIRouter()


@router.post("/score", response_model=FitScoreResponse)
def score_cv_fit(request: FitScoreRequest) -> FitScoreResponse:
    try:
        cv_text = load_processed_cv_text(request.cv_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    result = calculate_fit_score(cv_text=cv_text, job_description=request.job_posting)

    return FitScoreResponse(cv_id=request.cv_id, **result)
