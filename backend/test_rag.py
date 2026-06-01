# Test RAG retrieval
from app.services.vector_store_service import retrieve_relevant_chunks, build_cv_rag_index
from app.services.cv_chunking_service import load_processed_cv_sections
from app.models.database_models import CVProfile
from app.database import SessionLocal

db = SessionLocal()
profiles = db.query(CVProfile).all()
print(f"Found {len(profiles)} CV profiles")

# Try with the one that HAS RAG index
for profile in profiles:
    import os
    vec_json = os.path.exists(f"app/storage/vector_db/{profile.cv_id}.json")
    if vec_json:
        print(f"\nTesting with CV that has RAG: {profile.cv_id[:8]}...")
        try:
            chunks = retrieve_relevant_chunks(profile.cv_id, "What skills are listed?", top_k=3)
            print(f"Retrieved {len(chunks)} chunks")
            for i, c in enumerate(chunks):
                print(f"  Chunk {i+1}: section={c['section']}, score={c['score']}")
                print(f"    text={c['text'][:100]}...")
        except Exception as e:
            print(f"Error retrieving: {e}")
        
        # Try rebuilding RAG
        print("\nTrying to rebuild RAG from saved sections...")
        try:
            sections = load_processed_cv_sections(profile.cv_id)
            print(f"Loaded {len(sections)} sections: {list(sections.keys())}")
            chunks = [
                {"section": section_name, "text": section_content}
                for section_name, section_content in sections.items()
            ]
            result = build_cv_rag_index(profile.cv_id, chunks)
            print(f"Rebuilt RAG with {len(result.get('chunks', []))} chunks")
        except Exception as e:
            print(f"Error rebuilding: {e}")
        break

db.close()
