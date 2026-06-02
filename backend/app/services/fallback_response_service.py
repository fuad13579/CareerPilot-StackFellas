"""Rule-based fallback response service.

This module generates helpful, structured responses without calling any LLM.
The output never mentions missing API keys or providers — it presents
CareerPilot's own CV/job analysis as the source of the answer.

Public entry points:
- ``generate_rule_based_response`` for assistant-style questions
- ``generate_fallback_cover_letter`` for cover letter generation
- helpers: ``detect_intent``, ``format_bullet_list``, ``summarize_context``,
  ``calculate_verdict``, ``extract_basic_skills_from_context``
"""
from __future__ import annotations

import re
from typing import Iterable

BUILTIN_NOTICE = "This response uses CareerPilot's built-in CV analysis."

# Intent detection -----------------------------------------------------------

_INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "skills": (
        "skill", "skills", "technologies", "technology", "tech stack",
        "tool", "tools", "stack", "languages", "frameworks",
    ),
    "experience": (
        "experience", "work", "worked", "internship", "intern", "job",
        "professional background", "background", "career history",
    ),
    "projects": (
        "project", "projects", "portfolio", "built", "developed",
        "github", "application i built",
    ),
    "readiness": (
        "ready", "fit", "match", "apply", "should i apply",
        "good fit", "qualified", "chance",
    ),
    "skill_gap": (
        "missing", "gap", "gaps", "learn", "improve", "lacking",
        "weak", "weakness", "need to learn",
    ),
    "roadmap": (
        "roadmap", "plan", "month", "week", "timeline",
        "job ready", "preparation", "prepare",
    ),
    "cover_letter": (
        "cover letter", "cover-letter", "motivation letter",
    ),
}


def detect_intent(question: str) -> str:
    """Map a free-form question to one of our fallback intents.

    Returns one of: skills, experience, projects, readiness, skill_gap,
    roadmap, cover_letter, general_summary.
    """
    if not question:
        return "general_summary"
    q = question.lower()
    best_intent = "general_summary"
    best_hits = 0
    for intent, keywords in _INTENT_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in q)
        if hits > best_hits:
            best_hits = hits
            best_intent = intent
    return best_intent


# Formatting helpers ---------------------------------------------------------

def format_bullet_list(items: Iterable[str]) -> str:
    """Render an iterable of strings as a markdown bullet list."""
    items = [str(i).strip() for i in items if str(i).strip()]
    if not items:
        return "- (none detected)"
    return "\n".join(f"- {item}" for item in items)


def summarize_context(context: str, max_chars: int = 1200) -> str:
    """Return a compact summary of the CV context suitable for templates."""
    if not context:
        return ""
    text = context.strip()
    # Collapse runs of whitespace so the template reads cleanly.
    text = re.sub(r"\s+", " ", text)
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars].rsplit(" ", 1)[0]
    return f"{truncated}..."


def calculate_verdict(fit_score: float | None) -> str:
    """Translate a numeric fit score into a human-readable verdict label."""
    if fit_score is None:
        return "preliminary match"
    if fit_score >= 80:
        return "strong match"
    if fit_score >= 60:
        return "good match"
    if fit_score >= 40:
        return "partial match"
    return "weak match"


# Skill extraction ----------------------------------------------------------

# A pragmatic, conservative list used when the caller did not pass
# pre-detected skills. Matched as whole words, case-insensitive.
_COMMON_SKILLS: tuple[str, ...] = (
    "python", "javascript", "typescript", "java", "kotlin", "swift",
    "c++", "c#", "go", "rust", "ruby", "php", "scala", "r", "matlab",
    "react", "next.js", "nextjs", "vue", "angular", "svelte", "redux",
    "node.js", "nodejs", "express", "fastapi", "django", "flask",
    "spring", "rails", "laravel", ".net", "asp.net",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite",
    "elasticsearch", "dynamodb", "firebase", "supabase", "cassandra",
    "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins",
    "github actions", "gitlab ci", "ci/cd", "aws", "azure", "gcp",
    "google cloud", "heroku", "vercel", "netlify",
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "data analysis", "data science", "tableau", "power bi", "looker",
    "html", "css", "sass", "tailwind", "bootstrap",
    "rest", "rest api", "graphql", "grpc", "websocket",
    "git", "linux", "bash", "powershell", "agile", "scrum",
    "jira", "figma", "photoshop", "illustrator",
    "unit testing", "pytest", "jest", "cypress", "selenium",
    "microservices", "distributed systems", "system design",
    "rag", "llm", "openai", "prompt engineering",
)


