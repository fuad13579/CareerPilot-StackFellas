"""Direct test of the job search service without HTTP server."""
import asyncio
import json

from app.services.job_search_service import search_jobs
from app.models.job_models import JobSearchResponse


async def test():
    query = "Find remote Python backend jobs"
    print(f"Testing with query: {query}")
    
    source, jobs, is_fallback = await search_jobs(query)
    
    response = JobSearchResponse(
        query=query,
        source=source,
        total_results=len(jobs),
        jobs=jobs
    )
    
    print(f"\nSource: {response.source}")
    print(f"Total results: {response.total_results}")
    print(f"Is fallback: {is_fallback}")
    print(f"\nJobs found:")
    
    for i, job in enumerate(response.jobs, 1):
        print(f"\n  [{i}] {job.role}")
        print(f"      Company: {job.company}")
        print(f"      Location: {job.location}")
        print(f"      Salary: {job.salary}")
        print(f"      Skills: {job.required_skills}")
        print(f"      URL: {job.job_url}")
    
    # Save response to file
    output = response.model_dump()
    with open("test_output.json", "w") as f:
        json.dump(output, f, indent=2)
    print("\nResponse saved to test_output.json")


if __name__ == "__main__":
    asyncio.run(test())