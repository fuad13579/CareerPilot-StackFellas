import logging

from fastapi import APIRouter

from app.models.job_models import JobSearchRequest, JobSearchResponse
from app.services.job_search_service import search_jobs


logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs_endpoint(request: JobSearchRequest) -> JobSearchResponse:
    """
    Search for jobs using a natural language query.
    
    Accepts a natural language job search query and returns structured job results
    that can be used for fit score calculation.
    
    Args:
        request: JobSearchRequest with the natural language query
    
    Returns:
        JobSearchResponse with structured job cards
    """
    logger.info(f"Job search request: {request.query}")

    source, jobs, is_fallback, message = await search_jobs(request.query)

    # Log fallback status for debugging
    if is_fallback:
        logger.warning(f"Using fallback jobs: {message}")

    return JobSearchResponse(
        query=request.query,
        source=source,
        total_results=len(jobs),
        jobs=jobs,
        is_fallback=is_fallback,
        message=message,
    )