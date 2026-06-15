import json
import re
from pathlib import Path


SECTION_NAMES = ["skills", "education", "experience", "projects", "other"]
DEFAULT_MAX_CHUNK_CHARS = 800
DEFAULT_CHUNK_OVERLAP_CHARS = 120
SECTION_ALIASES = {
    "skills": [
        "skills",
        "technical skills",
        "core skills",
        "key skills",
        "competencies",
        "technologies",
        "tech stack",
    ],
    "education": [
        "education",
        "academic background",
        "academic qualifications",
        "qualifications",
    ],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "career history",
    ],
    "projects": [
        "projects",
        "academic projects",
        "personal projects",
        "professional projects",
        "selected projects",
    ],
}
PROCESSED_CV_DIRECTORY = (
    Path(__file__).resolve().parent.parent / "storage" / "processed_cvs"
)


def get_processed_cv_text_path(cv_id: str) -> Path:
    return PROCESSED_CV_DIRECTORY / f"{cv_id}.txt"


def get_processed_cv_sections_path(cv_id: str) -> Path:
    return PROCESSED_CV_DIRECTORY / f"{cv_id}_sections.json"


def save_processed_cv(cv_id: str, extracted_text: str) -> dict[str, str]:
    PROCESSED_CV_DIRECTORY.mkdir(parents=True, exist_ok=True)

    text_path = get_processed_cv_text_path(cv_id)
    text_path.write_text(extracted_text, encoding="utf-8")

    sections = split_cv_into_sections(extracted_text)
    sections_path = get_processed_cv_sections_path(cv_id)
    sections_path.write_text(json.dumps(sections, indent=2), encoding="utf-8")

    return sections


def load_processed_cv_text(cv_id: str) -> str:
    text_path = get_processed_cv_text_path(cv_id)
    if not text_path.exists():
        raise FileNotFoundError(f"Processed CV text not found for cv_id '{cv_id}'")
    return text_path.read_text(encoding="utf-8")


def load_processed_cv_sections(cv_id: str) -> dict[str, str]:
    sections_path = get_processed_cv_sections_path(cv_id)
    if sections_path.exists():
        return json.loads(sections_path.read_text(encoding="utf-8"))

    text = load_processed_cv_text(cv_id)
    sections = split_cv_into_sections(text)
    sections_path.parent.mkdir(parents=True, exist_ok=True)
    sections_path.write_text(json.dumps(sections, indent=2), encoding="utf-8")
    return sections


