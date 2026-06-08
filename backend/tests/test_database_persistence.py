"""Tests for database persistence features."""
from pathlib import Path

from fastapi.testclient import TestClient

from app.database import DATABASE_PATH, SessionLocal
from app.main import app
from app.models.database_models import AssistantSession, CVProfile

client = TestClient(app)
TEST_USER_ID = "test-db-user"
TEST_HEADERS = {"x-careerpilot-user-id": TEST_USER_ID}
TEST_CV_ID = "test-cv-id"


def ensure_test_cv_profile() -> None:
    """Seed a CVProfile row that belongs to the test user for assistant tests."""
    db = SessionLocal()
    try:
        existing = (
            db.query(CVProfile)
            .filter(
                CVProfile.cv_id == TEST_CV_ID,
                CVProfile.anonymous_user_id == TEST_USER_ID,
            )
            .first()
        )
        if existing:
            return

        db.add(
            CVProfile(
                anonymous_user_id=TEST_USER_ID,
                cv_id=TEST_CV_ID,
                filename="test-cv.pdf",
                file_type="pdf",
                file_path="tests/fixtures/test-cv.pdf",
                processed_text_path="tests/fixtures/test-cv.txt",
            )
        )
        db.commit()
    finally:
        db.close()


class TestHealthEndpoint:
    """Test that the health endpoint still works."""

    def test_health_check_returns_200(self):
        """Test health endpoint returns 200 status."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_contains_success_status(self):
        """Test health response contains success/healthy status."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "success"


class TestApplicationTrackerPersistence:
    """Test job application tracker persistence."""

    def test_create_application_returns_200_or_201(self):
        """Test creating an application returns success status."""
        response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-001",
                "role": "Backend Developer",
                "company": "Test Company",
                "location": "Remote",
                "status": "Applied",
                "fit_score": 85,
                "job_url": "https://example.com/job",
                "notes": "Testing tracker database persistence",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)

    def test_get_applications_returns_200(self):
        """Test getting all applications returns 200 status."""
        response = client.get("/api/tracker/applications", headers=TEST_HEADERS)
        assert response.status_code == 200

    def test_created_application_in_response(self):
        """Test created application appears in GET response."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-002",
                "role": "Frontend Developer",
                "company": "Frontend Corp",
                "location": "New York",
                "status": "Saved",
                "fit_score": 70,
            },
            headers=TEST_HEADERS,
        )
        assert create_response.status_code in (200, 201)
        created_data = create_response.json()

        get_response = client.get("/api/tracker/applications", headers=TEST_HEADERS)
        assert get_response.status_code == 200
        applications = get_response.json()
        assert isinstance(applications, list)
        assert any(app["role"] == "Frontend Developer" for app in applications)
        assert any(app["company"] == "Frontend Corp" for app in applications)

    def test_application_role_and_company_match(self):
        """Test created application has correct role and company."""
        response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-003",
                "role": "Full Stack Engineer",
                "company": "Stack Company",
                "status": "Applied",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["role"] == "Full Stack Engineer"
        assert data["company"] == "Stack Company"

    def test_application_status_match(self):
        """Test created application has correct status."""
        response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-004",
                "role": "DevOps Engineer",
                "company": "Cloud Corp",
                "status": "Interviewing",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["status"] == "Interviewing"


class TestTrackerStatusUpdate:
    """Test application status update."""

    def test_update_status_returns_200(self):
        """Test updating application status returns 200."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-005",
                "role": "Data Scientist",
                "company": "Data Inc",
                "status": "Applied",
            },
            headers=TEST_HEADERS,
        )
        assert create_response.status_code in (200, 201)
        created = create_response.json()

        update_response = client.patch(
            f"/api/tracker/applications/{created['id']}/status",
            json={"status": "Interviewing"},
            headers=TEST_HEADERS,
        )
        assert update_response.status_code == 200

    def test_updated_status_is_interviewing(self):
        """Test updated status is the new value."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-006",
                "role": "ML Engineer",
                "company": "ML Corp",
                "status": "Applied",
            },
            headers=TEST_HEADERS,
        )
        assert create_response.status_code in (200, 201)
        created = create_response.json()

        update_response = client.patch(
            f"/api/tracker/applications/{created['id']}/status",
            json={"status": "Interviewing"},
            headers=TEST_HEADERS,
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["status"] == "Interviewing"

    def test_get_applications_confirms_updated_status(self):
        """Test GET confirms updated status."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-007",
                "role": "Backend Engineer",
                "company": "Backend Inc",
                "status": "Applied",
            },
            headers=TEST_HEADERS,
        )
        assert create_response.status_code in (200, 201)
        created = create_response.json()

        client.patch(
            f"/api/tracker/applications/{created['id']}/status",
            json={"status": "Rejected"},
            headers=TEST_HEADERS,
        )

        get_response = client.get("/api/tracker/applications", headers=TEST_HEADERS)
        applications = get_response.json()
        updated_app = next(
            (app for app in applications if app["id"] == created["id"]), None
        )
        assert updated_app is not None
        assert updated_app["status"] == "Rejected"


