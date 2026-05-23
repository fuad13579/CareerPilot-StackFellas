from pathlib import Path
from zipfile import BadZipFile

from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from pypdf import PdfReader
from pypdf.errors import PdfReadError


MAX_CV_FILE_SIZE_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 20


def extract_text_from_cv(file_path: Path) -> str:
    validate_file_size(file_path)
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)
    if suffix == ".docx":
        return extract_text_from_docx(file_path)

    raise ValueError("Only PDF and DOCX files are supported")


def extract_text_from_pdf(file_path: Path) -> str:
    try:
        reader = PdfReader(str(file_path))
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ValueError("PDF file is too large to process")
        text_parts = [page.extract_text() or "" for page in reader.pages]
        return validate_extracted_text("\n".join(text_parts))
    except PdfReadError as exc:
        raise ValueError(
            "Unable to read PDF file. The file may be corrupt or in an unsupported format."
        ) from exc


def extract_text_from_docx(file_path: Path) -> str:
    try:
        document = Document(str(file_path))
        text_parts = [paragraph.text for paragraph in document.paragraphs]
        return validate_extracted_text("\n".join(text_parts))
    except (BadZipFile, PackageNotFoundError) as exc:
        raise ValueError(
            "Unable to read DOCX file. The file may be corrupt or in an unsupported format."
        ) from exc


def validate_file_size(file_path: Path) -> None:
    if file_path.stat().st_size > MAX_CV_FILE_SIZE_BYTES:
        raise ValueError("Uploaded CV file is too large")


def validate_extracted_text(extracted_text: str) -> str:
    cleaned_text = extracted_text.strip()
    if not cleaned_text:
        raise ValueError("Could not extract readable text from the uploaded CV")
    return cleaned_text
