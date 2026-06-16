export interface PersistedCvSummary {
  filename: string;
  fileType: string;
  extractedText: string;
  analyzedAt?: string;
  profileSummary?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  projects?: string[];
}

const CV_STORAGE_KEY = "careerpilot_cv_summary";
const CV_ID_KEY = "careerpilot_cv_id";
const CV_SKILLS_KEY = "careerpilot_cv_skills";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getPersistedCvSummary(): PersistedCvSummary | null {
  if (typeof window === "undefined") return null;
  return safeParseJson<PersistedCvSummary>(window.localStorage.getItem(CV_STORAGE_KEY));
}

export function getPersistedCvId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CV_ID_KEY) || "";
}

export function getPersistedCvSkills(): string[] {
  if (typeof window === "undefined") return [];

  const skills = safeParseJson<string[]>(window.localStorage.getItem(CV_SKILLS_KEY));
  if (skills && skills.length > 0) return skills;

  const summary = getPersistedCvSummary();
  return summary?.skills || [];
}

export function hasPersistedCv(): boolean {
  const summary = getPersistedCvSummary();
  if (summary) return true;
  return getPersistedCvId().length > 0 || getPersistedCvSkills().length > 0;
}

export function persistCvSnapshot(summary: PersistedCvSummary, cvId: string): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(summary));
  window.localStorage.setItem(CV_ID_KEY, cvId);
  window.localStorage.setItem(CV_SKILLS_KEY, JSON.stringify(summary.skills || []));
}

export function clearPersistedCvSnapshot(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(CV_STORAGE_KEY);
  window.localStorage.removeItem(CV_ID_KEY);
  window.localStorage.removeItem(CV_SKILLS_KEY);
}
