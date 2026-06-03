import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job_models import JobSearchResponse
from app.models.database_models import CVProfile
from app.services.job_search_service import fetch_live_jobs
from app.services.job_recommendation_service import (
    enrich_job_with_fit_score,
    sort_jobs_by_fit_score,
)
from app.services.job_cache_service import (
    build_cache_key,
    cache_metadata,
    get_fresh,
    get_stale,
    save_cache,
)
from app.services.user_context_service import require_anonymous_user_id

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_cv_skills(cv_id: str, anonymous_user_id: str, db: Session) -> list[str]:
    """Extract skills from a CV profile."""
    result = db.execute(
        select(CVProfile).where(
            CVProfile.cv_id == cv_id,
            CVProfile.anonymous_user_id == anonymous_user_id,
        )
    )
    cv_profile = result.scalar_one_or_none()

    if not cv_profile:
        logger.warning("CV not found or not owned by current user: %s", cv_id)
        return []

    skills: list[str] = []
    if cv_profile.processed_text_path:
        try:
            with open(cv_profile.processed_text_path, "r", encoding="utf-8") as f:
                cv_text = f.read()
                from app.services.job_skill_extraction_service import extract_skills

                skills = extract_skills(cv_text)
        except Exception as e:
            logger.error("Failed to read CV text: %s", e)

    return skills


def _empty_cache_metadata() -> dict[str, Any]:
    return {"cached": False, "fetched_at": None, "cache_expires_at": None}


async def resolve_live_jobs(
    db: Session,
    query: str,
    location: str,
    limit: int,
    force_refresh: bool,
) -> tuple[list[Any], str, str | None, dict[str, Any]]:
    """
    Cache-aware live job resolver.

    Rules (from the spec):
      * Cache only real, live-fetched jobs — never demo or static.
      * Default TTL is 15 minutes (configurable via env).
      * ``force_refresh=true`` always bypasses the cache.
      * If live APIs fail but a cached row exists (even if expired),
        return the stale row with a warning message.
      * If live APIs fail and no cache row exists, return an empty
        result so the caller can surface a clean error.

    Returns:
        (jobs, source, error_message, cache_metadata)
    """
    cache_key = build_cache_key(query, location, limit)

    # 1. Fresh hit? Serve immediately, no API calls.
    if not force_refresh:
        fresh = get_fresh(db, cache_key)
        if fresh is not None:
            jobs, source, fetched_at, expires_at = fresh
            logger.info("Job cache HIT (fresh) key=%s jobs=%d", cache_key, len(jobs))
            return jobs, source, None, cache_metadata(fetched_at, expires_at)

    # 2. Miss / expired / force-refresh — call the live APIs.
    source, jobs, error = await fetch_live_jobs(query, location, min(limit, 50))

    if jobs:
        # Only persist real, live-fetched results. Empty / failed
        # results are deliberately not cached so we don't poison the
        # next call.
        save_cache(db, cache_key, query, location, limit, source, jobs)
        return jobs, source, error, _empty_cache_metadata()

    # 3. Live APIs returned nothing. Try a stale cache as a safety net.
    stale = get_stale(db, cache_key)
    if stale is not None:
        jobs, source, fetched_at, expires_at = stale
        warning = (
            error
            or "Live job sources are temporarily unavailable. "
            "Showing recently cached results."
        )
        logger.warning(
            "Job cache STALE fallback key=%s jobs=%d reason=%s",
            cache_key, len(jobs), warning,
        )
        return jobs, source, warning, cache_metadata(fetched_at, expires_at)

    # 4. No cache, no live jobs — caller surfaces the error.
    return (
        [],
        source or "None",
        error or "No live job sources are currently available.",
        _empty_cache_metadata(),
    )


