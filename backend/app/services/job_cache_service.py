"""
Short-lived TTL cache for live job search results.

Only real, live-fetched jobs are ever written here. The cache key
combines ``(query, location, limit)`` — provider/source is part of the
*value*, not the key, so a row with "Adzuna+Arbeitnow" and a row with
"Adzuna" are interchangeable as long as the jobs they returned are the
same logical set.

Default TTL is 15 minutes (hackathon-friendly: long enough to make
repeated searches cheap, short enough that demo judges see "live"
results). Configurable via the ``JOB_CACHE_TTL_SECONDS`` env var.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database_models import JobSearchCache
from app.models.job_models import JobCard

logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = 15 * 60  # 15 minutes


def _ttl_seconds() -> int:
    """Read TTL from env, falling back to 15 minutes."""
    raw = os.getenv("JOB_CACHE_TTL_SECONDS", str(DEFAULT_TTL_SECONDS)).strip()
    try:
        return max(1, int(raw))
    except ValueError:
        logger.warning("Invalid JOB_CACHE_TTL_SECONDS=%r, using default", raw)
        return DEFAULT_TTL_SECONDS


def build_cache_key(query: str, location: str, limit: int) -> str:
    """
    Deterministic cache key from the inputs that actually change the
    result set. We normalize case + whitespace so a search bar that
    capitalizes the query still hits the same row.
    """
    q = (query or "").strip().lower()
    loc = (location or "").strip().lower()
    digest = hashlib.sha1(f"{q}|{loc}|{int(limit)}".encode("utf-8")).hexdigest()
    return f"jobs:{digest}"


def _serialize_jobs(jobs: list[JobCard]) -> str:
    """Serialize a list of JobCard to a JSON blob for storage."""
    return json.dumps([job.model_dump(mode="json") for job in jobs], ensure_ascii=False)


def _deserialize_jobs(blob: str) -> list[JobCard]:
    """Inverse of _serialize_jobs. Returns [] on any parse error."""
    if not blob:
        return []
    try:
        raw = json.loads(blob)
    except json.JSONDecodeError as e:
        logger.error("Cached jobs JSON failed to parse: %s", e)
        return []
    if not isinstance(raw, list):
        logger.error("Cached jobs JSON is not a list: %r", type(raw))
        return []
    out: list[JobCard] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            out.append(JobCard.model_validate(item))
        except Exception as e:
            logger.warning("Dropping invalid cached job: %s", e)
    return out


def get_fresh(db: Session, cache_key: str) -> tuple[list[JobCard], str, datetime, datetime] | None:
    """
    Return the cached row if it exists AND is still inside its TTL.
    Returns None on miss or expiry. Tuple shape:
        (jobs, source, fetched_at, expires_at)
    """
    row = db.execute(
        select(JobSearchCache).where(JobSearchCache.cache_key == cache_key)
    ).scalar_one_or_none()
    if not row:
        return None
    now = datetime.utcnow()
    if row.expires_at <= now:
        return None
    return _deserialize_jobs(row.jobs_json), row.source, row.fetched_at, row.expires_at


def get_stale(db: Session, cache_key: str) -> tuple[list[JobCard], str, datetime, datetime] | None:
    """
    Return the cached row regardless of TTL. Used as a fallback when
    the live APIs fail so the user still sees something useful.
    """
    row = db.execute(
        select(JobSearchCache).where(JobSearchCache.cache_key == cache_key)
    ).scalar_one_or_none()
    if not row:
        return None
    return _deserialize_jobs(row.jobs_json), row.source, row.fetched_at, row.expires_at


def save_cache(
    db: Session,
    cache_key: str,
    query: str,
    location: str,
    limit: int,
    source: str,
    jobs: list[JobCard],
    ttl_seconds: int | None = None,
) -> None:
    """
    Upsert a cache row. We replace the blob in-place rather than
    appending so a stale payload never lingers.
    """
    if not jobs:
        # Never cache empty results — we'd just return the same empty
        # page on the next call, which is misleading.
        return

    ttl = ttl_seconds if ttl_seconds is not None else _ttl_seconds()
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=ttl)
    blob = _serialize_jobs(jobs)

    existing = db.execute(
        select(JobSearchCache).where(JobSearchCache.cache_key == cache_key)
    ).scalar_one_or_none()

    if existing:
        existing.query = query
        existing.location = location
        existing.limit = limit
        existing.source = source
        existing.jobs_json = blob
        existing.fetched_at = now
        existing.expires_at = expires_at
    else:
        db.add(
            JobSearchCache(
                cache_key=cache_key,
                query=query,
                location=location,
                limit=limit,
                source=source,
                jobs_json=blob,
                fetched_at=now,
                expires_at=expires_at,
            )
        )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("Failed to persist job cache row: %s", e)


def cache_metadata(
    fetched_at: datetime, expires_at: datetime
) -> dict[str, Any]:
    """Return the public response fields describing this cache entry."""
    return {
        "cached": True,
        "fetched_at": fetched_at.isoformat() if fetched_at else None,
        "cache_expires_at": expires_at.isoformat() if expires_at else None,
    }
