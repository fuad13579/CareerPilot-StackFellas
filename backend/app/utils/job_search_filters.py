"""Shared helpers for natural-language job search normalization and filtering."""

import re

from app.models.job_models import JobCard
from app.utils.query_parser import parse_query


def build_job_search_filters(question: str) -> tuple[str, str, dict]:
    """Normalize natural-language job search input into query, location, and parsed metadata."""
    parsed = parse_query(question)
    keywords = list(parsed.get("keywords", []))
    detected_location = parsed.get("location")
    salary_min = parsed.get("salary_min")

    if parsed.get("is_junior") and not any(term in keywords for term in ("junior", "jr", "entry")):
        keywords.insert(0, "junior")
    if parsed.get("is_mid") and "mid" not in keywords:
        keywords.insert(0, "mid")
    if parsed.get("is_senior") and not any(term in keywords for term in ("senior", "sr", "lead", "principal")):
        keywords.insert(0, "senior")
    if parsed.get("is_internship") and not any(term.startswith("intern") for term in keywords):
        keywords.append("internship")
    if salary_min:
        salary_tokens = {
            str(salary_min),
            str(salary_min // 1000),
            f"{salary_min // 1000}k",
        }
        keywords = [token for token in keywords if token not in salary_tokens]
    years_experience_min = parsed.get("years_experience_min")
    if years_experience_min:
        keywords = [
            token for token in keywords
            if token not in {str(years_experience_min), "years", "experience"}
        ]
        keywords.extend([str(years_experience_min), "years", "experience"])

    if detected_location and (parsed.get("is_hybrid") or parsed.get("is_onsite")):
        for token in detected_location.lower().split():
            if token not in keywords:
                keywords.append(token)

    normalized_query = " ".join(keywords).strip() or parsed.get("raw_query", "").strip() or question.strip()
    if parsed.get("is_remote"):
        location = "remote"
    elif parsed.get("is_hybrid"):
        location = "hybrid"
    elif parsed.get("is_onsite"):
        location = "onsite"
    else:
        location = detected_location or "remote"
    return normalized_query, location, parsed


def estimate_salary_floor(salary_text: str | None) -> int | None:
    """Best-effort parse of provider salary text into a minimum annual amount."""
    if not salary_text:
        return None

    normalized = salary_text.lower().replace(",", "").strip()
    if normalized in {"not listed", "competitive", "negotiable"}:
        return None

    matches = re.findall(r"\$?\s*(\d+(?:\.\d+)?)\s*([km]?)", normalized)
    values: list[int] = []
    for raw_value, suffix in matches:
        if not raw_value:
            continue
        amount = float(raw_value)
        if suffix == "k":
            amount *= 1000
        elif suffix == "m":
            amount *= 1_000_000
        elif amount < 1000:
            continue
        values.append(int(amount))

    return min(values) if values else None


def filter_jobs_by_salary(jobs: list[JobCard], salary_min: int | None) -> list[JobCard]:
    """Enforce a minimum salary against normalized job cards."""
    if not salary_min:
        return jobs

    filtered: list[JobCard] = []
    for job in jobs:
        parsed_floor = estimate_salary_floor(job.salary)
        if parsed_floor is not None and parsed_floor >= salary_min:
            filtered.append(job)
    return filtered
