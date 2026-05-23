from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="CareerPilot Backend",
    description="Backend API for CareerPilot - AI Career Co-pilot",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "CareerPilot Backend is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "success",
        "message": "CareerPilot backend is healthy",
    }
