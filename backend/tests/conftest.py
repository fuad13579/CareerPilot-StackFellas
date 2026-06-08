"""Pytest configuration and fixtures for CareerPilot backend tests."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine
from app.services.schema_migration_service import ensure_anonymous_user_columns


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create database tables before running tests."""
    Base.metadata.create_all(bind=engine)
    ensure_anonymous_user_columns(engine)
    yield
    # Keep database after tests for inspection


@pytest.fixture
def client() -> TestClient:
    """Provide a TestClient for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_query() -> str:
    """Sample job search query for testing."""
    return "Find remote Python backend jobs"
