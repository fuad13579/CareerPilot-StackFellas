type CvEntrySectionName = "experience" | "education";

const SECTION_ALIASES: Record<CvEntrySectionName | "skills" | "projects" | "other", string[]> = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "career history",
  ],
  education: [
    "education",
    "academic background",
    "academic qualifications",
    "qualifications",
  ],
  skills: ["skills", "technical skills", "core skills", "key skills", "technologies", "tech stack"],
  projects: ["projects", "project experience", "academic projects", "personal projects", "selected projects"],
  other: ["profile summary", "summary", "certifications", "achievements", "interests"],
};

const MONTH_PATTERN = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)";
const ROLE_TERMS = [
  "analyst",
  "assistant",
  "consultant",
  "developer",
  "engineer",
  "intern",
  "lead",
  "manager",
  "trainee",
  "specialist",
];
const ROLE_PREFIX_TERMS = [
  "backend",
  "frontend",
  "full stack",
  "full-stack",
  "data",
  "software",
  "web",
  "mobile",
  "cloud",
  "ai",
  "machine learning",
];

export function extractSectionEntriesWithFallback(
  value: unknown,
  sectionName: CvEntrySectionName,
  extractedText?: string
): string[] {
  const directEntries = extractSectionEntries(value, sectionName);
  if (directEntries.length > 0) {
    return directEntries;
  }

  const recoveredSection = extractNamedSectionFromText(extractedText, sectionName);
  if (!recoveredSection) {
    return [];
  }

  return extractSectionEntries(recoveredSection, sectionName);
}

export function extractSectionEntries(value: unknown, sectionName: CvEntrySectionName): string[] {
  if (typeof value !== "string") return [];

  const text = normalizeEntryBoundaries(value.replace(/\r\n/g, "\n").trim(), sectionName);
  if (!text) return [];

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isKnownSectionHeading(line));

  const entries: string[] = [];
  let currentEntry: string[] = [];

  for (const line of lines) {
    const startsNewEntry =
      sectionName === "experience"
        ? isExperienceHeader(line) && currentEntry.length > 0
        : isEducationHeader(line) && currentEntry.length > 0;

    if (startsNewEntry) {
      entries.push(currentEntry.join("\n").trim());
      currentEntry = [line];
      continue;
    }

    currentEntry.push(line);
  }

  if (currentEntry.length > 0) {
    entries.push(currentEntry.join("\n").trim());
  }

  return entries.length > 0 ? entries : lines;
}

function normalizeEntryBoundaries(text: string, sectionName: CvEntrySectionName): string {
  let normalized = text
    .replace(/[\u2022\u25aa\u25cf\u25e6\uf0b7]\s*/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n");

  if (sectionName === "experience") {
    normalized = mergeWrappedExperienceHeaders(normalized);
    normalized = insertInlineExperienceBoundaries(normalized);
  }

  return normalized.trim();
}

function mergeWrappedExperienceHeaders(text: string): string {
  const lines = text.split("\n");
  const mergedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index]?.trim() || "";
    const nextLine = lines[index + 1]?.trim() || "";

    if (isDanglingRolePrefix(currentLine) && isExperienceHeaderContinuation(nextLine)) {
      mergedLines.push(`${currentLine} ${nextLine}`);
      index += 1;
      continue;
    }

    mergedLines.push(lines[index]);
  }

  return mergedLines.join("\n");
}

function isDanglingRolePrefix(line: string): boolean {
  const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
  return ROLE_PREFIX_TERMS.includes(normalized);
}

function isExperienceHeaderContinuation(line: string): boolean {
  const normalized = line.toLowerCase();
  const startsWithRoleTerm = ROLE_TERMS.some((term) => normalized.startsWith(term));
  return startsWithRoleTerm && isExperienceHeader(line);
}

function insertInlineExperienceBoundaries(text: string): string {
  const roleHeaderPattern =
    /([^\n])\s+([A-Z][A-Za-z&/().+# ]{2,80}\s*(?:\|| at | - )\s*[A-Z][A-Za-z0-9&/().+# ]{2,90}\s+(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+)?(?:19|20)\d{2}\b)/g;

  return text.replace(roleHeaderPattern, "$1\n$2");
}

function extractNamedSectionFromText(
  extractedText: string | undefined,
  sectionName: CvEntrySectionName
): string {
  if (!extractedText) return "";

  const targetAliases = SECTION_ALIASES[sectionName].map((alias) => normalizeHeading(alias));
  const allAliases = Array.from(
    new Set(Object.values(SECTION_ALIASES).flat().map((alias) => normalizeHeading(alias)))
  );

  const lines = extractedText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  let collecting = false;
  const collected: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (collecting && collected.length > 0) {
        collected.push("");
      }
      continue;
    }

    const normalized = normalizeHeading(line);
    const isHeading = allAliases.includes(normalized);

    if (isHeading) {
      if (collecting) break;
      collecting = targetAliases.includes(normalized);
      continue;
    }

    if (collecting) {
      collected.push(line);
    }
  }

  return collected.join("\n").trim();
}

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, " ").trim();
}

function isKnownSectionHeading(line: string): boolean {
  const normalized = normalizeHeading(line);
  return Object.values(SECTION_ALIASES)
    .flat()
    .some((alias) => normalized === normalizeHeading(alias));
}

function isExperienceHeader(line: string): boolean {
  const normalized = line.toLowerCase();
  const hasDate =
    /\b(?:19|20)\d{2}\b/.test(line) ||
    new RegExp(`\\b${MONTH_PATTERN}\\b`).test(normalized) ||
    /\bpresent\b/.test(normalized);
  const hasRoleSeparator =
    normalized.includes(" at ") ||
    normalized.includes(" | ") ||
    normalized.includes(" - ");
  const hasRoleTerm = ROLE_TERMS.some((term) => normalized.includes(term));

  return hasRoleSeparator && (hasDate || hasRoleTerm);
}

function isEducationHeader(line: string): boolean {
  const normalized = line.toLowerCase();
  return /\b(?:19|20)\d{2}\b/.test(line) || /\b(b\.?sc|m\.?sc|bachelor|master|degree|university|college)\b/.test(normalized);
}
