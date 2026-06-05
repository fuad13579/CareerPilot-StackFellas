export const GOAL_CATEGORIES = [
  { id: "applications", label: "Job Applications", tone: "bg-blue-100 text-blue-700" },
  { id: "interview-prep", label: "Interview Prep", tone: "bg-amber-100 text-amber-700" },
  { id: "dsa", label: "DSA Practice", tone: "bg-violet-100 text-violet-700" },
  { id: "cv-update", label: "CV Update", tone: "bg-emerald-100 text-emerald-700" },
  { id: "networking", label: "Networking", tone: "bg-rose-100 text-rose-700" },
] as const;

const GOAL_PREFIX = /^\[goal:([a-z-]+)\]\s*/i;

export function parseGoalMetadata(description: string | null | undefined) {
  const source = description || "";
  const match = source.match(GOAL_PREFIX);
  const goalId = match?.[1]?.toLowerCase() || null;
  const cleanDescription = source.replace(GOAL_PREFIX, "").trim();
  const goal = GOAL_CATEGORIES.find((item) => item.id === goalId) || null;

  return {
    goalId,
    goal,
    cleanDescription: cleanDescription || "",
  };
}

export function encodeGoalDescription(
  description: string | undefined,
  goalId: string | undefined
) {
  const clean = (description || "").replace(GOAL_PREFIX, "").trim();
  if (!goalId) return clean || undefined;
  return `[goal:${goalId}]${clean ? ` ${clean}` : ""}`;
}
