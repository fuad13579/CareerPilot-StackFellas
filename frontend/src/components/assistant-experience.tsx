"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Loader2, Sparkles, Bot, User, FileText, Target, Map, PenTool, Zap } from "lucide-react";
import { GlassCard } from "./motion-shell";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { icon: FileText, label: "Resume Analysis", prompt: "Analyze my resume and suggest improvements" },
  { icon: Target, label: "Job Readiness", prompt: "Am I ready for this role? What gaps do I have?" },
  { icon: Map, label: "Roadmap", prompt: "Create a learning roadmap to bridge my skill gaps" },
  { icon: PenTool, label: "Cover Letter", prompt: "Help me write a cover letter for this position" },
];

const mockResponses: Record<string, string> = {
  "analyze": "Based on your resume, I found 3 key improvements: 1) Add quantifiable metrics to your achievements, 2) Highlight React/TypeScript projects more prominently, 3) Include a skills section with modern frameworks. Want me to help refine specific sections?",
  "readiness": "You're 78% ready for frontend engineering roles. Your strengths: React, TypeScript, CSS. Gaps: Limited system design experience, no CI/CD mentions. I recommend 2-4 weeks of focused preparation to close these gaps.",
  "roadmap": "Here's your 4-week roadmap:\n**Week 1-2:** System design fundamentals, testing practices\n**Week 3:** CI/CD pipelines, deployment best practices\n**Week 4:** Mock interviews + portfolio polish\nShould I create a detailed week-by-week plan?",
  "cover": "I'll help you craft a compelling cover letter. Key elements for your application:\n\n1. **Opening:** Express genuine interest in the company\n2. **Body:** Highlight 2-3 relevant achievements matching their requirements\n3. **Closing:** Call to action with follow-up availability\n\nShall I draft it based on a specific job posting?",
};

export function AssistantExperience() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your CareerPilot assistant. I can help with resume analysis, job readiness assessment, learning roadmaps, and cover letter writing. What would you like to work on?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getAIResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    if (lower.includes("analyze") || lower.includes("resume") || lower.includes("improve")) {
      return mockResponses.analyze;
    }
    if (lower.includes("ready") || lower.includes("gap") || lower.includes("strength")) {
      return mockResponses.readiness;
    }
    if (lower.includes("roadmap") || lower.includes("learn") || lower.includes("plan")) {
      return mockResponses.roadmap;
    }
    if (lower.includes("cover letter") || lower.includes("draft") || lower.includes("write")) {
      return mockResponses.cover;
    }
    return "I can help you with resume improvements, job-fit analysis, skill gap assessments, learning roadmaps, and cover letter drafting. What specific area would you like to focus on? Feel free to ask about any of these topics!";
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() && !hasStarted) return;

    const userMessage = inputValue.trim() || "Analyze my resume and suggest improvements";
    setInputValue("");
    setHasStarted(true);

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
    <div className="flex h-[600px] flex-col">
      {/* Messages Container */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-2">
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
              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
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
        <div className="mb-4 grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setInputValue(action.prompt);
                handleSendMessage();
              }}
              className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition hover:border-[#1D4ED8] hover:bg-blue-50"
            >
              <action.icon size={20} className="text-[#1D4ED8]" />
              <span className="text-sm font-bold text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 transition focus-within:border-[#1D4ED8] focus-within:ring-4 focus-within:ring-blue-100">
          <Sparkles size={18} className="shrink-0 text-[#1D4ED8]" />
          <input
            className="flex-1 bg-transparent text-base font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Ask about resume, jobs, skills, or roadmaps..."
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
        Supports: Resume analysis • Job readiness • Skill gaps • Roadmaps • Cover letters
      </p>
    </div>
  );
}
