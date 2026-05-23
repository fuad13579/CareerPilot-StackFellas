from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel
import os

from app.services.cv_extraction_service import extract_text_from_cv


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

    return CVUploadResponse(
        message="CV uploaded and processed successfully",
        cv_id=cv_id,
        filename=file.filename,
        file_type=suffix.lstrip("."),
        extracted_text=extracted_text if INCLUDE_EXTRACTED_TEXT else None,
    )
