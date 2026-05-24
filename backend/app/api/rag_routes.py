from fastapi import APIRouter, HTTPException, status

from app.models.rag_models import (
    BuildRAGRequest,
    BuildRAGResponse,
    RetrieveRAGRequest,
    RetrieveRAGResponse,
    RetrievedChunk,
)
from app.services.cv_chunking_service import create_cv_chunks, load_processed_cv_sections
from app.services.vector_store_service import build_cv_rag_index, retrieve_relevant_chunks


router = APIRouter()


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
