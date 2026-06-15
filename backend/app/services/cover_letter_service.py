"""Cover letter generation service with RAG context."""

from app.models.cover_letter_models import CoverLetterResponse
from app.services.llm_provider import generate_chat_completion
from app.services.vector_store_service import retrieve_relevant_chunks
from app.services.fallback_response_service import (
    extract_basic_skills_from_context,
    generate_fallback_cover_letter as _generate_fallback_cover_letter,
)


EVIDENCE_SECTION_PRIORITY = {
    "experience": 0,
    "projects": 1,
    "skills": 2,
    "education": 3,
    "other": 4,
}


def get_cv_context_for_job(cv_id: str, job_title: str, job_description: str) -> tuple[list[dict], str]:
    """Retrieve relevant CV context for a job application."""
    query = f"Relevant experience, skills, education, and projects for {job_title}. Job description: {job_description}"
    try:
        chunks = retrieve_relevant_chunks(
            cv_id=cv_id,
            query=query,
            top_k=5,
            intent_override="cover_letter",
        )
    except FileNotFoundError:
        return [], ""

    context = "\n\n".join(chunk["text"] for chunk in chunks)
    return chunks, context


def build_cover_letter_evidence(chunks: list[dict], max_items: int = 4) -> str:
    evidence_lines: list[str] = []
    for chunk in select_cover_letter_evidence_chunks(chunks, max_items=max_items):
        snippet = " ".join(chunk.get("text", "").split())
        if not snippet:
            continue
        if len(snippet) > 160:
            snippet = f"{snippet[:157].rstrip(' ,;:-')}..."
        evidence_lines.append(f"- {chunk.get('section', 'other')}: {snippet}")
    return "\n".join(evidence_lines)


def select_cover_letter_evidence_chunks(chunks: list[dict], max_items: int = 4) -> list[dict]:
    useful_chunks = [chunk for chunk in chunks if chunk.get("section") != "other"]
    other_chunks = [chunk for chunk in chunks if chunk.get("section") == "other"]
    selected = sorted(
        useful_chunks,
        key=lambda chunk: (
            EVIDENCE_SECTION_PRIORITY.get(chunk.get("section", "other"), 99),
            -float(chunk.get("score", 0) or 0),
        ),
    )[:max_items]

    if len(selected) < min(2, max_items):
        selected.extend(other_chunks[: max_items - len(selected)])

    return selected[:max_items]


def generate_cover_letter_with_llm(
    cv_context: str,
    job_title: str,
    company: str,
    job_description: str,
    location: str | None = None,
    required_skills: list[str] | None = None,
    job_url: str | None = None,
    evidence_summary: str | None = None,
) -> str | None:
    """Generate a cover letter using the configured LLM provider chain.

    Provider priority is handled by ``app.services.llm_provider``:
    1. GitHub Models (GITHUB_MODELS_TOKEN)
    2. OpenRouter (OPENROUTER_API_KEY)
    3. None (caller falls back to rule-based letter)
    """
    prompt = f"""Write a personalized cover letter for the following job application.

Company: {company}
Job Title: {job_title}
Location: {location or "Not specified"}
Job Description: {job_description}
Required Skills: {", ".join(required_skills or []) or "Not specified"}
Job URL: {job_url or "Not provided"}

Based on the candidate's CV:
{cv_context}

Retrieved CV evidence:
{evidence_summary or build_cover_letter_evidence_from_context(cv_context)}

Requirements:
- Mention the company name ({company})
- Mention the job title ({job_title})
- Only use real skills, projects, education, or experience from the CV
- Do NOT invent or assume qualifications not in the CV
- Keep it professional, concise, and around 300 words
- If CV context is limited, acknowledge it and still write a strong letter

Write only the cover letter, no extra explanation."""

    messages = [
        {
            "role": "system",
            "content": "You are a professional career advisor writing personalized cover letters.",
        },
        {"role": "user", "content": prompt},
    ]

    return generate_chat_completion(messages, max_tokens=800, temperature=0.7)


def generate_fallback_cover_letter(
    cv_context: str,
    job_title: str,
    company: str,
    job_description: str,
    location: str | None = None,
    required_skills: list[str] | None = None,
    job_url: str | None = None,
) -> str:
    """Generate a template-based cover letter when no LLM is available."""
    if not cv_context.strip():
        return (
            "I could not find enough relevant CV context to create a strongly personalized cover letter. "
            "Please upload a more detailed CV or add more project/experience information. "
            "To generate a fully personalized letter, configure an AI provider (GITHUB_MODELS_TOKEN or "
            "OPENROUTER_API_KEY) on the backend."
        )

    # Extract skills from context
    skills_mentioned = []
    for chunk in cv_context.split("\n"):
        if "skill" in chunk.lower() or any(kw in chunk.lower() for kw in ["python", "javascript", "java", "react", "node"]):
            skills_mentioned.append(chunk.strip()[:100])

    skills_text = skills_mentioned[0] if skills_mentioned else "various technical skills and relevant project experience"

    required_skills_text = ", ".join(required_skills or []) or "the role requirements"

    return f"""Dear Hiring Manager,

I am excited to apply for the {job_title} role at {company}. This position aligns with my career goals and technical background.

Based on my CV, I have experience with {skills_text}. I am particularly drawn to this opportunity because the role requirements match my skill set in Python, API development, and modern software engineering practices.

{job_description[:200]}... (showing alignment with my background).

I also noted the following requirements for this role: {required_skills_text}.

My CV demonstrates practical experience in software development, problem-solving, and collaborative team environments. I am confident that this background will help me contribute effectively to your team.

I would welcome the opportunity to discuss how my experience aligns with your needs. Thank you for considering my application.

Sincerely,
[Your Name]"""


def process_cover_letter_request(
    cv_id: str,
    job_title: str,
    company: str,
    job_description: str,
    location: str | None = None,
    required_skills: list[str] | None = None,
    job_url: str | None = None,
) -> CoverLetterResponse:
    """Process a cover letter generation request."""
    # Retrieve relevant CV context
    chunks, cv_context = get_cv_context_for_job(cv_id, job_title, job_description)
    evidence_summary = build_cover_letter_evidence(chunks)

    # Generate cover letter (try LLM, fallback to template)
    cover_letter = generate_cover_letter_with_llm(
        cv_context,
        job_title,
        company,
        job_description,
        location=location,
        required_skills=required_skills,
        job_url=job_url,
        evidence_summary=evidence_summary,
    )
    if cover_letter is None:
        job_data = {
            "role": job_title,
            "company": company,
            "description": job_description,
            "required_skills": list(required_skills or []),
        }
        cover_letter = _generate_fallback_cover_letter(
            cv_context=cv_context,
            detected_skills=extract_basic_skills_from_context(cv_context),
            job_data=job_data,
        )

    return CoverLetterResponse(
        cover_letter=cover_letter,
        cv_id=cv_id,
        job_title=job_title,
        company=company,
        used_context=cv_context if cv_context else None,
    )


def build_cover_letter_evidence_from_context(cv_context: str) -> str:
    lines = [" ".join(line.split()) for line in cv_context.splitlines() if line.strip()]
    trimmed_lines = []
    for line in lines[:4]:
        trimmed_lines.append(line if len(line) <= 160 else f"{line[:157].rstrip(' ,;:-')}...")
    return "\n".join(f"- {line}" for line in trimmed_lines) if trimmed_lines else "- No strong CV evidence retrieved."
