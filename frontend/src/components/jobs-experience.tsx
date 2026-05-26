"use client";

import { MapPin } from "lucide-react";
import { GlassCard, Reveal, Stagger } from "./motion-shell";

const jobs = [
  { role: "Frontend Developer", company: "Vercel", location: "Remote", match: "92%" },
  { role: "Product Engineer", company: "Linear", location: "New York, NY", match: "87%" },
  { role: "Full Stack Intern", company: "Stripe", location: "Hybrid", match: "81%" },
];

export function JobsExperience() {
  return (
    <Stagger className="grid gap-5 lg:grid-cols-3">
      {jobs.map((job) => (
        <Reveal key={job.role}>
          <GlassCard className="h-full p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#F3F6FB] text-base font-extrabold text-[#1D4ED8]">
                {job.company[0]}
              </div>
              <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-sm font-extrabold text-[#1D4ED8]">
                {job.match}
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-extrabold">{job.role}</h2>
            <p className="mt-1 text-sm font-bold text-[#1D4ED8]">{job.company}</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-[#6B7280]">
              <MapPin size={16} /> {job.location}
            </p>
          </GlassCard>
        </Reveal>
      ))}
    </Stagger>
  );
}
