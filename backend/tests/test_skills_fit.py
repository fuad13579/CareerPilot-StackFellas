"""Tests for /api/fit/skills/score endpoint."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_skills_fit_full_match(client):
    """Test with all skills matching."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["Python", "FastAPI", "Docker"],
            "job_skills": ["Python", "FastAPI", "Docker"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fit_score"] == 100.0
    assert data["match_count"] == 3
    assert data["total_required"] == 3


def test_skills_fit_partial_match(client):
    """Test with partial skill match."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["Python", "FastAPI"],
            "job_skills": ["Python", "FastAPI", "Docker", "AWS"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fit_score"] == 50.0
    assert data["match_count"] == 2
    assert data["total_required"] == 4
    # Case-insensitive comparison
    assert "docker" in data["missing_skills"]
    assert "aws" in data["missing_skills"]


def test_skills_fit_no_match(client):
    """Test with no skills matching."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["Python", "JavaScript"],
            "job_skills": ["Rust", "Go", "Kubernetes"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fit_score"] == 0.0
    assert data["match_count"] == 0
    assert data["total_required"] == 3


def test_skills_fit_empty_user_skills(client):
    """Test with empty user skills array."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": [],
            "job_skills": ["Python", "FastAPI"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fit_score"] == 0.0
    assert data["match_count"] == 0


def test_skills_fit_empty_job_skills(client):
    """Test with empty job skills array (edge case)."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["Python"],
            "job_skills": []
        }
    )
    assert response.status_code == 200
    data = response.json()
    # When no skills required, fit should be 100% (nothing missing)
    assert data["fit_score"] == 100.0
    assert data["total_required"] == 0


def test_skills_fit_user_has_more_skills(client):
    """Test when user has more skills than required."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["Python", "FastAPI", "Docker", "AWS", "PostgreSQL"],
            "job_skills": ["Python", "FastAPI"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fit_score"] == 100.0
    assert data["match_count"] == 2
    assert data["total_required"] == 2


def test_skills_fit_case_insensitive(client):
    """Test that matching is case-insensitive."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["python", "FASTAPI", "docker"],
            "job_skills": ["Python", "fastapi", "DOCKER"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    # All should match case-insensitively
    assert data["fit_score"] == 100.0
    assert data["match_count"] == 3


def test_skills_fit_invalid_request_missing_fields(client):
    """Test validation error when required fields missing."""
    response = client.post(
        "/api/fit/skills/score",
        json={"user_skills": ["Python"]}
    )
    assert response.status_code == 422  # Validation error


def test_skills_fit_invalid_request_empty_body(client):
    """Test validation error when body is empty."""
    response = client.post(
        "/api/fit/skills/score",
        json={}
    )
    assert response.status_code == 422


def test_skills_fit_response_structure(client):
    """Test response has all expected fields."""
    response = client.post(
        "/api/fit/skills/score",
        json={
            "user_skills": ["Python"],
            "job_skills": ["Python", "FastAPI"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "fit_score" in data
    assert "match_count" in data
    assert "total_required" in data
    assert "matched_skills" in data
    assert "missing_skills" in data
