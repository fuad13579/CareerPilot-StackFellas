from __future__ import annotations

from dataclasses import dataclass
import os

import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
PRIMARY_EMBEDDING_PROVIDER = "sentence-transformers"
PRIMARY_EMBEDDING_LABEL = "primary semantic embeddings"
FALLBACK_EMBEDDING_PROVIDER = "sklearn-hashing"
FALLBACK_EMBEDDING_LABEL = "demo-safe lightweight retrieval mode"


@dataclass
class EmbeddingResult:
    vectors: list[list[float]]
    provider: str
    model_name: str


class EmbeddingService:
    def __init__(self) -> None:
        self._sentence_transformer = None
        self._transformer_load_attempted = False
        self._hashing_vectorizer = HashingVectorizer(
            n_features=512,
            alternate_sign=False,
            norm="l2",
        )

    def embed_texts(self, texts: list[str]) -> EmbeddingResult:
        if not texts:
            return EmbeddingResult(vectors=[], provider="none", model_name="none")

        sentence_transformer = self._get_sentence_transformer()
        if sentence_transformer is not None:
            try:
                embeddings = sentence_transformer.encode(texts, convert_to_numpy=True)
                return EmbeddingResult(
                    vectors=embeddings.tolist(),
                    provider=PRIMARY_EMBEDDING_PROVIDER,
                    model_name=f"{EMBEDDING_MODEL_NAME} ({PRIMARY_EMBEDDING_LABEL})",
                )
            except Exception:
                self._disable_sentence_transformer()

        return self._embed_texts_with_hashing(texts)

    def embed_query(self, query: str) -> list[float]:
        sentence_transformer = self._get_sentence_transformer()
        if sentence_transformer is not None:
            try:
                embedding = sentence_transformer.encode([query], convert_to_numpy=True)
                return embedding[0].tolist()
            except Exception:
                self._disable_sentence_transformer()

        return self._embed_query_with_hashing(query)

    def cosine_similarity(self, query_vector: list[float], candidate_vectors: list[list[float]]) -> list[float]:
        if not candidate_vectors:
            return []

        query_array = np.array(query_vector, dtype=float)
        candidate_array = np.array(candidate_vectors, dtype=float)

        query_norm = np.linalg.norm(query_array)
        candidate_norms = np.linalg.norm(candidate_array, axis=1)
        denominator = candidate_norms * query_norm
        denominator[denominator == 0] = 1e-12

        similarities = candidate_array @ query_array / denominator
        return similarities.tolist()

    def _get_sentence_transformer(self):
        if not self._transformer_load_attempted:
            self._sentence_transformer = self._load_sentence_transformer()
            self._transformer_load_attempted = True
        return self._sentence_transformer

    def _disable_sentence_transformer(self) -> None:
        self._sentence_transformer = None
        self._transformer_load_attempted = True

    def _embed_texts_with_hashing(self, texts: list[str]) -> EmbeddingResult:
        matrix = self._hashing_vectorizer.transform(texts).toarray()
        return EmbeddingResult(
            vectors=matrix.tolist(),
            provider=FALLBACK_EMBEDDING_PROVIDER,
            model_name=f"HashingVectorizer-512 ({FALLBACK_EMBEDDING_LABEL})",
        )

    def _embed_query_with_hashing(self, query: str) -> list[float]:
        matrix = self._hashing_vectorizer.transform([query]).toarray()
        return matrix[0].tolist()

    def _load_sentence_transformer(self):
        try:
            from sentence_transformers import SentenceTransformer

            # Default to local-only so demo flows do not stall on model downloads
            # when SSL/network access is unavailable. If the model is cached
            # locally, SentenceTransformer still loads it; otherwise we fall back
            # immediately to hashing-based embeddings.
            local_only = (
                os.getenv("SENTENCE_TRANSFORMER_LOCAL_ONLY", "true").lower() == "true"
            )
            return SentenceTransformer(
                EMBEDDING_MODEL_NAME,
                local_files_only=local_only,
            )
        except Exception:
            return None


embedding_service = EmbeddingService()
