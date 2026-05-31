"""Cover letter generation service with RAG context."""
import os

from app.models.cover_letter_models import CoverLetterResponse
from app.services.vector_store_service import retrieve_relevant_chunks


def get_cv_context_for_job(cv_id: str, job_title: str, job_description: str) -> tuple[list[dict], str]:
    """Retrieve relevant CV context for a job application."""
    query = f"Relevant experience, skills, education, and projects for {job_title}. Job description: {job_description}"
    try:
        chunks = retrieve_relevant_chunks(cv_id=cv_id, query=query, top_k=5)
    except FileNotFoundError:
        return [], ""

    context = "\n\n".join(chunk["text"] for chunk in chunks)
    return chunks, context


def generate_cover_letter_with_llm(
    cv_context: str,
    job_title: str,
    company: str,
    job_description: str,
    location: str | None = None,
    required_skills: list[str] | None = None,
    job_url: str | None = None,
) -> str | None:
    """Generate cover letter using OpenAI or Anthropic LLM API."""
    # Try OpenAI first
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            return _generate_with_openai(
                openai_key,
                cv_context,
                job_title,
                company,
                job_description,
                location=location,
                required_skills=required_skills,
                job_url=job_url,
            )
        except Exception:
            pass

    # Try Anthropic
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            return _generate_with_anthropic(
                anthropic_key,
                cv_context,
                job_title,
                company,
                job_description,
                location=location,
                required_skills=required_skills,
                job_url=job_url,
            )
        except Exception:
            pass

    return None


def _generate_with_openai(
    api_key: str,
    cv_context: str,
    job_title: str,
    company: str,
    job_description: str,
    location: str | None = None,
    required_skills: list[str] | None = None,
    job_url: str | None = None,
) -> str:
    """Generate cover letter using OpenAI API."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    prompt = f"""Write a personalized cover letter for the following job application.

Company: {company}
Job Title: {job_title}
Location: {location or "Not specified"}
Job Description: {job_description}
Required Skills: {", ".join(required_skills or []) or "Not specified"}
Job URL: {job_url or "Not provided"}

Based on the candidate's CV:
{cv_context}

Requirements:
- Mention the company name ({company})
- Mention the job title ({job_title})
- Only use real skills, projects, education, or experience from the CV
- Do NOT invent or assume qualifications not in the CV
- Keep it professional, concise, and around 300 words
- If CV context is limited, acknowledge it and still write a strong letter

Write only the cover letter, no extra explanation."""

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        messages=[
            {
                "role": "system",
                "content": "You are a professional career advisor writing personalized cover letters.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=800,
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()


def _generate_with_anthropic(
    api_key: str,
    cv_context: str,
    job_title: str,
    company: str,
    job_description: str,
    location: str | None = None,
    required_skills: list[str] | None = None,
    job_url: str | None = None,
) -> str:
    """Generate cover letter using Anthropic API."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""Write a personalized cover letter for the following job application.

Company: {company}
Job Title: {job_title}
Location: {location or "Not specified"}
Job Description: {job_description}
Required Skills: {", ".join(required_skills or []) or "Not specified"}
Job URL: {job_url or "Not provided"}

Based on the candidate's CV:
{cv_context}

Requirements:
- Mention the company name ({company})
- Mention the job title ({job_title})
- Only use real skills, projects, education, or experience from the CV
- Do NOT invent or assume qualifications not in the CV
- Keep it professional, concise, and around 300 words
- If CV context is limited, acknowledge it and still write a strong letter

Write only the cover letter, no extra explanation."""

    response = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
        system="You are a professional career advisor writing personalized cover letters.",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
    )

    return response.content[0].text.strip()


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
            "To generate a fully personalized letter, configure an AI provider (OPENAI_API_KEY or ANTHROPIC_API_KEY) "
            "in your environment."
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

    # Generate cover letter (try LLM, fallback to template)
    cover_letter = generate_cover_letter_with_llm(
        cv_context,
        job_title,
        company,
        job_description,
        location=location,
        required_skills=required_skills,
        job_url=job_url,
    )
    if cover_letter is None:
        cover_letter = generate_fallback_cover_letter(
            cv_context,
            job_title,
            company,
            job_description,
            location=location,
            required_skills=required_skills,
            job_url=job_url,
        )

    return CoverLetterResponse(
        cover_letter=cover_letter,
        cv_id=cv_id,
        job_title=job_title,
        company=company,
        used_context=cv_context if cv_context else None,
    )
