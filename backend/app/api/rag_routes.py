from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rag_models import (
    BuildRAGRequest,
    BuildRAGResponse,
    RAGStatusResponse,
    RetrieveRAGRequest,
    RetrieveRAGResponse,
    RetrievedChunk,
)
from app.services.cv_chunking_service import (
    create_cv_chunks,
    get_processed_cv_sections_path,
    load_processed_cv_sections,
)
from app.services.user_context_service import require_anonymous_user_id, require_cv_for_user
from app.services.vector_store_service import (
    build_cv_rag_index,
    get_vector_embeddings_path,
    get_vector_store_path,
    retrieve_relevant_chunks,
)


router = APIRouter()


def _format_file_mtime(path_exists: bool, *paths) -> str | None:
    existing_paths = [path for path in paths if path.exists()]
    if not path_exists or not existing_paths:
        return None

    latest_mtime = max(path.stat().st_mtime for path in existing_paths)
    return datetime.fromtimestamp(latest_mtime, tz=timezone.utc).isoformat()


@router.post("/build", response_model=BuildRAGResponse)
def build_rag_index(request: BuildRAGRequest) -> BuildRAGResponse:
    try:
        sections = load_processed_cv_sections(request.cv_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    chunks = create_cv_chunks(request.cv_id, sections)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No CV content available to index",
        )

    build_cv_rag_index(request.cv_id, chunks)

    return BuildRAGResponse(
        message="RAG index built successfully",
        cv_id=request.cv_id,
        total_chunks=len(chunks),
        sections_indexed=sorted({chunk["section"] for chunk in chunks}),
    )


@router.post("/retrieve", response_model=RetrieveRAGResponse)
def retrieve_rag_context(request: RetrieveRAGRequest) -> RetrieveRAGResponse:
    try:
        retrieved_chunks = retrieve_relevant_chunks(
            cv_id=request.cv_id,
            query=request.query,
            top_k=request.top_k,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)
    response_chunks = [
        RetrievedChunk(
            section=chunk["section"],
            text=chunk["text"],
            score=chunk["score"],
        )
        for chunk in retrieved_chunks
    ]

    return RetrieveRAGResponse(
        cv_id=request.cv_id,
        query=request.query,
        retrieved_chunks=response_chunks,
        context=context,
    )


@router.get("/status", response_model=RAGStatusResponse)
def get_rag_status(
    cv_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> RAGStatusResponse:
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    require_cv_for_user(db, cv_id, anonymous_user_id)

    vector_store_path = get_vector_store_path(cv_id)
    embeddings_path = get_vector_embeddings_path(cv_id)
    processed_sections_path = get_processed_cv_sections_path(cv_id)

    index_exists = vector_store_path.exists()
    embeddings_exists = embeddings_path.exists()
    processed_sections_exists = processed_sections_path.exists()

    chunk_count = 0
    sections_indexed: list[str] = []
    embedding_provider: str | None = None
    embedding_model: str | None = None
    if index_exists:
        try:
            import json

            metadata = json.loads(vector_store_path.read_text(encoding="utf-8"))
            chunks = metadata.get("chunks", [])
            chunk_count = len(chunks)
            sections_indexed = sorted({chunk.get("section", "") for chunk in chunks if chunk.get("section")})
            embedding_provider = metadata.get("embedding_provider")
            embedding_model = metadata.get("embedding_model")
        except Exception:
            # Status endpoint should stay readable even if metadata is malformed.
            chunk_count = 0
            sections_indexed = []
            embedding_provider = None
            embedding_model = None

    return RAGStatusResponse(
        cv_id=cv_id,
        index_exists=index_exists,
        embeddings_exists=embeddings_exists,
        processed_sections_exists=processed_sections_exists,
        chunk_count=chunk_count,
        sections_indexed=sections_indexed,
        embedding_provider=embedding_provider,
        embedding_model=embedding_model,
        last_built_at=_format_file_mtime(index_exists, vector_store_path, embeddings_path),
    )
