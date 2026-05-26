"use client";

import { FileText } from "lucide-react";
import { GlassCard } from "./motion-shell";

export function UploadExperience() {
  return (
    <GlassCard className="p-8">
      <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
        <div>
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-[#1D4ED8] shadow-sm">
            <FileText size={28} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold">Resume intake</h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-8 text-[#6B7280]">
            Upload a resume or job description so the existing workflow can
            extract skills, experience, and role requirements.
          </p>
          <button className="mt-7 rounded-full bg-[#1D4ED8] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1E40AF]">
            Select file
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
