"""SQLAlchemy database models for CareerPilot."""
from datetime import datetime

from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CVProfile(Base):
    """CV profile metadata storage."""
    __tablename__ = "cv_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anonymous_user_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    cv_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(50))
    file_path: Mapped[str] = mapped_column(String(500))
    processed_text_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Application(Base):
    """Job application tracker storage."""
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anonymous_user_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    job_id: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deadline: Mapped[str | None] = mapped_column(String(50), nullable=True)
    next_action: Mapped[str | None] = mapped_column(String(500), nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    required_skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Saved")
    status: Mapped[str] = mapped_column(String(50), default="Applied")
    fit_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    job_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Todo(Base):
    """To-do items storage."""
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anonymous_user_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CalendarEvent(Base):
    """Calendar/deadline events storage."""
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anonymous_user_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[str] = mapped_column(String(50))
    related_application_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("applications.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AssistantSession(Base):
    """AI assistant session messages storage."""
    __tablename__ = "assistant_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anonymous_user_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    cv_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50))  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
