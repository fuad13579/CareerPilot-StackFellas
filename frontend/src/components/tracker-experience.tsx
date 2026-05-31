"use client";

import { GlassCard, Reveal, Stagger } from "./motion-shell";
import { Briefcase, MapPin, Calendar, Target, CheckCircle2, Clock, MessageSquare, AlertCircle } from "lucide-react";

const applications = {
  Applied: [
    {
      id: 1,
      role: "Frontend Developer Intern",
      company: "TechNova",
      location: "Dhaka",
      fitScore: 84,
      deadline: "2026-06-03",
      nextAction: "Submit cover letter by Friday",
    },
    {
      id: 2,
      role: "Junior Backend Developer",
      company: "CodeCrafters",
      location: "Remote",
      fitScore: 78,
      deadline: "2026-06-07",
      nextAction: "Review job requirements",
    },
  ],
  Interviewing: [
    {
      id: 3,
      role: "Software Engineer Intern",
      company: "Brain Station 23",
      location: "Dhaka",
      fitScore: 91,
      deadline: "2026-06-02",
      nextAction: "Complete DSA practice set before interview",
    },
  ],
  Offer: [
    {
      id: 4,
      role: "Web Developer Intern",
      company: "DemoTech",
      location: "Hybrid",
      fitScore: 88,
      deadline: "2026-06-05",
      nextAction: "Review offer details",
    },
  ],
  Rejected: [
    {
      id: 5,
      role: "React Intern",
      company: "ExampleSoft",
      location: "Remote",
      fitScore: 65,
      deadline: "2026-05-28",
      nextAction: "Learn React best practices",
    },
  ],
};

const stats = [
  { label: "Total Applications", value: "7", icon: Briefcase },
  { label: "Interviews", value: "2", icon: Calendar },
  { label: "Offers", value: "1", icon: CheckCircle2 },
  { label: "Pending Deadlines", value: "4", icon: Clock },
];

const upcomingTasks = [
  { task: "Submit cover letter for TechNova by Friday", priority: "high" },
  { task: "Follow up with Brain Station 23 recruiter", priority: "medium" },
  { task: "Update CV project section", priority: "medium" },
  { task: "Complete DSA practice set before interview", priority: "low" },
];

const columnColors: Record<string, string> = {
  Applied: "border-l-[#3B82F6]",
  Interviewing: "border-l-[#F59E0B]",
  Offer: "border-l-[#10B981]",
  Rejected: "border-l-[#EF4444]",
};

const badgeColors: Record<string, string> = {
  Applied: "bg-blue-100 text-blue-700",
  Interviewing: "bg-amber-100 text-amber-700",
  Offer: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

export function TrackerExperience() {
  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Reveal key={stat.label}>
            <GlassCard className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#EFF6FF]">
                <stat.icon size={20} className="text-[#1D4ED8]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-black">{stat.value}</p>
                <p className="text-sm font-medium text-[#6B7280]">{stat.label}</p>
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </Stagger>

      {/* Goal Progress */}
      <Reveal>
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1D4ED8]">Weekly Goal</p>
              <p className="mt-1 text-lg font-extrabold text-black">Apply to 5 jobs</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-[#1D4ED8]">3 / 5</p>
              <p className="text-sm font-medium text-[#6B7280]">applications completed</p>
            </div>
          </div>
          <div className="mt-4 h-3 rounded-full bg-[#EEF2F7]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6]"
              style={{ width: "60%" }}
            />
          </div>
        </GlassCard>
      </Reveal>

      {/* Kanban Board */}
      <div className="grid gap-5 lg:grid-cols-4">
        {Object.entries(applications).map(([status, apps]) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${columnColors[status].replace("border-l-", "bg-")}`} />
                <h3 className="font-extrabold text-black">{status}</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[status]}`}>
                {apps.length}
              </span>
            </div>
            <Stagger className="space-y-3">
              {apps.map((app) => (
                <Reveal key={app.id}>
                  <GlassCard className={`border-l-4 p-5 min-h-[200px] flex flex-col justify-between ${columnColors[status]}`}>
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-black">{app.role}</h4>
                          <p className="mt-0.5 text-sm font-semibold text-[#1D4ED8]">{app.company}</p>
                        </div>
                        <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-bold text-[#D97706]">
                          {app.fitScore}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{app.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{new Date(app.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-[#F9FAFB] p-3">
                      <p className="text-xs font-medium text-[#374151]">
                        <span className="font-semibold text-[#1D4ED8]">Next: </span>
                        {app.nextAction}
                      </p>
                    </div>
                  </GlassCard>
                </Reveal>
              ))}
            </Stagger>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Tasks and AI Nudge */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Reveal>
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-[#1D4ED8]" />
              <h3 className="font-extrabold text-black">Upcoming Deadlines</h3>
            </div>
            <Stagger className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4"
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    task.priority === "high" ? "bg-red-100" :
                    task.priority === "medium" ? "bg-amber-100" :
                    "bg-gray-100"
                  }`}>
                    <Target size={16} className={
                      task.priority === "high" ? "text-red-600" :
                      task.priority === "medium" ? "text-amber-600" :
                      "text-gray-600"
                    } />
                  </div>
                  <p className="flex-1 text-sm font-medium text-black">{task.task}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    task.priority === "high" ? "bg-red-100 text-red-700" :
                    task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </Stagger>
          </GlassCard>
        </Reveal>

        {/* AI Nudge */}
        <Reveal>
          <GlassCard className="flex h-full items-start gap-4 bg-gradient-to-br from-[#EFF6FF] to-white p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <MessageSquare size={22} className="text-[#1D4ED8]" />
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">CareerPilot Insight</span>
              </div>
              <p className="text-base font-medium leading-relaxed text-black">
                You have 2 saved jobs with deadlines within 5 days. Consider applying today to maximize your chances.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-sm font-semibold text-amber-600">Action needed</span>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </div>
  );
}
