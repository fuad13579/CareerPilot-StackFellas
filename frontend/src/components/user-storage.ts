const USER_ID_KEY = "careerpilot_user_id";
const ASSISTANT_SESSION_ID_KEY = "careerpilot_assistant_session_id";

function generateUserId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCareerPilotUserId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(USER_ID_KEY) || "";
}

export function getOrCreateCareerPilotUserId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;

  const userId = generateUserId();
  window.localStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

export function ensureCareerPilotUserId(): string {
  return getOrCreateCareerPilotUserId();
}

export function getCareerPilotHeaders(): HeadersInit {
  const userId = getOrCreateCareerPilotUserId();
  return userId ? { "x-careerpilot-user-id": userId } : {};
}

function generateAssistantSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cpassistant_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCareerPilotAssistantSessionId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ASSISTANT_SESSION_ID_KEY) || "";
}

export function getOrCreateCareerPilotAssistantSessionId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(ASSISTANT_SESSION_ID_KEY);
  if (existing) return existing;

  const sessionId = generateAssistantSessionId();
  window.localStorage.setItem(ASSISTANT_SESSION_ID_KEY, sessionId);
  return sessionId;
}

export function ensureCareerPilotAssistantSessionId(): string {
  return getOrCreateCareerPilotAssistantSessionId();
}
