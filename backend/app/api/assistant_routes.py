"""AI Assistant routes with RAG context."""
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.assistant_models import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant_service import (
    get_conversation_history,
    process_assistant_query,
)
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
    print(f"[ASSISTANT DEBUG] Received request: cv_id={request.cv_id}, session_id={request.session_id}, user_id={x_careerpilot_user_id}")
    print(f"[ASSISTANT DEBUG] Question: '{request.question[:100]}...'")
    
    try:
        anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
        profile = require_cv_for_user(db, request.cv_id, anonymous_user_id)
        print(f"[ASSISTANT DEBUG] CV found in DB: cv_id={request.cv_id}, filename={profile.filename}")

        result = process_assistant_query(
            cv_id=request.cv_id,
            session_id=request.session_id,
            question=request.question,
            anonymous_user_id=anonymous_user_id,
            job_id=request.job_id,
        )
        print(f"[ASSISTANT DEBUG] Response: answer_length={len(result.answer)}, sources={len(result.sources)}")
        return result
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        print(f"[ASSISTANT DEBUG] CV not found: {exc}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found. Please upload a CV first or build the RAG index.",
        ) from exc
    except Exception as exc:
        # Log full error server-side, but never expose it (may include provider
        # errors, stack traces, or token hints) to the end user.
        print(f"[ASSISTANT DEBUG] Error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing assistant query. Please try again in a moment.",
        ) from exc


class AssistantHistoryMessage(BaseModel):
    """A single message in the assistant conversation history."""

    role: str
    content: str
    created_at: str | None = None


class AssistantHistoryResponse(BaseModel):
    """Response payload for the assistant history endpoint."""

    session_id: str
    messages: list[AssistantHistoryMessage]


@router.get("/history", response_model=AssistantHistoryResponse)
def get_assistant_history(
    user_id: str | None = Query(
        default=None,
        min_length=1,
        description="Anonymous user ID (mirrors the x-careerpilot-user-id header for easier browser debugging)",
    ),
    session_id: str = Query(..., min_length=1, description="Session ID to load"),
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> AssistantHistoryResponse:
    """Rehydrate an assistant conversation for a given session.

    The frontend calls this on mount so a refresh — or a new tab — does
    not wipe the user's chat. History is stored server-side per
    ``anonymous_user_id`` so we always scope the lookup to the calling
    user and never return another user's messages.

    The canonical auth signal is the ``x-careerpilot-user-id`` header,
    but a ``?user_id=`` query param is also accepted (and matches the
    public spec) so the route can be poked from a browser address bar.
    """
    # Header is authoritative; fall back to query param when callers prefer it.
    effective_user_id = x_careerpilot_user_id or user_id
    anonymous_user_id = require_anonymous_user_id(effective_user_id)

    try:
        history = get_conversation_history(
            session_id=session_id,
            anonymous_user_id=anonymous_user_id,
            db=db,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error loading assistant history. Please try again in a moment.",
        ) from exc

    return AssistantHistoryResponse(
        session_id=session_id,
        messages=[
            AssistantHistoryMessage(
                role=str(item.get("role", "assistant")),
                content=str(item.get("content", "")),
                created_at=item.get("created_at"),
            )
            for item in history
            if item.get("content")
        ],
    )
