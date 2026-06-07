from pathlib import Path
from zipfile import BadZipFile

from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from pypdf import PdfReader
from pypdf.errors import PdfReadError


MAX_CV_FILE_SIZE_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 20
VALID_CV_SUFFIXES = {".pdf", ".docx"}
CV_KEYWORDS = (
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "resume",
    "curriculum vitae",
)

INVALID_CV_FILE_MESSAGE = "Please upload a valid CV file in PDF or DOCX format."
EMPTY_TEXT_MESSAGE = "Could not extract text from the uploaded CV."
NON_CV_MESSAGE = "This file does not look like a CV. Please upload a resume/CV."


def extract_text_from_cv(file_path: Path) -> str:
    validate_file_size(file_path)
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        extracted_text = extract_text_from_pdf(file_path)
    elif suffix == ".docx":
        extracted_text = extract_text_from_docx(file_path)
    else:
        raise ValueError(INVALID_CV_FILE_MESSAGE)

    validate_cv_likeness(extracted_text)
    return extracted_text


def extract_text_from_pdf(file_path: Path) -> str:
    try:
        reader = PdfReader(str(file_path))
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ValueError(EMPTY_TEXT_MESSAGE)
        text_parts = [page.extract_text() or "" for page in reader.pages]
        return validate_extracted_text("\n".join(text_parts))
    except PdfReadError as exc:
        raise ValueError(EMPTY_TEXT_MESSAGE) from exc


def extract_text_from_docx(file_path: Path) -> str:
    try:
        document = Document(str(file_path))
        text_parts = [paragraph.text for paragraph in document.paragraphs]
        return validate_extracted_text("\n".join(text_parts))
    except (BadZipFile, PackageNotFoundError) as exc:
        raise ValueError(EMPTY_TEXT_MESSAGE) from exc


def validate_file_size(file_path: Path) -> None:
    if file_path.stat().st_size > MAX_CV_FILE_SIZE_BYTES:
        raise ValueError("Uploaded CV file is too large. Maximum size is 10 MB.")


def validate_extracted_text(extracted_text: str) -> str:
    cleaned_text = extracted_text.strip()
    if not cleaned_text:
        raise ValueError(EMPTY_TEXT_MESSAGE)
    return cleaned_text


def validate_cv_likeness(extracted_text: str) -> None:
    normalized_text = extracted_text.lower()
    keyword_hits = sum(1 for keyword in CV_KEYWORDS if keyword in normalized_text)

    if keyword_hits < 2:
        raise ValueError(NON_CV_MESSAGE)
