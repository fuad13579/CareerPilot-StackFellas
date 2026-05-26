"use client";

import { GlassCard, Reveal, Stagger } from "./motion-shell";

const stages = [
  ["Applied", "6 roles", 72],
  ["Screening", "3 roles", 54],
  ["Interview", "3 roles", 46],
  ["Offer", "1 role", 24],
];

export function TrackerExperience() {
  return (
    <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {stages.map(([stage, count, progress]) => (
        <Reveal key={stage}>
          <GlassCard className="p-6">
            <h2 className="text-2xl font-extrabold">{stage}</h2>
            <p className="mt-2 text-base font-medium text-[#6B7280]">{count}</p>
            <div className="mt-6 h-2 rounded-full bg-[#EEF2F7]">
              <div
                className="h-full rounded-full bg-[#1D4ED8]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </GlassCard>
        </Reveal>
      ))}
    </Stagger>
  );
}
