"use client";

import { Send } from "lucide-react";
import { GlassCard } from "./motion-shell";

export function AssistantExperience() {
  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        <div className="max-w-2xl rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-base font-medium leading-8 text-[#374151]">
          What role are you targeting next?
        </div>
        <div className="ml-auto max-w-2xl rounded-3xl bg-[#1D4ED8] p-5 text-base font-semibold leading-8 text-white">
          I want to improve my resume for frontend engineering roles.
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-[#E5E7EB] bg-white p-3 sm:flex-row">
        <input
          className="min-h-12 flex-1 bg-transparent px-3 text-base font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF]"
          placeholder="Ask CareerPilot..."
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1E40AF]">
          Send <Send size={16} />
        </button>
      </div>
    </GlassCard>
  );
}
