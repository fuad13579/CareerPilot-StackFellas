export interface AssistantJobContext {
  id: string;
  role: string;
  company: string;
  description?: string;
  requiredSkills?: string[];
  matchingSkills?: string[];
  missingSkills?: string[];
  matchReason?: string;
  fitScore?: number | null;
  trackerApplicationId?: string | null;
}

const ASSISTANT_JOB_CONTEXT_KEY = "careerpilot_assistant_job_context";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getAssistantJobContext(): AssistantJobContext | null {
  if (typeof window === "undefined") return null;
  return safeParseJson<AssistantJobContext>(
    window.localStorage.getItem(ASSISTANT_JOB_CONTEXT_KEY)
  );
}

export function setAssistantJobContext(context: AssistantJobContext): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ASSISTANT_JOB_CONTEXT_KEY, JSON.stringify(context));
  window.dispatchEvent(new Event("careerpilot_assistant_job_context_updated"));
}

export function clearAssistantJobContext(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ASSISTANT_JOB_CONTEXT_KEY);
  window.dispatchEvent(new Event("careerpilot_assistant_job_context_updated"));
}

export function buildAssistantJobContextText(context: AssistantJobContext): string {
  const lines = [
    `Role: ${context.role}`,
    `Company: ${context.company}`,
    context.fitScore !== null && context.fitScore !== undefined
      ? `Displayed fit score: ${context.fitScore}%`
      : null,
    context.matchReason ? `Match reason: ${context.matchReason}` : null,
    context.requiredSkills && context.requiredSkills.length > 0
      ? `Required skills: ${context.requiredSkills.join(", ")}`
      : null,
    context.matchingSkills && context.matchingSkills.length > 0
      ? `Matched skills: ${context.matchingSkills.join(", ")}`
      : null,
    context.missingSkills && context.missingSkills.length > 0
      ? `Missing skills: ${context.missingSkills.join(", ")}`
      : null,
    context.description ? `Job description: ${context.description}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}
