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


def retrieve_relevant_chunks(cv_id: str, query: str, top_k: int = 3) -> list[dict]:
    index_data = load_cv_rag_index(cv_id)
    metadata = index_data["metadata"]
    chunks = metadata.get("chunks", [])
    if not chunks:
        return []

    query_vector = embedding_service.embed_query(query)
    chunk_vectors = index_data["embeddings"].tolist()
    similarity_scores = embedding_service.cosine_similarity(query_vector, chunk_vectors)

    ranked_results = []
    for idx, (chunk, score) in enumerate(zip(chunks, similarity_scores)):
        ranked_results.append(
            {
                "chunk_id": chunk.get("chunk_id", f"chunk_{idx}"),
                "section": chunk["section"],
                "text": chunk["text"],
                "score": round(float(score), 4),
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
