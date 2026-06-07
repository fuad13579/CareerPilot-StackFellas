import re


# Common filler words to remove from queries
STOP_WORDS = {
    "find", "me", "jobs", "job", "search", "look", "looking",
    "for", "in", "with", "at", "on", "the", "a", "an",
    "open", "this", "month", "now", "today", "available",
    "any", "some", "all", "list", "get", "show", "display",
    "please", "can", "could", "would", "should", "need",
    "want", "need", "like", "around", "near", "close",
    "and", "least", "minimum", "salary",
    "roles", "role", "positions", "position", "openings", "opening",
    "hiring", "opportunities", "opportunity",
}
LOCATION_INTRO_WORDS = ("in", "at", "near", "around", "from")
LOCATION_BLOCKLIST = {
    "remote", "hybrid", "onsite", "on site", "on-site", "work from home",
    "today", "this month", "right now", "available now", "natural language",
}
KNOWN_LOCATION_PATTERNS = (
    "new york",
    "san francisco",
    "los angeles",
    "chicago",
    "austin",
    "seattle",
    "boston",
    "dhaka",
    "bangladesh",
    "london",
    "berlin",
    "singapore",
    "india",
    "toronto",
    "vancouver",
    "dublin",
)


def _extract_work_mode(query_lower: str) -> tuple[bool, bool, bool]:
    is_remote = "remote" in query_lower or "work from home" in query_lower or "wfh" in query_lower
    is_hybrid = "hybrid" in query_lower
    is_onsite = any(term in query_lower for term in ("on-site", "onsite", "on site", "in office"))
    return is_remote, is_hybrid, is_onsite


def _extract_location(query_lower: str) -> str | None:
    for location in KNOWN_LOCATION_PATTERNS:
        if location in query_lower:
            return location.title()

    for intro in LOCATION_INTRO_WORDS:
        match = re.search(rf"\b{intro}\s+([a-zA-Z]+(?:[\s-][a-zA-Z]+){{0,2}})", query_lower)
        if not match:
            continue
        candidate = match.group(1).strip(" .,!?")
        if candidate in LOCATION_BLOCKLIST:
            continue
        if any(candidate.startswith(word) for word in ("the ", "a ", "an ")):
            continue
        return " ".join(part.capitalize() for part in candidate.split())

    return None


def _extract_salary_min(query_lower: str) -> int | None:
    patterns = (
        r"(?:at least|minimum|min|above|over)\s+\$?(\d{2,3})(?:k)?\b",
        r"\$?(\d{2,3})k(?:\+)?\b",
        r"\$?(\d{5,6})\b",
    )
    for pattern in patterns:
        match = re.search(pattern, query_lower)
        if not match:
            continue
        value = int(match.group(1))
        return value * 1000 if value < 1000 else value
    return None


def _extract_years_experience(query_lower: str) -> int | None:
    match = re.search(r"\b(\d{1,2})\+?\s*(?:years?|yrs?)\b", query_lower)
    return int(match.group(1)) if match else None


def parse_query(query: str) -> dict:
    """
    Parse a natural language job search query into structured filters.
    
    Returns:
        dict with keys:
            - keywords: list of main search terms
            - location: detected location (if any)
            - is_remote: bool
            - is_hybrid: bool
            - is_onsite: bool
            - is_internship: bool
            - is_junior: bool
            - is_mid: bool
            - is_senior: bool
            - salary_min: int | None
            - years_experience_min: int | None
            - raw_query: cleaned search string for API
    """
    query_lower = query.lower().strip()

    is_remote, is_hybrid, is_onsite = _extract_work_mode(query_lower)

    # Detect seniority level
    is_senior = "senior" in query_lower or "sr" in query_lower or "lead" in query_lower or "principal" in query_lower
    is_junior = "junior" in query_lower or "jr" in query_lower or "entry" in query_lower or "entry-level" in query_lower
    is_mid = any(term in query_lower for term in ("mid", "mid-level", "mid level", "intermediate"))
    is_internship = "intern" in query_lower or "internship" in query_lower

    detected_location = _extract_location(query_lower)
    salary_min = _extract_salary_min(query_lower)
    years_experience_min = _extract_years_experience(query_lower)

    # Remove filler words and extract keywords
    words = re.findall(r"\b[a-zA-Z0-9][a-zA-Z0-9+#.%-]*\b", query_lower)
    location_tokens = set(detected_location.lower().split()) if detected_location else set()
    keywords = [
        word for word in words
        if word not in STOP_WORDS
        and len(word) > 2
        and word not in {"remote", "hybrid", "onsite", "work", "from", "home", "office"}
        and word not in location_tokens
    ]

    return {
        "keywords": keywords,
        "location": detected_location,
        "is_remote": is_remote,
        "is_hybrid": is_hybrid,
        "is_onsite": is_onsite,
        "is_internship": is_internship,
        "is_junior": is_junior,
        "is_mid": is_mid,
        "is_senior": is_senior,
        "salary_min": salary_min,
        "years_experience_min": years_experience_min,
        "raw_query": " ".join(keywords) if keywords else query.strip(),
    }
