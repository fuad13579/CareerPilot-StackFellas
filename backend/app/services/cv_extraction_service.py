from pathlib import Path

from docx import Document
from pypdf import PdfReader


def extract_text_from_cv(file_path: Path) -> str:
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)
    if suffix == ".docx":
        return extract_text_from_docx(file_path)

    raise ValueError("Only PDF and DOCX files are supported")


def extract_text_from_pdf(file_path: Path) -> str:
    reader = PdfReader(str(file_path))
    text_parts = [page.extract_text() or "" for page in reader.pages]
    return validate_extracted_text("\n".join(text_parts))


def extract_text_from_docx(file_path: Path) -> str:
    document = Document(str(file_path))
    text_parts = [paragraph.text for paragraph in document.paragraphs]
    return validate_extracted_text("\n".join(text_parts))


def validate_extracted_text(extracted_text: str) -> str:
    cleaned_text = extracted_text.strip()
    if not cleaned_text:
        raise ValueError("Could not extract readable text from the uploaded CV")
    return cleaned_text
