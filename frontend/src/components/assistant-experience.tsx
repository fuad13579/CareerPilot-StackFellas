"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CheckCircle2,
  FileText,
  Lightbulb,
  Loader2,
  Map,
  RefreshCcw,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import {
  ensureCareerPilotAssistantSessionId,
  getCareerPilotAssistantSessionId,
  getCareerPilotHeaders,
} from "./user-storage";
import {
  buildAssistantJobContextText,
  clearAssistantJobContext,
  getAssistantJobContext,
  type AssistantJobContext,
} from "./assistant-job-context";
import {
  getPersistedCvId,
  getPersistedCvSkills,
  getPersistedCvSummary,
} from "./cv-storage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestampLabel?: string | null;
  provider?: string | null;
  fallbackUsed?: boolean;
  sources?: Array<{
    section: string;
    text: string;
    score?: number | null;
  }>;
  retrievedContext?: string | null;
  intent?: "assistant" | "job_search";
  jobResults?: Array<{
    job_id: string;
    role: string;
    company: string;
    location?: string | null;
    salary?: string | null;
    source?: string | null;
    job_url?: string | null;
    fit_score?: number | null;
    required_skills?: string[];
    matched_skills?: string[];
    missing_skills?: string[];
    reason?: string | null;
  }>;
  jobSearchQuery?: string | null;
  jobSearchLocation?: string | null;
  jobSearchSource?: string | null;
}

interface QuickAction {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  prompt?: string;
  navigateTo?: string;
}

const NO_CV_MESSAGE = "Please upload your CV first.";
const SEED_ASSISTANT_MESSAGE: Message = {
  id: "assistant-seed",
  role: "assistant",
  content:
    "Hi, I'm your CareerPilot assistant. I can analyze your uploaded CV, check your readiness for a role, identify missing skills, build a roadmap, or draft a cover letter.",
  timestampLabel: null,
};

const quickActions: QuickAction[] = [
  { icon: Briefcase, label: "Job Hunt", prompt: "Find me remote backend internship jobs." },
  { icon: Briefcase, label: "Job Readiness", prompt: "Am I ready for this data engineer role?" },
  { icon: Lightbulb, label: "Skill Gaps", prompt: "What skills am I missing for a Google internship?" },
  { icon: Map, label: "Learning Roadmap", prompt: "Build me a 3-month roadmap to become job-ready" },
  { icon: FileText, label: "Cover Letter", prompt: "Draft a cover letter for this job posting based on my CV." },
];

function createMessage(role: Message["role"], content: string): Message {
  const now = new Date();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestampLabel: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const detail = "detail" in payload ? (payload as { detail?: unknown }).detail : undefined;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            const msg = (item as { msg?: unknown }).msg;
            return typeof msg === "string" ? msg : "";
          }
          return "";
        })
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
    if ("message" in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
  }

  return fallback;
}

