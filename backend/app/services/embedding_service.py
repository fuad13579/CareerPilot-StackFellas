from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


@dataclass
class EmbeddingResult:
    vectors: list[list[float]]
    provider: str
    model_name: str


class EmbeddingService:
    def __init__(self) -> None:
        self._sentence_transformer = self._load_sentence_transformer()
        self._hashing_vectorizer = HashingVectorizer(
            n_features=512,
            alternate_sign=False,
            norm="l2",
        )

    def embed_texts(self, texts: list[str]) -> EmbeddingResult:
        if not texts:
            return EmbeddingResult(vectors=[], provider="none", model_name="none")

        if self._sentence_transformer is not None:
            embeddings = self._sentence_transformer.encode(texts, convert_to_numpy=True)
            return EmbeddingResult(
                vectors=embeddings.tolist(),
                provider="sentence-transformers",
                model_name=EMBEDDING_MODEL_NAME,
            )

        matrix = self._hashing_vectorizer.transform(texts).toarray()
        return EmbeddingResult(
            vectors=matrix.tolist(),
            provider="sklearn-hashing",
            model_name="HashingVectorizer-512",
        )

    def embed_query(self, query: str) -> list[float]:
        result = self.embed_texts([query])
        return result.vectors[0]

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

    def _load_sentence_transformer(self):
        try:
            from sentence_transformers import SentenceTransformer

            return SentenceTransformer(EMBEDDING_MODEL_NAME, local_files_only=True)
        except Exception:
            return None


embedding_service = EmbeddingService()