def extract_basic_skills_from_context(context: str) -> list[str]:
    """Pull a list of likely skills from CV text using keyword matching."""
    if not context:
        return []
    haystack = context.lower()
    found: list[str] = []
    for skill in _COMMON_SKILLS:
        # Whole-word-ish match to avoid matching "go" inside "google".
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
        if re.search(pattern, haystack):
            found.append(skill)
    return found


# Role suggestions derived from detected skills -----------------------------

_ROLE_SKILL_MAP: dict[str, tuple[str, ...]] = {
    "Frontend Developer": ("react", "vue", "angular", "next.js", "typescript", "css", "tailwind"),
    "Backend Developer": ("python", "fastapi", "django", "flask", "node.js", "java", "spring", "postgresql", "mongodb"),
    "Full-Stack Developer": ("react", "next.js", "node.js", "typescript", "python", "postgresql"),
    "Data Scientist": ("python", "machine learning", "deep learning", "pandas", "numpy", "tensorflow", "pytorch"),
    "Data Analyst": ("python", "sql", "tableau", "power bi", "data analysis", "pandas"),
    "ML Engineer": ("python", "pytorch", "tensorflow", "machine learning", "docker", "kubernetes"),
    "DevOps Engineer": ("docker", "kubernetes", "terraform", "jenkins", "github actions", "ci/cd", "aws", "azure", "gcp"),
    "Cloud Engineer": ("aws", "azure", "gcp", "terraform", "kubernetes", "docker"),
    "Mobile Developer": ("kotlin", "swift", "react", "flutter"),
    "QA / Test Engineer": ("selenium", "cypress", "jest", "pytest", "unit testing"),
}


def _suggest_roles(skills: list[str]) -> list[str]:
    """Return role names whose required skills overlap with the CV's skills."""
    if not skills:
        return []
    skill_set = {s.lower() for s in skills}
    scored: list[tuple[int, str]] = []
    for role, required in _ROLE_SKILL_MAP.items():
        overlap = sum(1 for r in required if r in skill_set)
        if overlap:
            scored.append((overlap, role))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [role for _, role in scored[:3]]


# Section slicers ------------------------------------------------------------

_EXPERIENCE_SECTION_KEYS = (
    "experience", "work experience", "professional experience",
    "employment", "internship", "internships", "career",
)

_PROJECT_SECTION_KEYS = (
    "project", "projects", "portfolio", "personal projects",
    "academic projects",
)


