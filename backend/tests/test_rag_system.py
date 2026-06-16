import json
from pathlib import Path

from app.services.cv_chunking_service import create_cv_chunks, split_cv_into_sections
from app.services import vector_store_service as rag_store
from app.services import assistant_service


def test_build_and_retrieve_rag_index_returns_relevant_chunk(monkeypatch, tmp_path):
    monkeypatch.setattr(rag_store, "VECTOR_DB_DIRECTORY", tmp_path)

    class FakeEmbeddingResult:
        vectors = [
            [1.0, 0.0],
            [0.0, 1.0],
        ]
        provider = "test"
        model_name = "test-model"

    monkeypatch.setattr(
        rag_store.embedding_service,
        "embed_texts",
        lambda texts: FakeEmbeddingResult(),
    )
    monkeypatch.setattr(
        rag_store.embedding_service,
        "embed_query",
        lambda query: [1.0, 0.0],
    )
    monkeypatch.setattr(
        rag_store.embedding_service,
        "cosine_similarity",
        lambda query_vector, candidate_vectors: [0.95, 0.1],
    )

    rag_store.build_cv_rag_index(
        "cv-rag-1",
        [
            {"section": "skills", "text": "Python FastAPI SQL"},
            {"section": "projects", "text": "Built a mobile game in Unity"},
        ],
    )

    chunks = rag_store.retrieve_relevant_chunks("cv-rag-1", "python backend", top_k=1)
    assert len(chunks) == 1
    assert chunks[0]["section"] == "skills"
    assert chunks[0]["text"] == "Python FastAPI SQL"


def test_create_cv_chunks_adds_overlap_for_long_sections():
    repeated_text = " ".join(f"token{i}" for i in range(220))
    chunks = create_cv_chunks(
        "cv-overlap-1",
        {"experience": repeated_text},
        max_chunk_chars=220,
        overlap_chars=60,
    )

    assert len(chunks) >= 2
    first_words = chunks[0]["text"].split()
    second_words = chunks[1]["text"].split()
    assert set(first_words[-8:]) & set(second_words[:12])


def test_split_cv_sections_keeps_project_experience_and_achievements_separate():
    sections = split_cv_into_sections(
        "\n".join(
            [
                "SKILLS",
                "Python, FastAPI, React",
                "PROJECT EXPERIENCE",
                "CareerPilot - AI Career Co-pilot | Full-Stack Project",
                "- Built a career platform.",
                "Task Manager API | Backend Project",
                "- Developed task endpoints.",
                "EXPERIENCE",
                "Student Developer / Team Lead - StackFellas",
                "- Led a 3-member team.",
                "ACHIEVEMENTS & INTERESTS",
                "- Built hackathon projects.",
            ]
        )
    )

    assert "PROJECT EXPERIENCE" not in sections["skills"]
    assert "CareerPilot" in sections["projects"]
    assert "Task Manager API" in sections["projects"]
    assert "ACHIEVEMENTS" not in sections["experience"]
    assert "Student Developer" in sections["experience"]
    assert "Built hackathon projects" in sections["other"]


def test_assistant_rebuilds_rag_from_saved_sections(monkeypatch):
    monkeypatch.setattr(
        "app.services.vector_store_service.retrieve_relevant_chunks",
        lambda cv_id, query, top_k=3: [
            {"section": "experience", "text": "Backend engineer at Acme", "score": 0.88}
        ],
    )
    monkeypatch.setattr(
        "app.services.cv_chunking_service.load_processed_cv_sections",
        lambda cv_id: {
            "experience": "Backend engineer at Acme",
            "skills": "Python FastAPI",
        },
    )

    built_payload = {}

    def fake_build(cv_id, chunks):
        built_payload["cv_id"] = cv_id
        built_payload["chunks"] = chunks
        return {}

    monkeypatch.setattr("app.services.vector_store_service.build_cv_rag_index", fake_build)

    chunks = assistant_service._rebuild_rag_from_saved_cv("cv-rag-2", "backend experience")
    assert chunks[0]["section"] == "experience"
    assert built_payload["cv_id"] == "cv-rag-2"
    assert any(chunk["section"] == "skills" for chunk in built_payload["chunks"])
    assert any("chunk_id" in chunk for chunk in built_payload["chunks"])


def test_retrieve_relevant_chunks_applies_small_section_boost(monkeypatch, tmp_path):
    monkeypatch.setattr(rag_store, "VECTOR_DB_DIRECTORY", tmp_path)

    class FakeEmbeddingResult:
        vectors = [
            [1.0, 0.0],
            [1.0, 0.0],
        ]
        provider = "test"
        model_name = "test-model"

    monkeypatch.setattr(
        rag_store.embedding_service,
        "embed_texts",
        lambda texts: FakeEmbeddingResult(),
    )
    monkeypatch.setattr(
        rag_store.embedding_service,
        "embed_query",
        lambda query: [1.0, 0.0],
    )
    monkeypatch.setattr(
        rag_store.embedding_service,
        "cosine_similarity",
        lambda query_vector, candidate_vectors: [0.82, 0.79],
    )

    rag_store.build_cv_rag_index(
        "cv-rag-boost-1",
        [
            {"section": "other", "text": "General summary text"},
            {"section": "experience", "text": "Worked on data pipelines and ETL"},
        ],
    )

    chunks = rag_store.retrieve_relevant_chunks(
        "cv-rag-boost-1",
        "Am I ready for a data engineer intern role?",
        top_k=1,
    )
    assert chunks[0]["section"] == "experience"
    assert chunks[0]["score"] > chunks[0]["base_score"]


