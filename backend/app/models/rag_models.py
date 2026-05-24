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