@router.get("/search", response_model=JobSearchResponse)
async def search_jobs(
    cv_id: Optional[str] = None,
    query: str = "software internship",
    location: str = "remote",
    limit: int = 10,
    force_refresh: bool = Query(
        default=False,
        description="Bypass the cache and re-call the live job APIs.",
    ),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Search for live jobs.

    cv_id is OPTIONAL here. When a valid CV is supplied, results are
    personalized and per-job fit scores are calculated. When cv_id is
    missing or empty, we still return live jobs (so the search bar is
    useful before the user uploads a CV) but fit scores are not
    calculated and ``personalized=False`` / ``fit_scores_enabled=False``
    are set on the response. The frontend must not display a fit score
    in that case.

    Results are served from a short-lived cache (default 15 min). The
    cache only ever contains real, live-fetched jobs. Pass
    ``force_refresh=true`` to skip the cache and re-call the live APIs.

    For CV-required personalized recommendations, use ``GET /recommend``
    instead.
    """
    try:
        anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    except HTTPException:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": None,
            "requires_cv": True,
            "message": "Anonymous user ID is missing. Please refresh CareerPilot and try again.",
            "personalized": False,
            "fit_scores_enabled": False,
            **_empty_cache_metadata(),
        }

    # cv_id is optional. If missing/empty we still return live jobs but
    # skip skill-based fit scoring — this makes the search bar useful
    # before the user uploads a CV.
    cv_skills: list[str] = []
    personalized = False
    if cv_id and cv_id.strip():
        cv_skills = await get_cv_skills(cv_id, anonymous_user_id, db)
        if not cv_skills:
            # CV ID was provided but doesn't belong to this user / has no skills
            return {
                "jobs": [],
                "total": 0,
                "is_live": False,
                "source": None,
                "error": None,
                "requires_cv": True,
                "message": "This CV does not belong to the current CareerPilot profile.",
                "personalized": False,
                "fit_scores_enabled": False,
                **_empty_cache_metadata(),
            }
        personalized = True

    logger.info(
        f"Searching jobs: query='{query}', location='{location}', limit={limit}, "
        f"has_cv={'yes' if cv_skills else 'no'}, force_refresh={force_refresh}"
    )

    # Cache-aware live fetch.
    jobs, source, error, cache_info = await resolve_live_jobs(
        db, query, location, limit, force_refresh
    )

    # If no jobs available, return empty response
    if not jobs:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": source,
            "error": error or "No jobs found matching your criteria. Try a different search.",
            "requires_cv": False,
            "message": (
                "Showing general live jobs. Upload a CV to get personalized fit scores."
                if not personalized
                else None
            ),
            "personalized": personalized,
            "fit_scores_enabled": personalized,
            **cache_info,
        }

    # Build response. Only enrich with fit scores when we actually have CV
    # skills — never fabricate a fit score. Jobs are returned in their
    # normalized form (fit_score=None) when there's no CV.
    if cv_skills:
        enriched_jobs = [
            enrich_job_with_fit_score(job, cv_skills) for job in jobs
        ]
        sorted_jobs = sort_jobs_by_fit_score(enriched_jobs)
    else:
        sorted_jobs = list(jobs)

    return {
        "jobs": sorted_jobs,
        "total": len(sorted_jobs),
        "is_live": error is None,
        "source": source,
        "error": error,
        "requires_cv": False,
        "message": (
            "Showing general live jobs. Upload a CV to get personalized fit scores."
            if not personalized
            else None
        ),
        "personalized": personalized,
        "fit_scores_enabled": personalized,
        **cache_info,
    }


@router.get("/recommend", response_model=JobSearchResponse)
async def recommend_jobs(
    cv_id: Optional[str] = None,
    query: str = "software internship",
    location: str = "remote",
    limit: int = 10,
    force_refresh: bool = Query(
        default=False,
        description="Bypass the cache and re-call the live job APIs.",
    ),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Personalized job recommendations based on a CV.

    This endpoint REQUIRES a valid cv_id. If cv_id is missing, empty,
    or does not belong to the current anonymous user, the response
    contains ``requires_cv=True`` and a clear error message — no jobs
    are returned and no fit scores are fabricated.

    On success, jobs are enriched with real fit scores and sorted by
    match (best first). The underlying live job results reuse the
    general short-lived cache (just like ``/search``), but the per-job
    fit scores are ALWAYS recomputed from the CV — they are never
    cached globally.
    """
    cv_id_clean = (cv_id or "").strip()

    if not cv_id_clean:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": "Please upload your CV first to get personalized job recommendations.",
            "requires_cv": True,
            "message": "Please upload your CV first to get personalized job recommendations.",
            "personalized": False,
            "fit_scores_enabled": False,
            **_empty_cache_metadata(),
        }

    try:
        anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)
    except HTTPException:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": "Anonymous user ID is missing. Please refresh CareerPilot and try again.",
            "requires_cv": True,
            "message": "Anonymous user ID is missing. Please refresh CareerPilot and try again.",
            "personalized": False,
            "fit_scores_enabled": False,
            **_empty_cache_metadata(),
        }

    cv_skills = await get_cv_skills(cv_id_clean, anonymous_user_id, db)
    if not cv_skills:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": None,
            "error": "This CV does not belong to the current CareerPilot profile.",
            "requires_cv": True,
            "message": "This CV does not belong to the current CareerPilot profile.",
            "personalized": False,
            "fit_scores_enabled": False,
            **_empty_cache_metadata(),
        }

    logger.info(
        f"Recommending jobs: query='{query}', location='{location}', "
        f"limit={limit}, cv_id={cv_id_clean}, force_refresh={force_refresh}"
    )

    # Reuse the same cache-aware live fetch as /search. The CV's fit
    # scores are recomputed below — the cache stores real jobs only.
    jobs, source, error, cache_info = await resolve_live_jobs(
        db, query, location, limit, force_refresh
    )

    if not jobs:
        return {
            "jobs": [],
            "total": 0,
            "is_live": False,
            "source": source,
            "error": error or "No jobs found matching your criteria. Try a different search.",
            "requires_cv": False,
            "message": None,
            "personalized": True,
            "fit_scores_enabled": True,
            **cache_info,
        }

    enriched_jobs = [enrich_job_with_fit_score(job, cv_skills) for job in jobs]
    sorted_jobs = sort_jobs_by_fit_score(enriched_jobs)

    return {
        "jobs": sorted_jobs,
        "total": len(sorted_jobs),
        "is_live": error is None,
        "source": source,
        "error": error,
        "requires_cv": False,
        "message": None,
        "personalized": True,
        "fit_scores_enabled": True,
        **cache_info,
    }
