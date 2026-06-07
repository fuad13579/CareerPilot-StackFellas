from pydantic import BaseModel, Field


class BuildRAGRequest(BaseModel):
    cv_id: str = Field(..., min_length=1)


class BuildRAGResponse(BaseModel):
    message: str
    cv_id: str
    total_chunks: int
    sections_indexed: list[str]


class RetrieveRAGRequest(BaseModel):
    cv_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=3, ge=1, le=10)


class RetrievedChunk(BaseModel):
    section: str
    text: str
    score: float


class RetrieveRAGResponse(BaseModel):
    cv_id: str
    query: str
    retrieved_chunks: list[RetrievedChunk]
    context: str


class RAGStatusResponse(BaseModel):
    cv_id: str
    index_exists: bool
    embeddings_exists: bool
    processed_sections_exists: bool
    chunk_count: int = 0
    sections_indexed: list[str] = Field(default_factory=list)
    embedding_provider: str | None = None
    embedding_model: str | None = None
    last_built_at: str | None = None
