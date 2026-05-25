"""AI Assistant service with RAG context and session memory."""
import os
from dataclasses import dataclass

from app.models.assistant_models import AssistantQueryResponse, AssistantSource
from app.services.vector_store_service import retrieve_relevant_chunks
from app.models.database_models import AssistantSession
from app.database import SessionLocal


# In-memory session storage: session_id -> list of messages
SESSION_MEMORY: dict[str, list[dict[str, str]]] = {}
MAX_HISTORY_MESSAGES = 10


@dataclass
class ConversationMessage:
    """Single message in a conversation."""

    role: str
    content: str


def get_conversation_history(session_id: str) -> list[dict[str, str]]:
    """Get conversation history for a session."""
    # Try to load from database first
    try:
        db = SessionLocal()
        try:
            session = db.query(AssistantSession).filter(AssistantSession.session_id == session_id).first()
            if session and session.messages:
                # Sync to memory for consistency
                SESSION_MEMORY[session_id] = session.messages
                return session.messages
        finally:
            db.close()
    except Exception:
        pass

    # Fall back to in-memory
    return SESSION_MEMORY.get(session_id, [])


def add_to_conversation(session_id: str, role: str, content: str) -> None:
    """Add a message to the conversation history."""
    if session_id not in SESSION_MEMORY:
        SESSION_MEMORY[session_id] = []

    SESSION_MEMORY[session_id].append({"role": role, "content": content})

    # Keep only the last MAX_HISTORY_MESSAGES to avoid memory bloat
    if len(SESSION_MEMORY[session_id]) > MAX_HISTORY_MESSAGES:
        SESSION_MEMORY[session_id] = SESSION_MEMORY[session_id][-MAX_HISTORY_MESSAGES:]

    # Also save to database for persistence
    try:
        db = SessionLocal()
        try:
            session = db.query(AssistantSession).filter(AssistantSession.session_id == session_id).first()
            if session:
                # Append to existing messages
                existing_messages = session.messages.copy() if session.messages else []
                existing_messages.append({"role": role, "content": content})
                # Keep only last MAX_HISTORY_MESSAGES
                session.messages = existing_messages[-MAX_HISTORY_MESSAGES:]
            else:
                # Create new session
                session = AssistantSession(
                    session_id=session_id,
                    messages=[{"role": role, "content": content}]
                )
                db.add(session)
            db.commit()
        finally:
            db.close()
    except Exception:
        # Don't break functionality if database save fails
        pass


def generate_answer_with_llm(context: str, question: str, history: list[dict]) -> str | None:
    """Generate answer using OpenAI or Anthropic LLM API."""
    # Try OpenAI first
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            return _generate_with_openai(openai_key, context, question, history)
        except Exception:
            pass

    # Try Anthropic
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            return _generate_with_anthropic(anthropic_key, context, question, history)
        except Exception:
            pass

    return None


def _generate_with_openai(api_key: str, context: str, question: str, history: list[dict]) -> str:
    """Generate answer using OpenAI API."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    # Build messages with history
    messages = [
        {
            "role": "system",
            "content": f"""You are a helpful career assistant. Answer questions based ONLY on the provided CV context.
Do not invent or assume skills, experience, or qualifications that are not mentioned in the context.
If the context doesn't contain enough information, say so clearly.
Keep answers helpful, concise, and career-focused.""",
        }
    ]

    # Add conversation history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current question with context
    messages.append(
        {
            "role": "user",
            "content": f"""CV Context:
{context}

Question: {question}""",
        }
    )

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        messages=messages,
        max_tokens=500,
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()


def _generate_with_anthropic(api_key: str, context: str, question: str, history: list[dict]) -> str:
    """Generate answer using Anthropic API."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = """You are a helpful career assistant. Answer questions based ONLY on the provided CV context.
Do not invent or assume skills, experience, or qualifications that are not mentioned in the context.
If the context doesn't contain enough information, say so clearly.
Keep answers helpful, concise, and career-focused."""

    # Build conversation for Anthropic
    conversation = []
    for msg in history:
        conversation.append({"role": msg["role"], "content": msg["content"]})
    conversation.append({"role": "user", "content": f"CV Context:\n{context}\n\nQuestion: {question}"})

    response = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
        system=system_prompt,
        messages=conversation,
        max_tokens=500,
    )

    return response.content[0].text.strip()


def generate_fallback_answer(context: str, question: str) -> str:
    """Generate a simple template-based answer when no LLM is available."""
    if not context.strip():
        return (
            "I couldn't find relevant information in your CV to answer this question. "
            "Please ensure you've uploaded a CV and built the RAG index before asking questions. "
            "You can do this by:\n"
            "1. Uploading your CV via POST /api/cv/upload\n"
            "2. Building the RAG index via POST /api/rag/build\n"
            "3. Then asking your question here"
        )

    # Extract key information from context
    lines = context.split("\n")
    relevant_text = "\n".join(line.strip() for line in lines if line.strip())[:500]

    return (
        f"Based on your CV context, I found relevant information:\n\n"
        f"{relevant_text}...\n\n"
        f"To provide a more detailed answer about your career readiness, "
        f"please configure an AI provider (OPENAI_API_KEY or ANTHROPIC_API_KEY) in your environment. "
        f"The AI assistant will then provide personalized insights based on your full CV profile."
    )


def get_cv_context(cv_id: str, question: str) -> tuple[list[dict], str]:
    """Retrieve relevant CV chunks for a question using RAG."""
    try:
        chunks = retrieve_relevant_chunks(cv_id=cv_id, query=question, top_k=3)
    except FileNotFoundError:
        return [], ""

    context = "\n\n".join(chunk["text"] for chunk in chunks)
    return chunks, context


def process_assistant_query(cv_id: str, session_id: str, question: str) -> AssistantQueryResponse:
    """Process an AI assistant query with RAG context and session memory."""
    # Add user message to history
    add_to_conversation(session_id, "user", question)

    # Get conversation history
    history = get_conversation_history(session_id)

    # Retrieve relevant CV chunks
    chunks, context = get_cv_context(cv_id, question)

    # Generate answer (try LLM, fallback to template)
    answer = generate_answer_with_llm(context, question, history)
    if answer is None:
        answer = generate_fallback_answer(context, question)

    # Add assistant response to history
    add_to_conversation(session_id, "assistant", answer)

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