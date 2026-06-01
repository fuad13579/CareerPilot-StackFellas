"""AI Assistant service with RAG context and session memory."""
import os

from app.models.assistant_models import AssistantQueryResponse, AssistantSource
from app.services.llm_provider import generate_chat_completion
from app.services.vector_store_service import retrieve_relevant_chunks
from app.models.database_models import AssistantSession
from app.database import SessionLocal


# In-memory session storage: anonymous_user_id:session_id -> list of messages
SESSION_MEMORY: dict[str, list[dict[str, str]]] = {}
MAX_HISTORY_MESSAGES = 10


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
                # Sync to memory for consistency
                history = [{"role": s.role, "content": s.content} for s in sessions]
                # Keep only last MAX_HISTORY_MESSAGES
                history = history[-MAX_HISTORY_MESSAGES:]
                SESSION_MEMORY[_session_key(anonymous_user_id, session_id)] = history
                return history
        finally:
            if should_close:
                db.close()
    except Exception:
        pass

    # Fall back to in-memory
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
        from app.services.cv_chunking_service import load_processed_cv_sections
        from app.services.vector_store_service import build_cv_rag_index
        
        sections = load_processed_cv_sections(cv_id)
        chunks = [
            {"section": section_name, "text": section_content}
            for section_name, section_content in sections.items()
        ]
        # Build RAG with proper chunk_id for each chunk
        build_cv_rag_index(cv_id, chunks)
        
        # Now retrieve with the same query
        from app.services.vector_store_service import retrieve_relevant_chunks
        return retrieve_relevant_chunks(cv_id=cv_id, query=question, top_k=3)
    except Exception as exc:
        print(f"[RAG DEBUG] Failed to rebuild RAG: {exc}")
        return []


def process_assistant_query(cv_id: str, session_id: str, question: str, anonymous_user_id: str | None = None) -> AssistantQueryResponse:
    """Process an AI assistant query with RAG context and session memory."""
    # Add user message to history
    add_to_conversation(session_id, cv_id, "user", question, anonymous_user_id=anonymous_user_id)

    # Get conversation history
    history = get_conversation_history(session_id, anonymous_user_id=anonymous_user_id)

    # Retrieve relevant CV chunks
    chunks, context = get_cv_context(cv_id, question)

    # Generate answer (try LLM, fallback to template)
    answer = generate_answer_with_llm(context, question, history)
    if answer is None:
        answer = generate_fallback_answer(context, question)

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

    return AssistantQueryResponse(
        session_id=session_id,
        answer=answer,
        retrieved_context=context,
        sources=sources,
    )
