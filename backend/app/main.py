"""CareerPilot Backend - Main FastAPI Application."""
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api import assistant_routes, cover_letter_routes, cv_routes, fit_routes, job_routes, rag_routes, skills_fit_routes, tracker_routes, todo_routes, calendar_routes
from app.database import Base, engine
from app.models.database_models import CVProfile, Application, Todo, CalendarEvent, AssistantSession
from app.services.llm_provider import provider_status
from app.services.schema_migration_service import ensure_anonymous_user_columns

load_dotenv()


class RootResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    message: str


def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "*")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


cors_origins = get_cors_origins()
allow_credentials = cors_origins != ["*"]


app = FastAPI(
    title="CareerPilot Backend",
    description="Backend API for CareerPilot - AI Career Co-pilot",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv_routes.router, prefix="/api/cv", tags=["CV"])
app.include_router(fit_routes.router, prefix="/api/fit", tags=["Fit Score"])
app.include_router(job_routes.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(rag_routes.router, prefix="/api/rag", tags=["RAG"])
app.include_router(skills_fit_routes.router, prefix="/api/fit", tags=["Fit Score"])
app.include_router(assistant_routes.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(cover_letter_routes.router, prefix="/api/cover-letter", tags=["Cover Letter"])
app.include_router(tracker_routes.router, prefix="/api/tracker", tags=["Tracker"])
app.include_router(todo_routes.router, prefix="/api/todos", tags=["Todos"])
app.include_router(calendar_routes.router, prefix="/api/calendar", tags=["Calendar"])


@app.on_event("startup")
def on_startup():
    """Initialize database tables on startup."""
    Base.metadata.create_all(bind=engine)
    ensure_anonymous_user_columns(engine)


@app.get("/", response_model=RootResponse)
def read_root() -> RootResponse:
    return {"message": "CareerPilot Backend is running"}


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return {
        "status": "success",
        "message": "CareerPilot backend is healthy",
    }


@app.get("/api/health/providers")
def health_providers() -> dict:
    """Return the LLM provider chain status (no secrets leaked)."""
    return provider_status()
