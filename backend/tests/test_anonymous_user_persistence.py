"""Tests for anonymous user ownership across CareerPilot resources."""
from pathlib import Path


def test_cv_upload_requires_anonymous_user_id(client):
    response = client.post(
        "/api/cv/upload",
        files={"file": ("resume.pdf", b"fake pdf bytes", "application/pdf")},
    )

    assert response.status_code == 400
    assert "Anonymous user ID is missing" in response.json()["detail"]


def test_cv_upload_persists_anonymous_user_id(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.cv_routes.extract_text_from_cv",
        lambda file_path: (
            "Experience\nSoftware Engineer at Example Co\n"
            "Education\nBSc Computer Science\n"
            "Skills\nPython, FastAPI\n"
            "Projects\nJob tracker"
        ),
    )
    monkeypatch.setattr(
        "app.api.cv_routes.extract_skills",
        lambda extracted_text: {"python", "fastapi"},
    )
    monkeypatch.setattr(
        "app.api.cv_routes.save_processed_cv",
        lambda cv_id, extracted_text: {},
    )
    monkeypatch.setattr(
        "app.services.cv_chunking_service.get_processed_cv_text_path",
        lambda cv_id: Path(f"{cv_id}.txt"),
    )

    response = client.post(
        "/api/cv/upload",
        headers={"x-careerpilot-user-id": "user-a"},
        files={"file": ("resume.pdf", b"fake pdf bytes", "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["cv_id"]

    from app.database import SessionLocal
    from app.models.database_models import CVProfile

    db = SessionLocal()
    try:
        profile = db.query(CVProfile).filter(CVProfile.cv_id == data["cv_id"]).first()
        assert profile is not None
        assert profile.anonymous_user_id == "user-a"
    finally:
        db.close()


def test_jobs_search_rejects_foreign_cv(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.cv_routes.extract_text_from_cv",
        lambda file_path: (
            "Experience\nSoftware Engineer at Example Co\n"
            "Education\nBSc Computer Science\n"
            "Skills\nPython, FastAPI\n"
            "Projects\nJob tracker"
        ),
    )
    monkeypatch.setattr(
        "app.api.cv_routes.extract_skills",
        lambda extracted_text: {"python", "fastapi"},
    )
    monkeypatch.setattr(
        "app.api.cv_routes.save_processed_cv",
        lambda cv_id, extracted_text: {},
    )
    monkeypatch.setattr(
        "app.services.cv_chunking_service.get_processed_cv_text_path",
        lambda cv_id: Path(f"{cv_id}.txt"),
    )

    upload_response = client.post(
        "/api/cv/upload",
        headers={"x-careerpilot-user-id": "user-a"},
        files={"file": ("resume.pdf", b"fake pdf bytes", "application/pdf")},
    )
    assert upload_response.status_code == 200
    cv_id = upload_response.json()["cv_id"]

    search_response = client.get(
        f"/api/jobs/search?cv_id={cv_id}",
        headers={"x-careerpilot-user-id": "user-b"},
    )

    assert search_response.status_code == 200
    data = search_response.json()
    assert data["requires_cv"] is True
    assert "current CareerPilot profile" in data["message"]