class TestTodoPersistence:
    """Test todo item persistence."""

    def test_create_todo_returns_200_or_201(self):
        """Test creating a todo returns success status."""
        response = client.post(
            "/api/todos",
            json={
                "title": "Apply to 3 backend jobs",
                "description": "Use CareerPilot job search results",
                "due_date": "2026-06-01",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)

    def test_get_todos_returns_200(self):
        """Test getting all todos returns 200 status."""
        response = client.get("/api/todos", headers=TEST_HEADERS)
        assert response.status_code == 200

    def test_created_todo_in_response(self):
        """Test created todo appears in GET response."""
        client.post(
            "/api/todos",
            json={
                "title": "Review job application",
                "description": "Follow up on Backend Engineer position",
            },
            headers=TEST_HEADERS,
        )

        response = client.get("/api/todos", headers=TEST_HEADERS)
        assert response.status_code == 200
        todos = response.json()
        assert isinstance(todos, list)
        assert any(todo["title"] == "Review job application" for todo in todos)

    def test_todo_title_matches(self):
        """Test created todo has correct title."""
        response = client.post(
            "/api/todos",
            json={
                "title": "Prepare for interview",
                "description": "Review algorithms and system design",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["title"] == "Prepare for interview"

    def test_todo_description_matches(self):
        """Test created todo has correct description."""
        response = client.post(
            "/api/todos",
            json={
                "title": "Update CV",
                "description": "Add recent project experience",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["description"] == "Add recent project experience"


class TestCalendarEventPersistence:
    """Test calendar event persistence."""

    def test_create_event_returns_200_or_201(self):
        """Test creating a calendar event returns success status."""
        response = client.post(
            "/api/calendar/events",
            json={
                "title": "Backend Developer application deadline",
                "description": "Submit application before deadline",
                "event_date": "2026-06-01",
                "related_application_id": None,
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)

    def test_get_events_returns_200(self):
        """Test getting all calendar events returns 200 status."""
        response = client.get("/api/calendar/events", headers=TEST_HEADERS)
        assert response.status_code == 200

    def test_created_event_in_response(self):
        """Test created event appears in GET response."""
        client.post(
            "/api/calendar/events",
            json={
                "title": "Technical interview",
                "description": "Coding assessment",
                "event_date": "2026-06-15",
            },
            headers=TEST_HEADERS,
        )

        response = client.get("/api/calendar/events", headers=TEST_HEADERS)
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list)
        assert any(event["title"] == "Technical interview" for event in events)

    def test_event_title_matches(self):
        """Test created calendar event has correct title."""
        response = client.post(
            "/api/calendar/events",
            json={
                "title": "HR screening call",
                "description": "Phone interview with recruiter",
                "event_date": "2026-06-20",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["title"] == "HR screening call"

    def test_event_date_matches(self):
        """Test created calendar event has correct date."""
        response = client.post(
            "/api/calendar/events",
            json={
                "title": "Onsite interview",
                "event_date": "2026-07-01",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["event_date"] == "2026-07-01"


class TestDatabaseFileExists:
    """Test that the database file is created."""

    def test_database_file_exists(self):
        """Test the SQLite database file exists after backend startup."""
        db_path = Path(DATABASE_PATH)
        assert db_path.exists()


class TestAssistantSessionPersistence:
    """Test assistant session persistence - verify messages are stored and reused."""

    def test_assistant_query_stores_message_in_database(self):
        """Test that assistant query stores a message row in the database."""
        session_id = "test-session-persistence-001"
        ensure_test_cv_profile()

        # Send first assistant query
        response = client.post(
            "/api/assistant/query",
            json={
                "cv_id": TEST_CV_ID,
                "session_id": session_id,
                "question": "What are my strongest skills?",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code == 200

        # Verify a message row was stored in the database
        db = SessionLocal()
        try:
            count = (
                db.query(AssistantSession)
                .filter(AssistantSession.session_id == session_id)
                .count()
            )
            assert count >= 1, f"Expected at least 1 message row, found {count}"
        finally:
            db.close()

    def test_assistant_query_stores_multiple_messages_for_same_session(self):
        """Test that multiple queries with same session_id store multiple rows."""
        session_id = "test-session-persistence-002"
        ensure_test_cv_profile()

        # Send first query
        response1 = client.post(
            "/api/assistant/query",
            json={
                "cv_id": TEST_CV_ID,
                "session_id": session_id,
                "question": "Tell me about my skills",
            },
            headers=TEST_HEADERS,
        )
        assert response1.status_code == 200

        # Send second query with same session_id
        response2 = client.post(
            "/api/assistant/query",
            json={
                "cv_id": TEST_CV_ID,
                "session_id": session_id,
                "question": "What about my experience?",
            },
            headers=TEST_HEADERS,
        )
        assert response2.status_code == 200

        # Verify multiple message rows exist in the database
        db = SessionLocal()
        try:
            messages = (
                db.query(AssistantSession)
                .filter(AssistantSession.session_id == session_id)
                .order_by(AssistantSession.created_at.asc())
                .all()
            )
            assert len(messages) >= 2, f"Expected at least 2 messages, found {len(messages)}"

            # Verify roles are stored correctly
            roles = [msg.role for msg in messages]
            assert "user" in roles, "Expected at least one user message"
            assert "assistant" in roles, "Expected at least one assistant message"
        finally:
            db.close()

    def test_assistant_query_stores_user_and_assistant_messages(self):
        """Test that both user and assistant messages are stored with correct roles."""
        session_id = "test-session-persistence-003"
        ensure_test_cv_profile()

        response = client.post(
            "/api/assistant/query",
            json={
                "cv_id": TEST_CV_ID,
                "session_id": session_id,
                "question": "What is my background?",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code == 200

        # Verify user and assistant messages exist
        db = SessionLocal()
        try:
            user_count = (
                db.query(AssistantSession)
                .filter(
                    AssistantSession.session_id == session_id,
                    AssistantSession.role == "user"
                )
                .count()
            )
            assistant_count = (
                db.query(AssistantSession)
                .filter(
                    AssistantSession.session_id == session_id,
                    AssistantSession.role == "assistant"
                )
                .count()
            )

            assert user_count >= 1, f"Expected at least 1 user message, found {user_count}"
            assert assistant_count >= 1, f"Expected at least 1 assistant message, found {assistant_count}"
        finally:
            db.close()

    def test_assistant_response_contains_answer(self):
        """Test assistant response contains an answer field."""
        ensure_test_cv_profile()
        response = client.post(
            "/api/assistant/query",
            json={
                "cv_id": TEST_CV_ID,
                "session_id": "test-session-db-2",
                "question": "Tell me about my experience",
            },
            headers=TEST_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
