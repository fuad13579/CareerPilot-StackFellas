"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  FileText,
  Lightbulb,
  Loader2,
  Map,
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
import { getPersistedCvId } from "./cv-storage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const NO_CV_MESSAGE = "Please upload your CV first.";

const quickActions = [
  { icon: Briefcase, label: "Job Readiness", prompt: "Am I ready for a frontend developer role?" },
  { icon: Lightbulb, label: "Skill Gaps", prompt: "What skills am I missing for my target roles?" },
  { icon: Map, label: "Learning Roadmap", prompt: "Build me a 3-month roadmap to become job-ready" },
  { icon: FileText, label: "Cover Letter", prompt: "Draft a cover letter for a job I'm interested in" },
];

function createMessage(role: Message["role"], content: string): Message {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date(),
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
  const [messages, setMessages] = useState<Message[]>([
    createMessage(
      "assistant",
      "Hi, I'm your CareerPilot assistant. I can analyze your uploaded CV, check your readiness for a role, identify missing skills, build a roadmap, or draft a cover letter."
    ),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cvId, setCvId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPersistentState = () => {
      const activeCvId = getPersistedCvId();
      const activeSessionId = ensureCareerPilotAssistantSessionId();

      setCvId(activeCvId);
      setSessionId(activeSessionId);

      if (activeCvId) {
        setError((current) => (current === NO_CV_MESSAGE ? "" : current));
      }
    };

    syncPersistentState();
    window.addEventListener("storage", syncPersistentState);
    window.addEventListener("careerpilot_cv_updated", syncPersistentState);

    return () => {
      window.removeEventListener("storage", syncPersistentState);
      window.removeEventListener("careerpilot_cv_updated", syncPersistentState);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) {
      return;
    }

    const activeCvId = getPersistedCvId();
    const activeSessionId = getCareerPilotAssistantSessionId() || ensureCareerPilotAssistantSessionId();

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

      setMessages((prev) => [...prev, createMessage("assistant", answer)]);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to get assistant response.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) {
      return;
    }

    const nextQuestion = inputValue.trim();
    setInputValue("");
    await sendQuestion(nextQuestion);
  };

  const hasConversationStarted = messages.length > 1;
  const hasCv = Boolean(cvId);

  return (
    <div className="flex h-[600px] flex-col -mt-2">
      <div className="mb-3 border-b border-gray-200 pb-3">
        <h2 className="text-base font-bold text-[#111827]">AI Career Assistant</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Ask about your CV, job readiness, skill gaps, roadmap, and applications.
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#1D4ED8]">
          <Zap size={10} />
          <span>{hasCv ? "CV context active. Session memory enabled." : "Upload a CV to enable personalized answers"}</span>
        </div>
      </div>

      {!hasCv && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{NO_CV_MESSAGE}</p>
              <Link href="/upload" className="mt-1 inline-flex text-sm font-semibold text-amber-900 underline underline-offset-4">
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

      <div className="flex-1 space-y-3 overflow-y-auto pr-1.5">
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
              className={`max-w-[75%] rounded-2xl p-4 ${
                msg.role === "user"
                  ? "ml-auto bg-[#1D4ED8] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#374151]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm font-medium leading-8">{msg.content}</p>
              <p
                className={`mt-2 text-xs ${
                  msg.role === "user" ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
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
        <div className="mb-3 mt-2 grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setInputValue("");
                void sendQuestion(action.prompt);
              }}
              disabled={!hasCv || isLoading}
              className="flex items-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white p-3.5 text-left transition hover:border-[#1D4ED8] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <action.icon size={18} className="text-[#1D4ED8]" />
              <span className="text-sm font-bold text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-2.5 transition focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-blue-100">
          <Sparkles size={18} className="shrink-0 text-[#1D4ED8]" />
          <input
            className="flex-1 bg-transparent text-base font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Ask about your CV, job readiness, skills, or roadmap..."
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
          <span>Session context active: CareerPilot will remember this conversation while you continue chatting.</span>
        </div>
      )}
    </div>
  );
}
