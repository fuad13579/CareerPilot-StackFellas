import re


# Common filler words to remove from queries
STOP_WORDS = {
    "find", "me", "jobs", "job", "search", "look", "looking",
    "for", "in", "with", "at", "on", "the", "a", "an",
    "open", "this", "month", "now", "today", "available",
    "any", "some", "all", "list", "get", "show", "display",
    "please", "can", "could", "would", "should", "need",
    "want", "need", "like", "around", "near", "close",
}


def parse_query(query: str) -> dict:
    """
    Parse a natural language job search query into structured filters.
    
    Returns:
        dict with keys:
            - keywords: list of main search terms
            - location: detected location (if any)
            - is_remote: bool
            - is_internship: bool
            - is_junior: bool
            - is_senior: bool
            - raw_query: cleaned search string for API
    """
    query_lower = query.lower().strip()
    
    # Detect remote keyword
    is_remote = "remote" in query_lower or "work from home" in query_lower
    
    # Detect seniority level
    is_senior = "senior" in query_lower or "sr" in query_lower or "lead" in query_lower or "principal" in query_lower
    is_junior = "junior" in query_lower or "jr" in query_lower or "entry" in query_lower or "entry-level" in query_lower
    is_internship = "intern" in query_lower or "internship" in query_lower
    
    # Common location words to detect
    location_words = {"dhaka", "bangladesh", "chicago", "new york", "london", "berlin", "singapore", "india"}
    detected_location = None
    for loc in location_words:
        if loc in query_lower:
            detected_location = loc.title()
            break
    
    # Remove filler words and extract keywords
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#.%-]*\b", query_lower)
    keywords = [
        word for word in words
        if word not in STOP_WORDS
        and len(word) > 2
        and word not in {"remote", "work", "from", "home"}
    ]
    
    # Clean up detected location from keywords
    if detected_location:
        detected_location_lower = detected_location.lower()
        keywords = [k for k in keywords if k != detected_location_lower]
    
    return {
        "keywords": keywords,
        "location": detected_location,
        "is_remote": is_remote,
        "is_internship": is_internship,
        "is_junior": is_junior,
        "is_senior": is_senior,
        "raw_query": " ".join(keywords) if keywords else query.strip(),
    }