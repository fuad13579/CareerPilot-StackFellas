"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Loader2, Sparkles, Bot, User, Briefcase, Lightbulb, Map, FileText, Zap } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { icon: Briefcase, label: "Job Readiness", prompt: "Am I ready for a frontend developer role?" },
  { icon: Lightbulb, label: "Skill Gaps", prompt: "What skills am I missing for my target roles?" },
  { icon: Map, label: "Learning Roadmap", prompt: "Build me a 3-month roadmap to become job-ready" },
  { icon: FileText, label: "Cover Letter", prompt: "Draft a cover letter for a job I'm interested in" },
];

const mockResponses: Record<string, string> = {
  "readiness": "Based on your CV, you appear to be a strong fit for frontend-focused roles because you have React, TypeScript, and project experience. Your backend skills with Python and FastAPI add to your versatility. Review the specific job requirements for each position to confirm readiness.",
  "skills": "Based on your CV, you have solid skills in Python, backend API development, and React/TypeScript. For your target roles, focus on strengthening testing, deployment, and any specific frameworks mentioned in job postings.",
  "roadmap": "Month 1: Strengthen core skills and work on portfolio projects. Month 2: Build one full-stack project with database and deployment. Month 3: Apply to jobs, practice interviews, and improve your GitHub profile.",
  "cover": "I can draft a cover letter using your uploaded CV and the selected job description. Your responses will be grounded in your actual skills, experience, and the specific role requirements.",
};

export function AssistantExperience() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi, I'm your CareerPilot assistant. I can analyze your uploaded CV, check your readiness for a role, identify missing skills, build a roadmap, or draft a cover letter.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [messageCount, setMessageCount] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getAIResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    if (lower.includes("ready") || lower.includes("fit") || lower.includes("job role")) {
      return mockResponses.readiness;
    }
    if (lower.includes("skill") || lower.includes("missing") || lower.includes("gap") || lower.includes("improve")) {
      return mockResponses.skills;
    }
    if (lower.includes("roadmap") || lower.includes("3-month") || lower.includes("job-ready") || lower.includes("learn")) {
      return mockResponses.roadmap;
    }
    if (lower.includes("cover letter") || lower.includes("draft")) {
      return mockResponses.cover;
    }
    return "I can help you with job readiness assessment, skill gap analysis, learning roadmaps, and cover letter drafting. Your responses are grounded in your uploaded CV. What specific area would you like to focus on?";
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() && !hasStarted) return;

    const userMessage = inputValue.trim() || "Am I ready for a frontend developer role?";
    setInputValue("");
    setHasStarted(true);
    setMessageCount((prev) => prev + 1);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);
    // Simulate backend API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsTyping(false);

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: getAIResponse(userMessage),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiResponse]);
  };

  return (
    <div className="flex h-[600px] flex-col -mt-2">
      {/* Page Content Header */}
      <div className="mb-3 border-b border-gray-200 pb-3">
        <h2 className="text-base font-bold text-[#111827]">AI Career Assistant</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Ask about your CV, job readiness, skill gaps, roadmap, and applications.
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#1D4ED8]">
          <Zap size={10} />
          <span>CV context active • Session memory enabled</span>
        </div>
      </div>

      {/* Messages Container */}
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
              <p className="whitespace-pre-wrap text-sm font-medium leading-8">
                {msg.content}
              </p>
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

        {/* Typing Indicator */}
        {isTyping && (
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

      {/* Quick Actions - Only show before first message */}
      {!hasStarted && (
        <div className="mb-3 mt-2 grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setInputValue(action.prompt);
                handleSendMessage();
              }}
              className="flex items-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white p-3.5 text-left transition hover:border-[#1D4ED8] hover:bg-blue-50"
            >
              <action.icon size={18} className="text-[#1D4ED8]" />
              <span className="text-sm font-bold text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="mt-3 flex gap-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-2.5 transition focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-blue-100">
          <Sparkles size={18} className="shrink-0 text-[#1D4ED8]" />
          <input
            className="flex-1 bg-transparent text-base font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Ask about your CV, job readiness, skills, or roadmap..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-full bg-[#1D4ED8] p-2 text-white transition hover:bg-[#1E40AF] disabled:opacity-50"
          >
            {isTyping ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>

      {/* Helper Text */}
      <p className="mt-3 text-center text-xs font-medium text-gray-400">
        Answers are grounded in your uploaded CV and current session context.
      </p>

      {/* Session Memory Indicator */}
      {messageCount > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#1D4ED8]">
          <Zap size={12} />
          <span>Session context active: CareerPilot will remember this conversation while you continue chatting.</span>
        </div>
      )}
    </div>
  );
}
