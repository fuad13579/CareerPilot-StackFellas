import os

from app.api import cv_routes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv


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


@app.get("/", response_model=RootResponse)
def read_root() -> RootResponse:
    return {"message": "CareerPilot Backend is running"}


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return {
        "status": "success",
        "message": "CareerPilot backend is healthy",
    }
