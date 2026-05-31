"""Job recommendation service - calculates fit scores based on CV skills."""
import logging
import re
from typing import Any

from app.models.job_models import FitScoreResponse, JobCard

logger = logging.getLogger(__name__)

# Skills to look for in job descriptions
SKILL_PATTERNS = {
    # Programming languages
    "python": ["python", "django", "flask", "fastapi"],
    "java": ["java", "spring", "maven", "gradle"],
    "javascript": ["javascript", "js", "node", "nodejs", "express"],
    "typescript": ["typescript", "ts"],
    "go": ["go", "golang"],
    "rust": ["rust"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "csharp"],
    "ruby": ["ruby", "rails"],
    "php": ["php", "laravel"],
    "swift": ["swift"],
    "kotlin": ["kotlin"],
    "scala": ["scala"],
    
    # Frontend frameworks
    "react": ["react", "reactjs", "react.js"],
    "vue": ["vue", "vuejs", "vue.js"],
    "angular": ["angular", "angularjs"],
    "next": ["nextjs", "next.js", "next"],
    
    # Backend frameworks
    "fastapi": ["fastapi"],
    "django": ["django"],
    "flask": ["flask"],
    "spring": ["spring", "springboot"],
    "rails": ["rails", "ruby on rails"],
    
    # Databases
    "sql": ["sql", "postgresql", "postgres", "mysql", "sqlite", "oracle"],
    "mongodb": ["mongodb", "mongo"],
    "redis": ["redis"],
    "elasticsearch": ["elasticsearch", "elastic"],
    
    # Cloud/DevOps
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "docker": ["docker", "container"],
    "kubernetes": ["kubernetes", "k8s", "k8"],
    "jenkins": ["jenkins", "cicd", "ci/cd"],
    
    # Data/ML
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "tensorflow": ["tensorflow", "tf"],
    "pytorch": ["pytorch"],
    "ml": ["machine learning", "ml", "deep learning"],
    "ai": ["ai", "artificial intelligence"],
    "nlp": ["nlp", "natural language processing"],
    
    # Web
    "html": ["html", "html5"],
    "css": ["css", "css3", "sass", "less"],
    "rest": ["rest", "restapi", "rest api", "restful"],
    "graphql": ["graphql"],
    "microservices": ["microservices", "microservice"],
    
    # Tools
    "git": ["git", "github", "gitlab"],
    "linux": ["linux", "unix"],
    "agile": ["agile", "scrum", "kanban"],
}


def normalize_skill(skill: str) -> str:
    """Normalize skill name for comparison."""
    return skill.lower().strip().replace("-", " ").replace("_", " ")


def normalize_skills(skills: list[str]) -> set[str]:
    """Normalize a list of skills."""
    return {normalize_skill(s) for s in skills if s}


def extract_skills_from_text(text: str) -> set[str]:
    """Extract known skills from raw text."""
    if not text:
        return set()
    
    text_lower = text.lower()
    found: set[str] = set()
    
    for skill, patterns in SKILL_PATTERNS.items():
        for pattern in patterns:
            if re.search(rf"\b{re.escape(pattern)}\b", text_lower):
                found.add(skill)
                break
    
    return found


def calculate_fit_score(cv_skills: list[str], job: JobCard) -> FitScoreResponse:
    """
    Calculate how well a CV matches a job posting.
    
    Compares CV skills against job required skills and job description.
    Returns a fit score from 0-100.
    """
    if not cv_skills:
        # No CV skills - can't match
        return FitScoreResponse(
            fit_score=0.0,
            matched_skills=[],
            missing_skills=job.required_skills or [],
            match_count=0,
            total_required=len(job.required_skills) if job.required_skills else 0,
        )
    
    # Normalize CV skills
    cv_normalized = normalize_skills(cv_skills)
    cv_display = {s.title() if len(s) <= 3 else s for s in cv_normalized}
    
    # Get skills from job description (supplement required_skills)
    desc_skills = extract_skills_from_text(job.description)
    
    # Combine required_skills with description skills
    job_skills: set[str] = set()
    
    # Add from required_skills field
    if job.required_skills:
        for skill in job.required_skills:
            job_skills.add(normalize_skill(skill))
            # Also check for variations
            norm = normalize_skill(skill)
            if norm in SKILL_PATTERNS:
                job_skills.add(norm)
    
    # Add from description patterns
    job_skills.update(desc_skills)
    
    if not job_skills:
        # No specific skills found - assume neutral match
        return FitScoreResponse(
            fit_score=50.0,
            matched_skills=[],
            missing_skills=[],
            match_count=0,
            total_required=0,
        )
    
    # Find matches
    matched: list[str] = []
    missing: list[str] = []
    
    for job_skill in job_skills:
        is_match = False
        matched_display = None
        
        # Check against each CV skill
        for cv_skill in cv_normalized:
            if cv_skill == job_skill or cv_skill in SKILL_PATTERNS.get(job_skill, []):
                is_match = True
                # Use display name
                matched_display = job_skill.title()
                break
            # Partial match check
            if job_skill in cv_skill or cv_skill in job_skill:
                is_match = True
                matched_display = job_skill.title()
                break
        
        if is_match and matched_display:
            matched.append(matched_display)
        else:
            missing.append(job_skill.title())
    
    # Calculate score
    total_required = len(job_skills)
    match_count = len(matched)
    
    if total_required > 0:
        fit_score = round((match_count / total_required) * 100, 1)
    else:
        fit_score = 50.0  # Neutral if no skills required
    
    return FitScoreResponse(
        fit_score=fit_score,
        matched_skills=matched,
        missing_skills=missing,
        match_count=match_count,
        total_required=total_required,
    )


def enrich_job_with_fit_score(job: JobCard, cv_skills: list[str]) -> dict[str, Any]:
    """
    Create an enriched job dict with fit score information.
    
    Returns a dict suitable for JSON serialization.
    """
    fit = calculate_fit_score(cv_skills, job)
    
    # Generate reason text
    if fit.match_count == 0:
        reason = "No matching skills found between your CV and this job's requirements."
    elif fit.fit_score >= 80:
        reason = f"Great match! You have {fit.match_count} of {fit.total_required} required skills."
    elif fit.fit_score >= 50:
        reason = f"Good match with {fit.match_count}/{fit.total_required} skills. Consider learning: {', '.join(fit.missing_skills[:3])}"
    else:
        reason = f"You match {fit.match_count}/{fit.total_required} skills. Missing: {', '.join(fit.missing_skills[:3])}"
    
    return {
        "job_id": job.job_id,
        "role": job.role,
        "company": job.company,
        "location": job.location,
        "deadline": job.deadline,
        "salary": job.salary or "Not listed",
        "required_skills": job.required_skills,
        "description": job.description[:500] if job.description else "",
        "job_url": job.job_url,
        "source": job.source,
        "is_live": job.is_live,
        "fetched_at": job.fetched_at.isoformat() if hasattr(job.fetched_at, 'isoformat') else str(job.fetched_at),
        "fit_score": fit.fit_score,
        "matched_skills": fit.matched_skills,
        "missing_skills": fit.missing_skills,
        "reason": reason,
    }


def sort_jobs_by_fit_score(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort jobs by fit_score descending."""
    return sorted(jobs, key=lambda j: j.get("fit_score", 0), reverse=True)