def _looks_like_heading(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if len(stripped) > 80:
        return False
    # A heading tends to be a short line with mostly title-case letters
    # or a known section keyword.
    letters = [c for c in stripped if c.isalpha()]
    if not letters:
        return False
    upper = sum(1 for c in letters if c.isupper())
    return upper / len(letters) > 0.4


def _split_sections(context: str) -> dict[str, str]:
    """Group CV chunks by their section name. Falls back to one big section."""
    if not context:
        return {}
    sections: dict[str, list[str]] = {}
    current = "general"
    sections[current] = []
    for line in context.splitlines():
        if not line.strip():
            continue
        if _looks_like_heading(line):
            current = line.strip().lower()
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(line.strip())
    return {name: " ".join(lines) for name, lines in sections.items()}


def _pick_section_text(context: str, keys: tuple[str, ...]) -> list[str]:
    sections = _split_sections(context)
    if not sections:
        return []
    picked: list[str] = []
    for name, body in sections.items():
        if any(k in name for k in keys):
            if body.strip():
                picked.append(body.strip())
    if picked:
        return picked
    # No dedicated section found — return the first non-empty chunk as a hint.
    for body in sections.values():
        if body.strip():
            return [body.strip()[:400]]
    return []


# Template engines -----------------------------------------------------------

_FOOTER = BUILTIN_NOTICE


def _skills_response(detected: list[str], cv_context: str) -> str:
    skills = detected or extract_basic_skills_from_context(cv_context)
    if skills:
        skills_list = format_bullet_list(skills)
        top_areas = ", ".join(skills[:3]) if len(skills) >= 3 else ", ".join(skills)
    else:
        skills_list = "- (no common technical skills detected in the CV text)"
        top_areas = "the strongest signals visible in your CV (please add a clear Skills section for better results)"
    roles = _suggest_roles(skills)
    roles_text = ", ".join(roles) if roles else "roles aligned with the skills in your CV (add more skills for better suggestions)"
    return (
        "Based on your uploaded CV, these are the main skills I found:\n\n"
        f"{skills_list}\n\n"
        f"Your strongest visible areas appear to be: {top_areas}.\n\n"
        f"These skills can support roles such as: {roles_text}.\n\n"
        f"{_FOOTER}"
    )


def _experience_response(detected: list[str], cv_context: str) -> str:
    chunks = _pick_section_text(cv_context, _EXPERIENCE_SECTION_KEYS)
    experience_count = len(chunks)
    if chunks:
        experience_summary = summarize_context(" ".join(chunks), max_chars=700)
    else:
        experience_summary = summarize_context(cv_context, max_chars=500)
    # Derive 3 generic strengths from detected skills to keep things grounded.
    derived_skills = detected or extract_basic_skills_from_context(cv_context)
    strengths = derived_skills[:3] if derived_skills else [
        "practical project or internship exposure",
        "problem-solving across your domain",
        "collaborative communication on cross-functional work",
    ]
    role_suggestions = _suggest_roles(derived_skills)
    roles_text = ", ".join(role_suggestions) if role_suggestions else "the roles you are targeting"
    count_line = f"Your CV includes {experience_count} experience entries.\n\n" if experience_count else ""
    return (
        "Based on your CV, here is a summary of your experience:\n\n"
        f"{count_line}"
        f"{experience_summary}\n\n"
        "Key strengths shown in your experience:\n"
        f"{format_bullet_list(strengths)}\n\n"
        f"This experience can support applications for roles related to: {roles_text}.\n\n"
        f"{_FOOTER}"
    )


def _projects_response(cv_context: str) -> str:
    chunks = _pick_section_text(cv_context, _PROJECT_SECTION_KEYS)
    if chunks:
        project_summary = summarize_context(" ".join(chunks), max_chars=700)
    else:
        project_summary = summarize_context(cv_context, max_chars=500)
    strengths = [
        "practical application of technical skills",
        "end-to-end ownership (build → test → ship)",
        "clear evidence of the tools and stack you know",
    ]
    return (
        "Based on your CV, these projects stand out:\n\n"
        f"{project_summary}\n\n"
        "The projects show evidence of:\n"
        f"{format_bullet_list(strengths)}\n\n"
        "To improve your profile, consider adding measurable impact, technologies used, "
        "GitHub links, screenshots, and deployment links for each project.\n\n"
        f"{_FOOTER}"
    )


def _readiness_response(job_data: dict | None, detected: list[str], cv_context: str) -> str:
    if not job_data:
        skills = detected or extract_basic_skills_from_context(cv_context)
        skills_text = format_bullet_list(skills) if skills else "- (no skills detected yet)"
        return (
            "I can give a more accurate readiness verdict after you select or save a job. "
            f"Based only on your CV, your strongest areas are:\n\n{skills_text}\n\n"
            f"{_FOOTER}"
        )

    role = job_data.get("role") or "the selected role"
    company = job_data.get("company") or "the selected company"
    fit_score = job_data.get("fit_score")
    matched = job_data.get("matched_skills") or []
    missing = job_data.get("missing_skills") or []

    matched_text = format_bullet_list(matched)
    missing_text = format_bullet_list(missing) if missing else "- (no major missing skills detected)"
    matched_summary = ", ".join(matched) if matched else "the skills visible in your CV"
    missing_summary = ", ".join(missing) if missing else "additional role-specific areas"
    top_missing = missing[0] if missing else "the top missing area"
    score_text = f"{fit_score:.0f}%" if isinstance(fit_score, (int, float)) else "n/a"

    return (
        f"Readiness verdict for {role} at {company}:\n\n"
        f"Fit Score: {score_text}\n\n"
        f"You are a {calculate_verdict(fit_score)} for this role.\n\n"
        f"Matched skills:\n{matched_text}\n\n"
        f"Missing or weaker areas:\n{missing_text}\n\n"
        f"Why:\n"
        f"Your CV shows evidence of {matched_summary}. "
        f"However, the role also expects {missing_summary}, "
        "which is not clearly visible in your CV.\n\n"
        "Recommended next steps:\n"
        f"1. Strengthen or add proof of {top_missing}.\n"
        "2. Update your CV to highlight relevant projects or experience.\n"
        "3. Apply if the role is entry-level or internship-friendly, but prepare to explain the missing areas.\n\n"
        f"{_FOOTER}"
    )


def _skill_gap_response(job_data: dict | None, detected: list[str], cv_context: str) -> str:
    if not job_data:
        skills = detected or extract_basic_skills_from_context(cv_context)
        return (
            "I can give a more accurate skill-gap analysis after you select or save a job. "
            f"Based only on your CV, your next improvement areas should be connected to the roles you are targeting. "
            f"Current skills include: {', '.join(skills) if skills else 'the skills already in your CV'}.\n\n"
            f"{_FOOTER}"
        )
    matched = job_data.get("matched_skills") or []
    missing = job_data.get("missing_skills") or []
    priority = missing[:3] if missing else [
        "a role-specific framework from the job description",
        "deployment or cloud exposure",
        "testing and CI/CD basics",
    ]
    matched_text = format_bullet_list(matched) if matched else "- (no matched skills recorded)"
    missing_text = format_bullet_list(missing) if missing else "- (no missing skills recorded)"
    return (
        "Based on your CV and the selected job, these are the main skill gaps:\n\n"
        f"Missing skills:\n{missing_text}\n\n"
        f"Already matched skills:\n{matched_text}\n\n"
        "Priority learning order:\n"
        f"1. {priority[0]}\n"
        f"2. {priority[1] if len(priority) > 1 else priority[0]}\n"
        f"3. {priority[2] if len(priority) > 2 else priority[0]}\n\n"
        "Suggested action:\n"
        "Build a small project that demonstrates the missing skills and add it to your CV. "
        "For example, if Docker or PostgreSQL is missing, create a backend project using "
        "FastAPI, PostgreSQL, and Docker.\n\n"
        f"{_FOOTER}"
    )


def _roadmap_response(detected: list[str], cv_context: str) -> str:
    current = detected or extract_basic_skills_from_context(cv_context)
    current_text = ", ".join(current) if current else "the skills already in your CV"
    missing_suggestion = (
        "Docker, PostgreSQL, testing, and deployment fundamentals"
        if not detected
        else "the missing skills called out in your skill-gap analysis"
    )
    return (
        "Here is a simple 3-month roadmap based on your CV:\n\n"
        "Month 1: Strengthen your foundation\n"
        f"- Review your strongest current skills: {current_text}\n"
        "- Improve weak or missing fundamentals.\n"
        "- Update your CV with clearer skill and project descriptions.\n\n"
        "Month 2: Build proof through projects\n"
        "- Build one role-focused project.\n"
        f"- Add missing skills such as {missing_suggestion}.\n"
        "- Document the project with GitHub, README, screenshots, and deployment if possible.\n\n"
        "Month 3: Apply and track progress\n"
        "- Apply to roles that match your strongest skills.\n"
        "- Generate tailored cover letters for each tracked job.\n"
        "- Practice interview questions related to your missing skills.\n"
        "- Use the tracker to monitor Applied, Interviewing, Offer, and Rejected statuses.\n\n"
        "Recommended weekly target:\n"
        "- Apply to 5 jobs\n"
        "- Complete 2 skill-learning tasks\n"
        "- Improve 1 CV/project section\n\n"
        f"{_FOOTER}"
    )


def _general_summary_response(detected: list[str], cv_context: str) -> str:
    skills = detected or extract_basic_skills_from_context(cv_context)
    experience_chunks = _pick_section_text(cv_context, _EXPERIENCE_SECTION_KEYS)
    project_chunks = _pick_section_text(cv_context, _PROJECT_SECTION_KEYS)
    experience_text = summarize_context(" ".join(experience_chunks), max_chars=400) if experience_chunks else ""
    project_text = summarize_context(" ".join(project_chunks), max_chars=400) if project_chunks else ""
    if experience_text and project_text:
        experience_or_project = f"Experience:\n{experience_text}\n\nProjects:\n{project_text}"
    elif experience_text:
        experience_or_project = f"Experience:\n{experience_text}"
    elif project_text:
        experience_or_project = f"Projects:\n{project_text}"
    else:
        experience_or_project = summarize_context(cv_context, max_chars=500)
    return (
        "Based on your uploaded CV, here is what I found:\n\n"
        f"Summary:\n{summarize_context(cv_context, max_chars=500)}\n\n"
        f"Main skills:\n{format_bullet_list(skills)}\n\n"
        f"Relevant experience/projects:\n{experience_or_project}\n\n"
        "Suggested next step:\n"
        "Ask me about your job readiness, missing skills, or a roadmap for a specific role.\n\n"
        f"{_FOOTER}"
    )


# Public entry points --------------------------------------------------------

def generate_rule_based_response(
    question: str,
    cv_context: str,
    detected_skills: list[str] | None = None,
    experience_chunks: list[str] | None = None,
    project_chunks: list[str] | None = None,
    job_data: dict | None = None,
    task: str = "assistant",
) -> str:
    """Produce a structured answer for the given question without an LLM."""
    if task == "cover_letter":
        return generate_fallback_cover_letter(
            cv_context=cv_context,
            detected_skills=detected_skills or extract_basic_skills_from_context(cv_context),
            job_data=job_data or {},
        )

    intent = detect_intent(question)
    skills = detected_skills or extract_basic_skills_from_context(cv_context)

    if intent == "skills":
        return _skills_response(skills, cv_context)
    if intent == "experience":
        return _experience_response(skills, cv_context)
    if intent == "projects":
        return _projects_response(cv_context)
    if intent == "readiness":
        return _readiness_response(job_data, skills, cv_context)
    if intent == "skill_gap":
        return _skill_gap_response(job_data, skills, cv_context)
    if intent == "roadmap":
        return _roadmap_response(skills, cv_context)
    return _general_summary_response(skills, cv_context)


def generate_fallback_cover_letter(
    cv_context: str,
    detected_skills: list[str] | None,
    job_data: dict,
) -> str:
    """Produce a structured cover letter without an LLM.

    ``job_data`` is expected to include at least ``role`` and ``company`` and
    may include ``required_skills``, ``matched_skills``, ``missing_skills``,
    ``candidate_name``, and ``description``.
    """
    role = (job_data or {}).get("role") or "the open position"
    company = (job_data or {}).get("company") or "your company"
    required = (job_data or {}).get("required_skills") or []
    matched = (job_data or {}).get("matched_skills") or []
    missing = (job_data or {}).get("missing_skills") or []
    candidate_name = (job_data or {}).get("candidate_name") or "[Your Name]"

    skills = detected_skills or extract_basic_skills_from_context(cv_context)
    top_skills = ", ".join(skills[:3]) if len(skills) >= 3 else ", ".join(skills) or "the technologies listed in my CV"

    experience_chunks = _pick_section_text(cv_context, _EXPERIENCE_SECTION_KEYS)
    project_chunks = _pick_section_text(cv_context, _PROJECT_SECTION_KEYS)
    relevant_pieces: list[str] = []
    for chunk in experience_chunks + project_chunks:
        if chunk:
            relevant_pieces.append(chunk[:160])
    relevant_experience_or_projects = (
        "; ".join(relevant_pieces[:2]) if relevant_pieces else "practical tasks and projects listed in my CV"
    )

    matched_skills_or_role_area = (
        ", ".join(matched[:3]) if matched
        else (skills[0] if skills else "the responsibilities of this role")
    )
    missing_or_required = (
        ", ".join((missing or required)[:3]) or "the additional skills noted in the description"
    )
    strengths = skills[:3] if len(skills) >= 3 else (skills + [
        "problem solving", "collaboration", "ownership"
    ])[:3]
    strength_1, strength_2, strength_3 = strengths[0], strengths[1], strengths[2]

    return (
        f"Dear Hiring Manager,\n\n"
        f"I am excited to apply for the {role} position at {company}. "
        "Based on my background, I believe this opportunity aligns well with my skills and career goals.\n\n"
        f"My CV highlights experience with {top_skills}. "
        f"I have worked on projects and tasks involving {relevant_experience_or_projects}, "
        "which helped me build practical problem-solving and technical skills.\n\n"
        f"What makes me interested in this role is the opportunity to apply my experience in "
        f"{matched_skills_or_role_area}. I believe my strengths in {strength_1}, {strength_2}, "
        f"and {strength_3} would allow me to contribute effectively to your team.\n\n"
        f"I also noticed that this role values {missing_or_required}. I am actively working to "
        "improve in these areas and would welcome the opportunity to grow while contributing to real projects.\n\n"
        f"Thank you for considering my application. I would be grateful for the opportunity to "
        f"discuss how my background and motivation align with the needs of {company}.\n\n"
        f"Sincerely,\n{candidate_name}\n\n"
        f"{_FOOTER}"
    )
