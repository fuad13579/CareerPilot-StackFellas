from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from pydantic import BaseModel
import os
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import CVProfile
from app.services.cv_extraction_service import (
    MAX_CV_FILE_SIZE_BYTES,
    extract_text_from_cv,
)
from app.services.cv_chunking_service import load_processed_cv_sections, save_processed_cv
from app.services.fit_score import extract_skills
from app.services.user_context_service import require_anonymous_user_id


router = APIRouter()

UPLOAD_DIRECTORY = Path(__file__).resolve().parent.parent / "storage" / "uploaded_cvs"
ALLOWED_UPLOAD_TYPES = {
    ".pdf": {"application/pdf"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
}
CHUNK_SIZE = 64 * 1024
INCLUDE_EXTRACTED_TEXT = os.getenv(
    "INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE",
    "true",
).lower() == "true"
INVALID_CV_FILE_MESSAGE = "Please upload a valid CV file in PDF or DOCX format."


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
async def upload_cv(
    file: UploadFile = File(...),
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> CVUploadResponse:
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_CV_FILE_MESSAGE,
        )

    suffix = Path(file.filename).suffix.lower()
    content_type = (file.content_type or "").lower()
    allowed_mime_types = ALLOWED_UPLOAD_TYPES.get(suffix)
    if not allowed_mime_types or content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_CV_FILE_MESSAGE,
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
                if total_size > MAX_CV_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Uploaded CV file is too large. Maximum size is 5 MB.",
                    )

                output_file.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from the uploaded CV.",
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
                anonymous_user_id=anonymous_user_id,
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
def get_cv_sections(
    cv_id: str,
    x_careerpilot_user_id: str | None = Header(default=None, alias="x-careerpilot-user-id"),
) -> CVSectionsResponse:
    anonymous_user_id = require_anonymous_user_id(x_careerpilot_user_id)

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        profile = db.query(CVProfile).filter(
            CVProfile.cv_id == cv_id,
            CVProfile.anonymous_user_id == anonymous_user_id,
        ).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This CV does not belong to the current CareerPilot profile.",
            )

        sections = load_processed_cv_sections(cv_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    finally:
        db.close()

    return CVSectionsResponse(cv_id=cv_id, sections=sections)
