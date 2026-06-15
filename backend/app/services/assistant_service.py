"""AI Assistant service with RAG context and session memory."""
import asyncio

from app.models.assistant_models import (
    AssistantJobResult,
    AssistantQueryResponse,
    AssistantSource,
)
from app.services.llm_provider import generate_chat_completion, active_provider_name
from app.services.vector_store_service import retrieve_relevant_chunks
from app.services.fallback_response_service import (
    generate_rule_based_response,
    extract_basic_skills_from_context,
)
from app.services.job_search_service import fetch_live_jobs
from app.services.job_recommendation_service import calculate_fit_score
from app.utils.job_search_filters import build_job_search_filters, filter_jobs_by_salary
from app.models.database_models import AssistantSession
from app.database import SessionLocal


# In-memory session storage: anonymous_user_id:session_id -> list of messages
SESSION_MEMORY: dict[str, list[dict[str, str]]] = {}
MAX_HISTORY_MESSAGES = 10
EVIDENCE_SECTION_PRIORITY = {
    "experience": 0,
    "projects": 1,
    "skills": 2,
    "education": 3,
    "other": 4,
}
JOB_SEARCH_VERBS = (
    "find",
    "search",
    "look for",
    "show",
    "list",
    "recommend",
    "discover",
    "browse",
)
JOB_SEARCH_NOUNS = (
    "job",
    "jobs",
    "role",
    "roles",
    "opening",
    "openings",
    "position",
    "positions",
    "internship",
    "internships",
    "opportunity",
    "opportunities",
)


def _session_key(anonymous_user_id: str | None, session_id: str) -> str:
    return f"{anonymous_user_id or 'anonymous'}:{session_id}"


def get_conversation_history(session_id: str, anonymous_user_id: str | None = None, db=None) -> list[dict[str, str]]:
    """Get conversation history for a session from database.

    Queries AssistantSession rows by session_id and returns a list of
    message dictionaries ordered by created_at ascending.
    """
    # Try to load from database first
    try:
        should_close = db is None
        db = db or SessionLocal()
        try:
            query = db.query(AssistantSession).filter(AssistantSession.session_id == session_id)
            if anonymous_user_id:
                query = query.filter(AssistantSession.anonymous_user_id == anonymous_user_id)

            sessions = query.order_by(AssistantSession.created_at.asc()).all()
            if sessions:
                # Sync to memory for consistency. We keep the created_at stamp
                # so the /history endpoint can echo it back to the client.
                history = [
                    {
                        "role": s.role,
                        "content": s.content,
                        "created_at": s.created_at.isoformat() if s.created_at else None,
                    }
                    for s in sessions
                ]
                # Keep only last MAX_HISTORY_MESSAGES
                history = history[-MAX_HISTORY_MESSAGES:]
                SESSION_MEMORY[_session_key(anonymous_user_id, session_id)] = history
                return history
        finally:
            if should_close:
                db.close()
    except Exception:
        pass

    # Fall back to in-memory (no timestamps available)
    return SESSION_MEMORY.get(_session_key(anonymous_user_id, session_id), [])


def _persist_message_to_conversation(
    session_id: str,
    cv_id: str | None,
    role: str,
    content: str,
    anonymous_user_id: str | None = None,
    db=None
) -> None:
    """Add a message row to the conversation history in the database.
    
    Inserts a new AssistantSession row with the given session_id, role, and content.
    Role should be "user" or "assistant".
    """
    try:
        should_close = db is None
        db = db or SessionLocal()
        try:
            # Insert new message row
            session = AssistantSession(
                anonymous_user_id=anonymous_user_id,
                session_id=session_id,
                cv_id=cv_id,
                role=role,
                content=content,
            )
            db.add(session)
            db.commit()
        finally:
            if should_close:
                db.close()
    except Exception:
        # Don't break functionality if database save fails
        pass


def add_to_conversation(session_id: str, cv_id: str | None, role: str, content: str, anonymous_user_id: str | None = None) -> None:
    """Add a message to the conversation history (both memory and database)."""
    session_key = _session_key(anonymous_user_id, session_id)
    if session_key not in SESSION_MEMORY:
        SESSION_MEMORY[session_key] = []

    SESSION_MEMORY[session_key].append({"role": role, "content": content})

    # Keep only the last MAX_HISTORY_MESSAGES to avoid memory bloat
    if len(SESSION_MEMORY[session_key]) > MAX_HISTORY_MESSAGES:
        SESSION_MEMORY[session_key] = SESSION_MEMORY[session_key][-MAX_HISTORY_MESSAGES:]

    # Also save to database for persistence
    _persist_message_to_conversation(session_id, cv_id, role, content, anonymous_user_id=anonymous_user_id)


