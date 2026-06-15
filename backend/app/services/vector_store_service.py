from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from app.services.embedding_service import embedding_service


VECTOR_DB_DIRECTORY = Path(__file__).resolve().parent.parent / "storage" / "vector_db"


def get_vector_store_path(cv_id: str) -> Path:
    return VECTOR_DB_DIRECTORY / f"{cv_id}.json"


def get_vector_embeddings_path(cv_id: str) -> Path:
    return VECTOR_DB_DIRECTORY / f"{cv_id}_embeddings.npy"


def build_cv_rag_index(cv_id: str, chunks: list[dict]) -> dict:
    VECTOR_DB_DIRECTORY.mkdir(parents=True, exist_ok=True)

    chunk_texts = [chunk["text"] for chunk in chunks]
    embedding_result = embedding_service.embed_texts(chunk_texts)

    stored_chunks = []
    for idx, chunk in enumerate(chunks):
        stored_chunks.append(
            {
                "chunk_id": f"chunk_{idx}",
                **chunk,
            }
        )

    payload = {
        "cv_id": cv_id,
        "embedding_provider": embedding_result.provider,
        "embedding_model": embedding_result.model_name,
        "chunks": stored_chunks,
    }

    store_path = get_vector_store_path(cv_id)
    store_path.write_text(json.dumps(payload), encoding="utf-8")
    embeddings_path = get_vector_embeddings_path(cv_id)
    np.save(embeddings_path, np.array(embedding_result.vectors, dtype=np.float32))
    return payload


def load_cv_rag_index(cv_id: str) -> dict:
    store_path = get_vector_store_path(cv_id)
    embeddings_path = get_vector_embeddings_path(cv_id)
    if not store_path.exists():
        raise FileNotFoundError(f"RAG index not found for cv_id '{cv_id}'")

    metadata = json.loads(store_path.read_text(encoding="utf-8"))
    if embeddings_path.exists():
        embeddings = np.load(embeddings_path)
        return {
            "metadata": metadata,
            "embeddings": embeddings,
        }

    legacy_embeddings = extract_legacy_embeddings(metadata)
    if legacy_embeddings is None:
        raise FileNotFoundError(f"RAG index not found for cv_id '{cv_id}'")

    embeddings = np.array(legacy_embeddings, dtype=np.float32)
    np.save(embeddings_path, embeddings)

    for chunk in metadata.get("chunks", []):
        chunk.pop("embedding", None)
    store_path.write_text(json.dumps(metadata), encoding="utf-8")

    return {
        "metadata": metadata,
        "embeddings": embeddings,
    }


def retrieve_relevant_chunks(
    cv_id: str,
    query: str,
    top_k: int = 3,
    intent_override: str | None = None,
) -> list[dict]:
    index_data = load_cv_rag_index(cv_id)
    metadata = index_data["metadata"]
    chunks = metadata.get("chunks", [])
    if not chunks:
        return []

    query_vector = embedding_service.embed_query(query)
    chunk_vectors = index_data["embeddings"].tolist()
    similarity_scores = embedding_service.cosine_similarity(query_vector, chunk_vectors)
    query_intent = intent_override or detect_query_intent(query)

    ranked_results = []
    for idx, (chunk, score) in enumerate(zip(chunks, similarity_scores)):
        section = chunk["section"]
        section_boost = get_section_boost(section, query_intent)
        final_score = float(score) + section_boost
        ranked_results.append(
            {
                "chunk_id": chunk.get("chunk_id", f"chunk_{idx}"),
                "section": section,
                "text": chunk["text"],
                "score": round(final_score, 4),
                "base_score": round(float(score), 4),
                "section_boost": round(section_boost, 4),
            }
        )

    ranked_results.sort(key=lambda item: item["score"], reverse=True)
    return ranked_results[:top_k]


def extract_legacy_embeddings(metadata: dict) -> list[list[float]] | None:
    chunks = metadata.get("chunks", [])
    if not chunks:
        return []

    embeddings: list[list[float]] = []
    for chunk in chunks:
        embedding = chunk.get("embedding")
        if embedding is None:
            return None
        embeddings.append(embedding)

    return embeddings


def detect_query_intent(query: str) -> str:
    text = query.lower()

    if any(term in text for term in ("cover letter", "motivation letter", "application letter")):
        return "cover_letter"
    if any(term in text for term in ("education", "degree", "university", "college", "gpa", "academic")):
        return "education"
    if any(term in text for term in ("missing skill", "missing skills", "skill gap", "skills gap")):
        return "skills_gap"
    if any(term in text for term in ("ready", "readiness", "qualified", "fit for", "fit score", "experience for")):
        return "readiness"
    if any(term in text for term in ("skills", "tech stack", "technology", "tools")):
        return "skills_gap"
    return "general"


def get_section_boost(section: str, intent: str) -> float:
    boosts = {
        "skills_gap": {
            "skills": 0.12,
            "projects": 0.08,
        },
        "readiness": {
            "experience": 0.12,
            "projects": 0.08,
            "skills": 0.06,
        },
        "cover_letter": {
            "experience": 0.12,
            "projects": 0.08,
            "skills": 0.06,
        },
        "education": {
            "education": 0.12,
        },
    }
    if section == "other" and intent in {"skills_gap", "readiness", "cover_letter", "education"}:
        return -0.04
    return boosts.get(intent, {}).get(section, 0.0)
