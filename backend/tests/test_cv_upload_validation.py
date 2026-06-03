"""Tests for CV upload validation and extraction rules."""
from pathlib import Path

import pytest

from app.services import cv_extraction_service as extraction_service


INVALID_CV_FILE_MESSAGE = "Please upload a valid CV file in PDF or DOCX format."
EMPTY_TEXT_MESSAGE = "Could not extract text from the uploaded CV."
NON_CV_MESSAGE = "This file does not look like a CV. Please upload a resume/CV."


@pytest.fixture
def bypass_cv_processing(monkeypatch):
    """Stub out downstream file/DB processing for upload validation tests."""
    monkeypatch.setattr(
        "app.api.cv_routes.save_processed_cv",
        lambda cv_id, extracted_text: {},
    )
    monkeypatch.setattr(
        "app.api.cv_routes.extract_skills",
        lambda extracted_text: {"python", "fastapi"},
    )
    monkeypatch.setattr(
        "app.services.cv_chunking_service.get_processed_cv_text_path",
        lambda cv_id: Path(f"{cv_id}.txt"),
    )


@pytest.mark.parametrize(
    "filename,mime_type",
    [
        ("resume.png", "image/png"),
        ("resume.jpg", "image/jpeg"),
        ("resume.txt", "text/plain"),
        ("resume.zip", "application/zip"),
        ("resume.exe", "application/octet-stream"),
    ],
)
def test_rejects_unsupported_file_types(client, filename, mime_type):
    response = client.post(
        "/api/cv/upload",
        files={"file": (filename, b"not a cv", mime_type)},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == INVALID_CV_FILE_MESSAGE


def test_rejects_mime_type_mismatch(client):
    response = client.post(
        "/api/cv/upload",
        files={"file": ("resume.pdf", b"not a pdf", "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == INVALID_CV_FILE_MESSAGE


def test_rejects_empty_pdf(client):
    response = client.post(
        "/api/cv/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == EMPTY_TEXT_MESSAGE


def test_rejects_non_cv_content(client, monkeypatch, bypass_cv_processing):
    def fake_extract_text(_file_path):
        extraction_service.validate_cv_likeness("hello world research portfolio")
        return "hello world research portfolio"

    monkeypatch.setattr("app.api.cv_routes.extract_text_from_cv", fake_extract_text)

    response = client.post(
        "/api/cv/upload",
        files={"file": ("portfolio.pdf", b"fake pdf bytes", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == NON_CV_MESSAGE


def test_accepts_valid_cv_pdf(client, monkeypatch, bypass_cv_processing):
    monkeypatch.setattr(
        "app.api.cv_routes.extract_text_from_cv",
        lambda file_path: (
            "Experience\n"
            "Software Engineer at Acme\n"
            "Education\n"
            "BSc Computer Science\n"
            "Skills\n"
            "Python, FastAPI, SQL\n"
            "Projects\n"
            "Built a job tracker"
        ),
    )

    response = client.post(
        "/api/cv/upload",
        files={"file": ("resume.pdf", b"fake pdf bytes", "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "resume.pdf"
    assert data["skills"]
    assert data["cv_id"]


def test_accepts_valid_cv_docx(client, monkeypatch, bypass_cv_processing):
    monkeypatch.setattr(
        "app.api.cv_routes.extract_text_from_cv",
        lambda file_path: (
            "Curriculum Vitae\n"
            "Experience\n"
            "Backend Developer at Example Co\n"
            "Skills\n"
            "Python, Docker\n"
            "Education\n"
            "BSc Software Engineering"
        ),
    )

    response = client.post(
        "/api/cv/upload",
        files={"file": ("resume.docx", b"fake docx bytes", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "resume.docx"
    assert data["skills"]


def test_rejects_oversized_file(client):
    oversized = b"a" * (5 * 1024 * 1024 + 1)
    response = client.post(
        "/api/cv/upload",
        files={"file": ("resume.pdf", oversized, "application/pdf")},
    )

    assert response.status_code == 413
    assert "5 MB" in response.json()["detail"]


def test_validate_cv_likeness_requires_two_keywords():
    with pytest.raises(ValueError, match=NON_CV_MESSAGE):
        extraction_service.validate_cv_likeness("python developer portfolio")


def test_validate_cv_likeness_accepts_cv_like_text():
    extraction_service.validate_cv_likeness(
        "Experience, Education, Skills, Projects, Certifications, Resume"
    )
