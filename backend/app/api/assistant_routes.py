"""AI Assistant routes with RAG context."""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.assistant_models import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant_service import process_assistant_query
from app.services.user_context_service import require_anonymous_user_id, require_cv_for_user


router = APIRouter()


@router.post("/query", response_model=AssistantQueryResponse)
def ask_assistant(
    request: AssistantQueryRequest,
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> AssistantQueryResponse:
    """
    Ask the AI assistant a career question using CV context.

    Uses RAG to retrieve relevant CV chunks and session memory to maintain
    conversation context across multiple queries.
    """
    try:
        anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
        require_cv_for_user(db, request.cv_id, anonymous_user_id)
        return process_assistant_query(
            cv_id=request.cv_id,
            session_id=request.session_id,
            question=request.question,
            anonymous_user_id=anonymous_user_id,
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
            detail=f"Error processing assistant query: {exc}",
        ) from exc