def generate_answer_with_llm(context: str, question: str, history: list[dict]) -> str | None:
    """Generate answer using the configured LLM provider chain.

    Provider priority is handled by ``app.services.llm_provider``:
    1. GitHub Models (GITHUB_MODELS_TOKEN)
    2. OpenRouter (OPENROUTER_API_KEY)
    3. None (caller falls back to rule-based answer)
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful career assistant. Answer questions based ONLY on the "
                "provided CV context. Do not invent or assume skills, experience, or "
                "qualifications that are not mentioned in the context. If the context "
                "doesn't contain enough information, say so clearly. Keep answers helpful, "
                "concise, and career-focused."
            ),
        }
    ]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append(
        {
            "role": "user",
            "content": f"CV Context:\n{context}\n\nQuestion: {question}",
        }
    )

    return generate_chat_completion(messages, max_tokens=500, temperature=0.7)


def generate_fallback_answer(context: str, question: str) -> str:
    """Generate a simple template-based answer when no LLM is available."""
    if not context.strip():
        return (
            "I'm ready to help with your career questions! However, I couldn't find your CV information in the search index. "
            "This might happen if the RAG index is still building or if you just uploaded your CV.\n\n"
            "To fix this:\n"
            "1. Try refreshing the page and asking your question again\n"
            "2. If the issue persists, re-upload your CV\n\n"
            "Note: AI-powered answers require GITHUB_MODELS_TOKEN or OPENROUTER_API_KEY "
            "to be configured on the backend."
        )

    # Extract key information from context
    lines = context.split("\n")
    relevant_text = "\n".join(line.strip() for line in lines if line.strip())[:500]

    return (
        f"Based on your CV, I found relevant information:\n\n"
        f"{relevant_text}...\n\n"
        f"I found CV content but need an AI provider (GITHUB_MODELS_TOKEN or OPENROUTER_API_KEY) "
        f"to provide detailed personalized answers. Once configured, I can give you deeper insights "
        f"about your career readiness, skill gaps, and recommendations."
    )


def _is_job_search_question(question: str) -> bool:
    """Heuristically detect when the assistant should search live jobs."""
    text = question.lower().strip()
    if not text:
        return False

    has_search_verb = any(term in text for term in JOB_SEARCH_VERBS)
    has_job_noun = any(term in text for term in JOB_SEARCH_NOUNS)

    if has_search_verb and has_job_noun:
        return True

    return any(
        phrase in text
        for phrase in (
            "who is hiring",
            "remote jobs",
            "job openings",
            "open roles",
            "hiring for",
        )
    )


async def _search_jobs_for_assistant(
    question: str,
    cv_context: str,
    limit: int = 5,
) -> tuple[str, list[AssistantJobResult], str | None, str, str]:
    """Run live job search for assistant job-hunter requests."""
    query, location, parsed = build_job_search_filters(question)
    source, jobs, error = await fetch_live_jobs(query, location, limit)
    salary_min = parsed.get("salary_min")
    if salary_min:
        jobs = filter_jobs_by_salary(jobs, salary_min)

    cv_skills = extract_basic_skills_from_context(cv_context)
    structured_jobs: list[AssistantJobResult] = []
    for job in jobs:
        fit = calculate_fit_score(cv_skills, job) if cv_skills else None
        structured_jobs.append(
            AssistantJobResult(
                job_id=job.job_id,
                role=job.role,
                company=job.company,
                location=job.location,
                salary=job.salary,
                source=job.source,
                job_url=job.job_url,
                fit_score=fit.fit_score if fit else None,
                required_skills=job.required_skills,
                matched_skills=fit.matched_skills if fit else [],
                missing_skills=fit.missing_skills if fit else [],
                reason=job.reason,
            )
        )

    if structured_jobs:
        lines = [
            f"I searched live jobs for '{query}' in {location} and found {len(structured_jobs)} match{'es' if len(structured_jobs) != 1 else ''}.",
        ]
        if source:
            lines.append(f"Source: {source}.")
        if cv_skills:
            lines.append("I also estimated fit from the skills visible in your CV context.")
        top_roles = [
            f"{index + 1}. {job.role} at {job.company} ({job.location or 'Location not provided'})"
            for index, job in enumerate(structured_jobs[:3])
        ]
        answer = "\n".join(lines + ["", *top_roles])
    else:
        if error:
            answer = (
                f"I searched live jobs for '{query}' in {location}, but the search did not return matches. "
                f"{error}"
            )
        elif salary_min:
            answer = (
                f"I searched live jobs for '{query}' in {location} with a minimum salary of "
                f"${salary_min:,}, but no returned jobs met that salary threshold."
            )
        else:
            answer = f"I searched live jobs for '{query}' in {location}, but I could not find matching roles right now."

    return answer, structured_jobs, source, query, location


def generate_ai_response(
    prompt: str,
    cv_context: str,
    task: str = "assistant",
    detected_skills: list[str] | None = None,
    experience_chunks: list[str] | None = None,
    project_chunks: list[str] | None = None,
    job_data: dict | None = None,
    history: list[dict] | None = None,
) -> tuple[str, str | None, bool]:
    """Generate an AI response, falling back to rule-based on any LLM failure.

    Returns ``(answer, provider, fallback_used)``. When the LLM is used,
    ``provider`` is the active provider name (``"github_models"`` or
    ``"openrouter"``) and ``fallback_used`` is False. On fallback,
    ``provider`` is ``"rule_based_fallback"`` and ``fallback_used`` is True.
    Raw API errors are never raised to the caller.
    """
    provider = active_provider_name() or "rule_based_fallback"
    history = history or []

    answer: str | None = None
    if task == "assistant" and provider != "rule_based_fallback":
        try:
            answer = generate_answer_with_llm(cv_context, prompt, history)
        except Exception:  # noqa: BLE001
            answer = None

    if answer:
        return answer, provider, False

    fallback_answer = generate_rule_based_response(
        question=prompt,
        cv_context=cv_context,
        detected_skills=detected_skills,
        experience_chunks=experience_chunks,
        project_chunks=project_chunks,
        job_data=job_data,
        task=task,
    )
    return fallback_answer, "rule_based_fallback", True


def get_cv_context(cv_id: str, question: str) -> tuple[list[dict], str]:
    """Retrieve relevant CV chunks for a question using RAG."""
    try:
        chunks = retrieve_relevant_chunks(cv_id=cv_id, query=question, top_k=3)
        print(f"[RAG DEBUG] Retrieved {len(chunks)} chunks for cv_id={cv_id}, query='{question[:50]}...'")
    except FileNotFoundError as exc:
        print(f"[RAG DEBUG] Vector store not found for cv_id={cv_id}, attempting rebuild: {exc}")
        # Attempt to rebuild RAG index from saved CV sections
        chunks = _rebuild_rag_from_saved_cv(cv_id, question)
        if chunks:
            print(f"[RAG DEBUG] Rebuilt RAG with {len(chunks)} chunks")
        else:
            print(f"[RAG DEBUG] Could not rebuild RAG for cv_id={cv_id}")
            return [], ""

    context = "\n\n".join(chunk["text"] for chunk in chunks)
    return chunks, context


def _rebuild_rag_from_saved_cv(cv_id: str, question: str) -> list[dict]:
    """Rebuild RAG index from saved CV sections if vector store is missing."""
    try:
        from app.services.cv_chunking_service import create_cv_chunks, load_processed_cv_sections
        from app.services.vector_store_service import build_cv_rag_index

        sections = load_processed_cv_sections(cv_id)
        chunks = create_cv_chunks(cv_id, sections)
        build_cv_rag_index(cv_id, chunks)

        from app.services.vector_store_service import retrieve_relevant_chunks
        return retrieve_relevant_chunks(cv_id=cv_id, query=question, top_k=3)
    except Exception as exc:
        print(f"[RAG DEBUG] Failed to rebuild RAG: {exc}")
        return []


def format_cv_evidence(chunks: list[dict], max_items: int = 3) -> str:
    evidence_lines: list[str] = []
    for chunk in select_evidence_chunks(chunks, max_items=max_items):
        snippet = summarize_chunk_text(chunk.get("text", ""))
        if not snippet:
            continue
        evidence_lines.append(f"- {chunk.get('section', 'other').title()}: {snippet}")

    if not evidence_lines:
        return ""

    return "CV evidence used:\n" + "\n".join(evidence_lines)


def select_evidence_chunks(chunks: list[dict], max_items: int = 3) -> list[dict]:
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


def summarize_chunk_text(text: str, max_length: int = 140) -> str:
    clean_text = " ".join(text.split())
    if len(clean_text) <= max_length:
        return clean_text
    truncated = clean_text[: max_length - 3].rstrip(" ,;:-")
    return f"{truncated}..."


def _load_job_data(job_id: str | None, anonymous_user_id: str | None) -> dict | None:
    """Best-effort load of tracked-job data for readiness/skill-gap answers."""
    if not job_id or not anonymous_user_id:
        return None
    try:
        from app.models.database_models import Application
        db = SessionLocal()
        try:
            app = (
                db.query(Application)
                .filter(Application.id == job_id)
                .filter(Application.anonymous_user_id == anonymous_user_id)
                .first()
            )
            if not app:
                return None
            import json as _json
            required = _json.loads(app.required_skills) if app.required_skills else []
            # Estimate matched/missing from fit_score + required skills.
            matched: list[str] = []
            missing: list[str] = list(required)
            return {
                "role": app.role,
                "company": app.company,
                "description": app.notes or "",
                "fit_score": app.fit_score,
                "required_skills": required,
                "matched_skills": matched,
                "missing_skills": missing,
            }
        finally:
            db.close()
    except Exception:
        return None


def process_assistant_query(
    cv_id: str,
    session_id: str,
    question: str,
    anonymous_user_id: str | None = None,
    job_id: str | None = None,
    job_context: str | None = None,
) -> AssistantQueryResponse:
    """Process an AI assistant query with RAG context and session memory."""
    # Add user message to history
    add_to_conversation(session_id, cv_id, "user", question, anonymous_user_id=anonymous_user_id)

    # Get conversation history
    history = get_conversation_history(session_id, anonymous_user_id=anonymous_user_id)

    # Retrieve relevant CV chunks
    chunks, context = get_cv_context(cv_id, question)

    # Build optional job_data from a tracked job (best-effort; ignored if missing).
    job_data = _load_job_data(job_id, anonymous_user_id)
    combined_context = context
    if job_context and job_context.strip():
        combined_context = f"{context}\n\nTarget Job Context:\n{job_context.strip()}".strip()

    if _is_job_search_question(question):
        answer, job_results, source, search_query, search_location = asyncio.run(
            _search_jobs_for_assistant(question, combined_context)
        )
        add_to_conversation(session_id, cv_id, "assistant", answer, anonymous_user_id=anonymous_user_id)
        return AssistantQueryResponse(
            session_id=session_id,
            answer=answer,
            retrieved_context=combined_context,
            sources=[],
            intent="job_search",
            job_results=job_results,
            job_search_query=search_query,
            job_search_location=search_location,
            job_search_source=source,
            provider=None,
            fallback_used=False,
        )

    # Generate answer (try LLM, fallback to rule-based response)
    detected_skills = extract_basic_skills_from_context(combined_context)
    answer, provider, fallback_used = generate_ai_response(
        prompt=question,
        cv_context=combined_context,
        task="assistant",
        detected_skills=detected_skills,
        job_data=job_data,
        history=history,
    )
    evidence_block = format_cv_evidence(chunks)
    if evidence_block:
        answer = f"{answer}\n\n{evidence_block}"

    # Add assistant response to history
    add_to_conversation(session_id, cv_id, "assistant", answer, anonymous_user_id=anonymous_user_id)

    # Build response
    sources = [
        AssistantSource(
            section=chunk["section"],
            text=chunk["text"],
            score=chunk["score"],
        )
        for chunk in chunks
    ]
    if job_context and job_context.strip():
        sources.append(
            AssistantSource(
                section="target_job",
                text=job_context.strip(),
                score=None,
            )
        )

    return AssistantQueryResponse(
        session_id=session_id,
        answer=answer,
        retrieved_context=combined_context,
        sources=sources,
        intent="assistant",
        provider=provider,
        fallback_used=fallback_used,
    )