export function AssistantExperience() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([SEED_ASSISTANT_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cvId, setCvId] = useState("");
  const [cvName, setCvName] = useState("");
  const [cvSkills, setCvSkills] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<AssistantJobContext | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [isRehydrating, setIsRehydrating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPersistentState = () => {
      const activeCvId = getPersistedCvId();
      const activeSessionId = ensureCareerPilotAssistantSessionId();
      const summary = getPersistedCvSummary();

      setCvId(activeCvId);
      setSessionId(activeSessionId);
      setCvName(summary?.filename || "");
      setCvSkills(getPersistedCvSkills().slice(0, 5));
      setSelectedJob(getAssistantJobContext());

      if (activeCvId) {
        setError((current) => (current === NO_CV_MESSAGE ? "" : current));
      }
    };

    syncPersistentState();
    window.addEventListener("storage", syncPersistentState);
    window.addEventListener("careerpilot_cv_updated", syncPersistentState);
    window.addEventListener("careerpilot_assistant_job_context_updated", syncPersistentState);

    return () => {
      window.removeEventListener("storage", syncPersistentState);
      window.removeEventListener("careerpilot_cv_updated", syncPersistentState);
      window.removeEventListener("careerpilot_assistant_job_context_updated", syncPersistentState);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const rehydrate = async () => {
      setIsRehydrating(true);
      try {
        const response = await fetch(
          `/api/assistant/history?session_id=${encodeURIComponent(sessionId)}`,
          {
            headers: {
              ...getCareerPilotHeaders(),
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );
        if (!response.ok) return;

        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;

        const history = Array.isArray(payload?.messages) ? payload.messages : [];
        if (history.length === 0) return;

        const rehydrated: Message[] = history
          .filter(
            (m: { role?: unknown; content?: unknown }) =>
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.trim().length > 0
          )
          .map(
            (
              m: { role: "user" | "assistant"; content: string; created_at?: string | null },
              index: number
            ) => ({
              id: `history-${index}-${m.content.slice(0, 8)}`,
              role: m.role,
              content: m.content,
              timestampLabel: m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null,
            })
          );

        if (rehydrated.length > 0) {
          setMessages(rehydrated);
        }
      } catch {
        // Keep the seed greeting when history cannot be restored.
      } finally {
        if (!cancelled) {
          setIsRehydrating(false);
        }
      }
    };

    void rehydrate();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    const activeCvId = getPersistedCvId();
    const activeSessionId =
      getCareerPilotAssistantSessionId() || ensureCareerPilotAssistantSessionId();

    if (!activeCvId) {
      setError(NO_CV_MESSAGE);
      return;
    }

    setError("");
    setMessages((prev) => [...prev, createMessage("user", trimmedQuestion)]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant/query", {
        method: "POST",
        headers: {
          ...getCareerPilotHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cv_id: activeCvId,
          session_id: activeSessionId,
          question: trimmedQuestion,
          job_id: selectedJob?.trackerApplicationId || undefined,
          job_context: selectedJob ? buildAssistantJobContextText(selectedJob) : undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Failed to get a response from the assistant.")
        );
      }

      if (typeof payload.session_id === "string" && payload.session_id.trim()) {
        window.localStorage.setItem("careerpilot_assistant_session_id", payload.session_id);
        setSessionId(payload.session_id);
      }

      const answer =
        typeof payload.answer === "string" && payload.answer.trim()
          ? payload.answer
          : "I could not generate a response for that request.";

      const provider =
        typeof payload.provider === "string" && payload.provider.trim()
          ? payload.provider.trim()
          : null;
      const sources = Array.isArray(payload.sources)
        ? payload.sources
            .filter(
              (source: { section?: unknown; text?: unknown; score?: unknown }) =>
                typeof source?.section === "string" && typeof source?.text === "string"
            )
            .map((source: { section: string; text: string; score?: number | null }) => ({
              section: source.section,
              text: source.text,
              score: typeof source.score === "number" ? source.score : null,
            }))
        : [];
      const retrievedContext =
        typeof payload.retrieved_context === "string" ? payload.retrieved_context : null;
      const jobResults = Array.isArray(payload.job_results)
        ? payload.job_results
            .filter(
              (job: { job_id?: unknown; role?: unknown; company?: unknown }) =>
                typeof job?.job_id === "string" &&
                typeof job?.role === "string" &&
                typeof job?.company === "string"
            )
            .map(
              (job: {
                job_id: string;
                role: string;
                company: string;
                location?: string | null;
                salary?: string | null;
                source?: string | null;
                job_url?: string | null;
                fit_score?: number | null;
                required_skills?: string[];
                matched_skills?: string[];
                missing_skills?: string[];
                reason?: string | null;
              }) => ({
                ...job,
                fit_score: typeof job.fit_score === "number" ? job.fit_score : null,
                required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
                matched_skills: Array.isArray(job.matched_skills) ? job.matched_skills : [],
                missing_skills: Array.isArray(job.missing_skills) ? job.missing_skills : [],
              })
            )
        : [];
      const intent = payload.intent === "job_search" ? "job_search" : "assistant";

      setMessages((prev) => [
        ...prev,
        {
          ...createMessage("assistant", answer),
          provider,
          fallbackUsed: Boolean(payload.fallback_used),
          sources,
          retrievedContext,
          intent,
          jobResults,
          jobSearchQuery:
            typeof payload.job_search_query === "string" ? payload.job_search_query : null,
          jobSearchLocation:
            typeof payload.job_search_location === "string" ? payload.job_search_location : null,
          jobSearchSource:
            typeof payload.job_search_source === "string" ? payload.job_search_source : null,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to get assistant response."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const nextQuestion = inputValue.trim();
    setInputValue("");
    await sendQuestion(nextQuestion);
  };

  const handleResetSession = () => {
    window.localStorage.removeItem("careerpilot_assistant_session_id");
    const nextSessionId = ensureCareerPilotAssistantSessionId();
    setSessionId(nextSessionId);
    setMessages([SEED_ASSISTANT_MESSAGE]);
    setError("");
  };

  const clearSelectedJob = () => {
    clearAssistantJobContext();
    setSelectedJob(null);
  };

  const hasConversationStarted = messages.length > 1;
  const hasCv = Boolean(cvId);

  return (
    <div className="flex min-h-[780px] flex-col rounded-[28px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-5 shadow-[0_18px_48px_rgba(15,23,42,.06)] lg:min-h-[860px]">
      <div className="mb-4 rounded-[24px] border border-[#DBEAFE] bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,.18),_transparent_38%),linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_58%,#F8FAFC_100%)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1D4ED8]">
              Personal AI Assistant
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#111827]">
              CV-grounded answers with session memory.
            </h2>
            <p className="mt-3 text-sm font-medium leading-7 text-[#64748B]">
              Ask about role readiness, benchmark skill gaps, personalized learning
              roadmaps, cover-letter drafting, or ask it to search jobs in natural
              language. The assistant uses your uploaded CV as the source of truth.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetSession}
            className="inline-flex items-center gap-2 rounded-full border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
          >
            <RefreshCcw size={14} />
            New Session
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
            <Zap size={12} />
            {hasCv ? "CV context active" : "Waiting for CV"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#0369A1]">
            <CheckCircle2 size={12} />
            Session memory enabled
          </span>
          {cvName && (
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#475569]">
              Using CV: {cvName}
            </span>
          )}
        </div>

        {cvSkills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
              Detected skills in context
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cvSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[#BFDBFE] bg-white px-3 py-1 text-xs font-semibold text-[#1E40AF]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedJob && (
          <div className="mt-4 rounded-2xl border border-[#BFDBFE] bg-white/90 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                  Active target job
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-[#0F172A]">
                  {selectedJob.role}
                </h3>
                <p className="text-sm font-semibold text-[#1D4ED8]">{selectedJob.company}</p>
              </div>
              <button
                type="button"
                onClick={clearSelectedJob}
                className="rounded-full border border-[#CBD5E1] px-3 py-1 text-xs font-semibold text-[#475569] transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                Clear job
              </button>
            </div>
            {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedJob.requiredSkills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#1E40AF]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {selectedJob.matchReason && (
              <p className="mt-3 text-sm text-[#475569]">{selectedJob.matchReason}</p>
            )}
          </div>
        )}
      </div>

      {!hasCv && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{NO_CV_MESSAGE}</p>
              <Link
                href="/upload"
                className="mt-1 inline-flex text-sm font-semibold text-amber-900 underline underline-offset-4"
              >
                Go to CV upload
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="min-h-[320px] flex-1 space-y-3 overflow-y-auto pr-1.5 lg:min-h-[420px]">
        {isRehydrating && (
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <Loader2 size={12} className="animate-spin" />
            <span>Restoring your previous chat...</span>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1D4ED8]">
                <Bot size={20} className="text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 lg:max-w-[78%] ${
                msg.role === "user"
                  ? "ml-auto bg-[#1D4ED8] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#374151]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm font-medium leading-8">{msg.content}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                {msg.role === "assistant" && msg.intent === "job_search" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                    <span className="size-1.5 rounded-full bg-sky-500" />
                    Job Hunter
                  </span>
                )}
                {msg.role === "assistant" &&
                  (msg.fallbackUsed ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700"
                      title="No LLM provider is configured. This answer was generated by CareerPilot's built-in CV analysis."
                    >
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Built-in CV analysis
                    </span>
                  ) : msg.provider ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"
                      title={`Answered by ${msg.provider.replace(/_/g, " ")}`}
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      AI - {msg.provider === "github_models" ? "GitHub Models" : msg.provider === "openrouter" ? "OpenRouter" : msg.provider}
                    </span>
                  ) : null)}

                {msg.timestampLabel && (
                  <span className={msg.role === "user" ? "text-blue-200" : "text-gray-400"}>
                    {msg.timestampLabel}
                  </span>
                )}
              </div>

              {msg.role === "assistant" && msg.jobResults && msg.jobResults.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#E0F2FE] bg-[#F8FCFF] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0369A1]">
                      Live Job Matches
                    </p>
                    {msg.jobSearchQuery && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0F172A]">
                        {msg.jobSearchQuery}
                      </span>
                    )}
                    {msg.jobSearchLocation && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                        {msg.jobSearchLocation}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {msg.jobResults.slice(0, 5).map((job) => (
                      <div key={job.job_id} className="rounded-lg border border-[#DBEAFE] bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#0F172A]">{job.role}</p>
                            <p className="text-xs font-semibold text-[#1D4ED8]">{job.company}</p>
                          </div>
                          {typeof job.fit_score === "number" && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {Math.round(job.fit_score)}% fit
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-[#64748B]">
                          {job.location && <span>{job.location}</span>}
                          {job.salary && <span>{job.salary}</span>}
                          {job.source && <span>{job.source}</span>}
                        </div>
                        {job.required_skills && job.required_skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {job.required_skills.slice(0, 4).map((skill) => (
                              <span
                                key={`${job.job_id}-${skill}`}
                                className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1E40AF]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        {job.job_url && (
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-xs font-semibold text-[#0369A1] underline underline-offset-4"
                          >
                            Open job
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                    Grounded In Your CV
                  </p>
                  <div className="mt-2 space-y-2">
                    {msg.sources.slice(0, 3).map((source, index) => (
                      <div key={`${source.section}-${index}`} className="rounded-lg bg-white p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0F172A]">{source.section}</span>
                          {typeof source.score === "number" && (
                            <span className="text-[11px] font-semibold text-[#64748B]">
                              score {source.score.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-[#475569]">
                          {source.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gray-100">
                <User size={20} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1D4ED8]">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
              <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
              <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
              <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!hasConversationStarted && (
        <div className="mb-3 mt-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            Start with benchmark prompts
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setInputValue("");
                  if (action.navigateTo) {
                    router.push(action.navigateTo);
                  } else if (action.prompt) {
                    const prompt =
                      selectedJob && action.label === "Job Readiness"
                        ? `Am I ready for the ${selectedJob.role} role at ${selectedJob.company}?`
                        : selectedJob && action.label === "Skill Gaps"
                          ? `What skills am I missing for the ${selectedJob.role} role at ${selectedJob.company}?`
                          : selectedJob && action.label === "Cover Letter"
                            ? `Draft a cover letter for the ${selectedJob.role} role at ${selectedJob.company} based on my CV.`
                            : action.prompt;
                    if (prompt) {
                      void sendQuestion(prompt);
                    }
                  }
                }}
                disabled={!hasCv || isLoading}
                className="flex items-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white p-3.5 text-left transition hover:border-[#1D4ED8] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <action.icon size={18} className="text-[#1D4ED8]" />
                <span className="text-sm font-bold text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-2.5 transition focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-blue-100">
          <Sparkles size={18} className="shrink-0 text-[#1D4ED8]" />
          <input
            className="flex-1 bg-transparent text-base font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Ask about your CV, or say: find me remote React internships..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!hasCv || isLoading}
          />
          <button
            type="submit"
            disabled={!hasCv || isLoading || !inputValue.trim()}
            className="rounded-full bg-[#1D4ED8] p-2 text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>

      <p className="mt-3 text-center text-xs font-medium text-gray-400">
        Answers are grounded in your uploaded CV and current session context.
      </p>

      {sessionId && messages.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#1D4ED8]">
          <Zap size={12} />
          <span>
            Session context active: CareerPilot will remember this conversation while you continue chatting.
          </span>
        </div>
      )}
    </div>
  );
}