def test_retrieve_relevant_chunks_penalizes_other_for_focused_queries(monkeypatch, tmp_path):
    monkeypatch.setattr(rag_store, "VECTOR_DB_DIRECTORY", tmp_path)

    class FakeEmbeddingResult:
        vectors = [
            [1.0, 0.0],
            [1.0, 0.0],
        ]
        provider = "test"
        model_name = "test-model"

    monkeypatch.setattr(
        rag_store.embedding_service,
        "embed_texts",
        lambda texts: FakeEmbeddingResult(),
    )
    monkeypatch.setattr(
        rag_store.embedding_service,
        "embed_query",
        lambda query: [1.0, 0.0],
    )
    monkeypatch.setattr(
        rag_store.embedding_service,
        "cosine_similarity",
        lambda query_vector, candidate_vectors: [0.92, 0.89],
    )

    rag_store.build_cv_rag_index(
        "cv-rag-other-penalty-1",
        [
            {"section": "other", "text": "Contact header text"},
            {"section": "skills", "text": "Python SQL FastAPI"},
        ],
    )

    chunks = rag_store.retrieve_relevant_chunks(
        "cv-rag-other-penalty-1",
        "What skills am I missing for a Google internship?",
        top_k=1,
    )
    assert chunks[0]["section"] == "skills"
    assert chunks[0]["section_boost"] > 0


def test_format_cv_evidence_prefers_useful_sections_over_other():
    evidence = assistant_service.format_cv_evidence(
        [
            {"section": "other", "text": "Name Email Phone GitHub", "score": 0.99},
            {"section": "skills", "text": "Python SQL FastAPI", "score": 0.8},
            {"section": "projects", "text": "Built a data dashboard", "score": 0.75},
            {"section": "experience", "text": "Led backend integration work", "score": 0.7},
        ],
        max_items=3,
    )

    assert "Experience:" in evidence
    assert "Projects:" in evidence
    assert "Skills:" in evidence
    assert "Other:" not in evidence


def test_cv_upload_reports_rag_warning_when_auto_build_fails(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.cv_routes.extract_text_from_cv",
        lambda file_path: (
            "Experience\nSoftware Engineer at Example Co\n"
            "Education\nBSc Computer Science\n"
            "Skills\nPython, FastAPI\n"
            "Projects\nJob tracker"
        ),
    )
    monkeypatch.setattr(
        "app.api.cv_routes.extract_skills",
        lambda extracted_text: {"python", "fastapi"},
    )
    monkeypatch.setattr(
        "app.api.cv_routes.save_processed_cv",
        lambda cv_id, extracted_text: {},
    )
    monkeypatch.setattr(
        "app.services.cv_chunking_service.get_processed_cv_text_path",
        lambda cv_id: Path(f"{cv_id}.txt"),
    )
    monkeypatch.setattr(
        "app.api.cv_routes.load_processed_cv_sections",
        lambda cv_id: {"skills": "Python FastAPI"},
    )

    def fail_build(cv_id, chunks):
        raise RuntimeError("embedding failure")

    monkeypatch.setattr("app.api.cv_routes.build_cv_rag_index", fail_build)

    response = client.post(
        "/api/cv/upload",
        headers={"x-careerpilot-user-id": "user-rag"},
        files={"file": ("resume.pdf", b"fake pdf bytes", "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rag_index_built"] is False
    assert "RAG index could not be built automatically" in data["rag_warning"]


def test_rag_status_reports_index_metadata(client, monkeypatch, tmp_path):
    cv_id = "cv-rag-status-1"
    vector_store_path = tmp_path / f"{cv_id}.json"
    embeddings_path = tmp_path / f"{cv_id}_embeddings.npy"
    sections_path = tmp_path / f"{cv_id}_sections.json"

    vector_store_path.write_text(
        json.dumps(
            {
                "cv_id": cv_id,
                "embedding_provider": "sentence-transformers",
                "embedding_model": "all-MiniLM-L6-v2",
                "chunks": [
                    {"section": "skills", "text": "Python FastAPI"},
                    {"section": "experience", "text": "Backend engineer at Acme"},
                ],
            }
        ),
        encoding="utf-8",
    )
    embeddings_path.write_bytes(b"fake")
    sections_path.write_text(json.dumps({"skills": "Python FastAPI"}), encoding="utf-8")

    monkeypatch.setattr("app.api.rag_routes.get_vector_store_path", lambda actual_cv_id: vector_store_path)
    monkeypatch.setattr("app.api.rag_routes.get_vector_embeddings_path", lambda actual_cv_id: embeddings_path)
    monkeypatch.setattr("app.api.rag_routes.get_processed_cv_sections_path", lambda actual_cv_id: sections_path)
    monkeypatch.setattr("app.api.rag_routes.require_cv_for_user", lambda db, actual_cv_id, user_id: object())

    response = client.get(
        f"/api/rag/status?cv_id={cv_id}",
        headers={"x-careerpilot-user-id": "user-rag-status"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["cv_id"] == cv_id
    assert data["index_exists"] is True
    assert data["embeddings_exists"] is True
    assert data["processed_sections_exists"] is True
    assert data["chunk_count"] == 2
    assert data["sections_indexed"] == ["experience", "skills"]
    assert data["embedding_provider"] == "sentence-transformers"
    assert data["embedding_model"] == "all-MiniLM-L6-v2"
    assert data["last_built_at"]
