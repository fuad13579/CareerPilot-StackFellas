from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.services.cv_extraction_service import extract_text_from_cv


router = APIRouter()

UPLOAD_DIRECTORY = Path(__file__).resolve().parent.parent / "storage" / "uploaded_cvs"
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


class CVUploadResponse(BaseModel):
    message: str
    cv_id: str
    filename: str
    file_type: str
    extracted_text: str


@router.post("/upload", response_model=CVUploadResponse)
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

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CV file is empty",
        )

    saved_path.write_bytes(file_bytes)

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
        extracted_text=extracted_text,
    )
