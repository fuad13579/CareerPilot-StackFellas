from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
import os
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import CVProfile
from app.services.cv_extraction_service import extract_text_from_cv
from app.services.cv_chunking_service import load_processed_cv_sections, save_processed_cv
from app.services.fit_score import extract_skills


router = APIRouter()

UPLOAD_DIRECTORY = Path(__file__).resolve().parent.parent / "storage" / "uploaded_cvs"
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
CHUNK_SIZE = 64 * 1024
INCLUDE_EXTRACTED_TEXT = os.getenv(
    "INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE",
    "true",
).lower() == "true"


class CVUploadResponse(BaseModel):
    message: str
    cv_id: str
    filename: str
    file_type: str
    extracted_text: str | None = None
    skills: list[str] = []


class CVSectionsResponse(BaseModel):
    cv_id: str
    sections: dict[str, str]


@router.post(
    "/upload",
    response_model=CVUploadResponse,
    response_model_exclude_none=True,
)
async def upload_cv(file: UploadFile = File(...)) -> CVUploadResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A CV file is required",
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported",
        )

    cv_id = str(uuid4())
    saved_filename = f"{cv_id}{suffix}"
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    saved_path = UPLOAD_DIRECTORY / saved_filename

    total_size = 0

    try:
        with saved_path.open("wb") as output_file:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break

                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Uploaded file is too large",
                    )

                output_file.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded CV file is empty",
            )
    except HTTPException:
        saved_path.unlink(missing_ok=True)
        raise

    try:
        extracted_text = extract_text_from_cv(saved_path)
    except ValueError as exc:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process uploaded CV",
        ) from exc

    # Extract skills from CV text
    extracted_skills = list(extract_skills(extracted_text))

    save_processed_cv(cv_id=cv_id, extracted_text=extracted_text)

    # Save CV metadata to database
    # Use the processed CV path (from cv_chunking_service)
    from app.services.cv_chunking_service import get_processed_cv_text_path
    processed_path = str(get_processed_cv_text_path(cv_id))
    
    try:
        db: Session = next(get_db())
        try:
            cv_profile = CVProfile(
                cv_id=cv_id,
                filename=file.filename,
                file_type=suffix.lstrip("."),
                file_path=str(saved_path),
                processed_text_path=processed_path,
            )
            db.add(cv_profile)
            db.commit()
        finally:
            db.close()
    except Exception:
        # Don't fail upload if database save fails
        pass

    return CVUploadResponse(
        message="CV uploaded and processed successfully",
        cv_id=cv_id,
        filename=file.filename,
        file_type=suffix.lstrip("."),
        extracted_text=extracted_text if INCLUDE_EXTRACTED_TEXT else None,
        skills=extracted_skills,
    )


@router.get("/{cv_id}/sections", response_model=CVSectionsResponse)
def get_cv_sections(cv_id: str) -> CVSectionsResponse:
    try:
        sections = load_processed_cv_sections(cv_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return CVSectionsResponse(cv_id=cv_id, sections=sections)