def split_cv_into_sections(extracted_text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {name: [] for name in SECTION_NAMES}
    current_section = "other"

    for raw_line in extracted_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        matched_section, inline_content = match_section_heading(line)
        if matched_section:
            current_section = matched_section
            if inline_content:
                sections[current_section].append(inline_content)
            continue

        sections[current_section].append(line)

    return {
        section_name: "\n".join(content).strip()
        for section_name, content in sections.items()
    }


def match_section_heading(line: str) -> tuple[str | None, str]:
    normalized_line = normalize_heading(line)

    for section_name, aliases in SECTION_ALIASES.items():
        for alias in aliases:
            if normalized_line == normalize_heading(alias):
                return section_name, ""

            inline_match = re.match(
                rf"^{re.escape(alias)}\s*[:\-]\s*(.+)$",
                line,
                flags=re.IGNORECASE,
            )
            if inline_match:
                return section_name, inline_match.group(1).strip()

    return None, ""


def normalize_heading(value: str) -> str:
    return re.sub(r"[^a-z]+", " ", value.lower()).strip()


def create_cv_chunks(
    cv_id: str,
    sections: dict[str, str],
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    overlap_chars: int = DEFAULT_CHUNK_OVERLAP_CHARS,
) -> list[dict]:
    chunks: list[dict] = []

    for section_name in SECTION_NAMES:
        section_text = sections.get(section_name, "").strip()
        if not section_text:
            continue

        chunk_texts = split_text_into_chunks(
            section_text,
            max_chunk_chars=max_chunk_chars,
            overlap_chars=overlap_chars,
        )
        for index, chunk_text in enumerate(chunk_texts):
            chunks.append(
                {
                    "chunk_id": f"{cv_id}_{section_name}_{index}",
                    "cv_id": cv_id,
                    "section": section_name,
                    "text": chunk_text,
                    "metadata": {"source": "uploaded_cv"},
                }
            )

    return chunks


def split_text_into_chunks(
    text: str,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    overlap_chars: int = DEFAULT_CHUNK_OVERLAP_CHARS,
) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    if not paragraphs:
        paragraphs = [line.strip() for line in text.splitlines() if line.strip()]

    atomic_units: list[str] = []
    for paragraph in paragraphs:
        atomic_units.extend(split_paragraph_into_units(paragraph))

    if len(atomic_units) == 1 and len(atomic_units[0]) > max_chunk_chars:
        return split_long_text_with_overlap(
            atomic_units[0],
            max_chunk_chars=max_chunk_chars,
            overlap_chars=overlap_chars,
        )

    return pack_units_into_chunks(
        atomic_units,
        max_chunk_chars=max_chunk_chars,
        overlap_chars=overlap_chars,
    )


def split_paragraph_into_units(paragraph: str) -> list[str]:
    lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
    if len(lines) > 1 and sum(is_bullet_like(line) for line in lines) >= max(1, len(lines) // 2):
        return lines
    return [paragraph]


def pack_units_into_chunks(
    units: list[str],
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    overlap_chars: int = DEFAULT_CHUNK_OVERLAP_CHARS,
) -> list[str]:
    if not units:
        return []

    normalized_units: list[str] = []
    for unit in units:
        if len(unit) > max_chunk_chars:
            normalized_units.extend(split_long_text(unit, max_chunk_chars=max_chunk_chars))
        else:
            normalized_units.append(unit)

    chunks: list[str] = []
    current_units: list[str] = []

    for unit in normalized_units:
        projected_length = joined_length(current_units + [unit])
        if current_units and projected_length > max_chunk_chars:
            chunks.append("\n".join(current_units).strip())
            current_units = build_overlap_units(
                current_units,
                max_overlap_chars=overlap_chars,
                max_chunk_chars=max_chunk_chars,
            )

        projected_length = joined_length(current_units + [unit])
        if current_units and projected_length > max_chunk_chars:
            chunks.append("\n".join(current_units).strip())
            current_units = []

        current_units.append(unit)

    if current_units:
        chunks.append("\n".join(current_units).strip())

    return chunks


def build_overlap_units(
    units: list[str],
    max_overlap_chars: int,
    max_chunk_chars: int,
) -> list[str]:
    if max_overlap_chars <= 0 or not units:
        return []

    overlap_units: list[str] = []
    for unit in reversed(units):
        if len(unit) > max_chunk_chars:
            break
        projected_length = joined_length([unit] + overlap_units)
        if overlap_units and projected_length > max_overlap_chars:
            break
        overlap_units.insert(0, unit)

    return overlap_units


def joined_length(units: list[str]) -> int:
    if not units:
        return 0
    return len("\n".join(units))


def split_long_text(
    text: str,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
) -> list[str]:
    sentences = split_into_sentences(text)
    if len(sentences) <= 1:
        return split_long_text_by_words(text, max_chunk_chars=max_chunk_chars)

    chunks: list[str] = []
    current_sentences: list[str] = []

    for sentence in sentences:
        if len(sentence) > max_chunk_chars:
            if current_sentences:
                chunks.append(" ".join(current_sentences).strip())
                current_sentences = []
            chunks.extend(split_long_text_by_words(sentence, max_chunk_chars=max_chunk_chars))
            continue

        projected = len(" ".join(current_sentences + [sentence]).strip())
        if current_sentences and projected > max_chunk_chars:
            chunks.append(" ".join(current_sentences).strip())
            current_sentences = [sentence]
            continue

        current_sentences.append(sentence)

    if current_sentences:
        chunks.append(" ".join(current_sentences).strip())

    return chunks


def split_long_text_by_words(
    text: str,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    current_words: list[str] = []
    current_length = 0

    for word in words:
        projected_length = current_length + len(word) + (1 if current_words else 0)
        if current_words and projected_length > max_chunk_chars:
            chunks.append(" ".join(current_words))
            current_words = [word]
            current_length = len(word)
            continue

        current_words.append(word)
        current_length = projected_length

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks


def split_long_text_with_overlap(
    text: str,
    max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS,
    overlap_chars: int = DEFAULT_CHUNK_OVERLAP_CHARS,
) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(words):
        current_words: list[str] = []
        current_length = 0
        end = start

        while end < len(words):
            word = words[end]
            projected_length = current_length + len(word) + (1 if current_words else 0)
            if current_words and projected_length > max_chunk_chars:
                break
            current_words.append(word)
            current_length = projected_length
            end += 1

        chunks.append(" ".join(current_words))
        if end >= len(words):
            break

        overlap_start = end
        while overlap_start > start:
            candidate_length = len(" ".join(words[overlap_start - 1:end]))
            if overlap_start < end and candidate_length > overlap_chars:
                break
            overlap_start -= 1

        start = overlap_start if start < overlap_start < end else end

    return chunks


def split_into_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part.strip() for part in parts if part.strip()]


def is_bullet_like(line: str) -> bool:
    return bool(re.match(r"^([\-*]|\u2022|[0-9]+[\.)])\s+", line))
