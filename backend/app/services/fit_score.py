import functools
import os
import re
from collections.abc import Iterable


DEFAULT_SKILL_WEIGHT = 0.75
DEFAULT_KEYWORD_WEIGHT = 0.25
DEFAULT_COMMON_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "nextjs",
    "fastapi",
    "django",
    "flask",
    "nodejs",
    "express",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "docker",
    "git",
    "github",
    "machine learning",
    "deep learning",
    "nlp",
    "pandas",
    "numpy",
    "scikit-learn",
    "aws",
    "azure",
    "linux",
    "html",
    "css",
    "tailwind",
}
DISPLAY_SKILL_NAMES = {
    "nextjs": "next.js",
    "nodejs": "node.js",
}
STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "for",
    "with",
    "in",
    "on",
    "of",
    "is",
    "are",
    "be",
    "as",
    "by",
    "this",
    "that",
    "from",
}
SKILL_ALIASES = {
    "javascript": {"js"},
    "typescript": {"ts"},
    "react": {"reactjs", "react.js"},
    "nextjs": {"next.js", "next js"},
    "nodejs": {"node.js", "node js"},
    "postgresql": {"postgres"},
    "mongodb": {"mongo", "mongo db"},
    "scikit-learn": {"sklearn", "scikit learn"},
}


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\breact\.js\b", "reactjs", text)
    text = re.sub(r"\bnext\.js\b", "nextjs", text)
    text = re.sub(r"\bnext\s+js\b", "nextjs", text)
    text = re.sub(r"\bnode\.js\b", "nodejs", text)
    text = re.sub(r"\bnode\s+js\b", "nodejs", text)
    text = re.sub(r"\bmongo\s+db\b", "mongodb", text)
    text = re.sub(r"\bscikit[\s-]?learn\b", "scikit-learn", text)
    return text


def extract_skills(text: str) -> set[str]:
    text = normalize_text(text)
    found_skills: set[str] = set()

    for skill in get_common_skills():
        if contains_term(text, skill):
            found_skills.add(skill)
            continue

        aliases = SKILL_ALIASES.get(skill, set())
        if any(contains_term(text, alias) for alias in aliases):
            found_skills.add(skill)

    return found_skills


def extract_keywords(text: str) -> set[str]:
    text = normalize_text(text)
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#.-]*\b", text)

    keywords: set[str] = set()
    for word in words:
        if word not in STOPWORDS and len(word) > 2:
            keywords.add(word)

    return keywords


def calculate_fit_score(cv_text: str, job_description: str) -> dict:
    cv_skills = extract_skills(cv_text)
    job_skills = extract_skills(job_description)

    cv_keywords = extract_keywords(cv_text)
    job_keywords = extract_keywords(job_description)

    matched_skills = cv_skills.intersection(job_skills)
    missing_skills = job_skills.difference(cv_skills)
    matched_keywords = cv_keywords.intersection(job_keywords)

    if job_skills:
        skill_score = len(matched_skills) / len(job_skills)
    else:
        skill_score = 0

    if job_keywords:
        keyword_score = len(matched_keywords) / len(job_keywords)
    else:
        keyword_score = 0

    skill_weight = get_skill_weight()
    keyword_weight = get_keyword_weight(skill_weight)

    # Normalize weights to ensure they sum to 1.0
    weight_sum = skill_weight + keyword_weight
    if weight_sum > 0:
        skill_weight /= weight_sum
        keyword_weight /= weight_sum

    # Fit score is intentionally transparent:
    # 75% comes from explicit required skill overlap.
    # 25% comes from broader keyword overlap.
    # This makes the result explainable and avoids fake AI-generated scoring.
    final_score = (skill_score * skill_weight) + (keyword_score * keyword_weight)
    final_percentage = round(final_score * 100, 2)

    return {
        "fit_score": final_percentage,
        "skill_score": round(skill_score * 100, 2),
        "keyword_score": round(keyword_score * 100, 2),
        "matched_skills": format_skills(matched_skills),
        "missing_skills": format_skills(missing_skills),
        "matched_keywords": sorted(list(matched_keywords))[:20],
        "explanation": generate_explanation(
            final_percentage,
            matched_skills,
            missing_skills,
        ),
    }


def generate_explanation(
    score: float,
    matched_skills: set[str],
    missing_skills: set[str],
) -> str:
    if score >= 75:
        verdict = "Strong match"
    elif score >= 50:
        verdict = "Moderate match"
    else:
        verdict = "Weak match"

    matched = (
        ", ".join(format_skills(matched_skills))
        if matched_skills
        else "no major required skills"
    )
    missing = (
        ", ".join(format_skills(missing_skills))
        if missing_skills
        else "no major missing skills"
    )

    return (
        f"{verdict}. The candidate matches {matched}. "
        f"Missing or weaker areas include {missing}."
    )


def contains_term(text: str, term: str) -> bool:
    pattern = rf"(?<![a-zA-Z0-9]){re.escape(term.lower())}(?![a-zA-Z0-9])"
    return bool(re.search(pattern, text))


@functools.lru_cache(maxsize=1)
def get_common_skills() -> frozenset[str]:
    configured_skills = os.getenv("FIT_SCORE_COMMON_SKILLS")
    if not configured_skills:
        return frozenset(DEFAULT_COMMON_SKILLS)

    return frozenset(
        normalize_text(skill).strip()
        for skill in configured_skills.split(",")
        if skill.strip()
    )


def get_skill_weight() -> float:
    configured_weight = os.getenv("FIT_SCORE_SKILL_WEIGHT")
    if configured_weight is None:
        return DEFAULT_SKILL_WEIGHT

    return clamp_weight(
        parse_weight(configured_weight, DEFAULT_SKILL_WEIGHT),
        DEFAULT_SKILL_WEIGHT,
    )


def get_keyword_weight(skill_weight: float) -> float:
    configured_weight = os.getenv("FIT_SCORE_KEYWORD_WEIGHT")
    if configured_weight is None:
        return round(1.0 - skill_weight, 4)

    return clamp_weight(
        parse_weight(configured_weight, DEFAULT_KEYWORD_WEIGHT),
        DEFAULT_KEYWORD_WEIGHT,
    )


def parse_weight(value: str, fallback: float) -> float:
    try:
        return float(value)
    except ValueError:
        return fallback


def clamp_weight(value: float, fallback: float) -> float:
    if 0 <= value <= 1:
        return value
    return fallback


def format_skills(skills: Iterable[str]) -> list[str]:
    return sorted(DISPLAY_SKILL_NAMES.get(skill, skill) for skill in skills)
