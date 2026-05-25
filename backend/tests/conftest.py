"""Pytest configuration and fixtures for CareerPilot backend tests."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Provide a TestClient for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_query() -> str:
    """Sample job search query for testing."""
    return "Find remote Python backend jobs"
