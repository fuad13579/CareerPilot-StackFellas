"""Lightweight schema migration helpers for SQLite."""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


TABLE_COLUMNS = [
    ("cv_profiles", "anonymous_user_id", "VARCHAR(64)"),
    ("applications", "anonymous_user_id", "VARCHAR(64)"),
    ("applications", "deadline", "VARCHAR(50)"),
    ("applications", "next_action", "VARCHAR(500)"),
    ("applications", "job_description", "TEXT"),
    ("applications", "required_skills", "TEXT"),
    ("todos", "anonymous_user_id", "VARCHAR(64)"),
    ("todos", "linked_type", "VARCHAR(50)"),
    ("todos", "linked_id", "INTEGER"),
    ("calendar_events", "anonymous_user_id", "VARCHAR(64)"),
    ("calendar_events", "linked_type", "VARCHAR(50)"),
    ("assistant_sessions", "anonymous_user_id", "VARCHAR(64)"),
]


def ensure_anonymous_user_columns(engine: Engine) -> None:
    """Add missing ownership columns when an older database is detected."""
    with engine.begin() as connection:
        for table_name, column_name, column_type in TABLE_COLUMNS:
            inspector = inspect(connection)
            if table_name not in inspector.get_table_names():
                continue

            columns = {column["name"] for column in inspector.get_columns(table_name)}
            if column_name in columns:
                continue

            connection.execute(
                text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
            )
