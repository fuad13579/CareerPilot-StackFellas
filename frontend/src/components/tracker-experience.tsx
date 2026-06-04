"use client";

import { GlassCard, Reveal, Stagger } from "./motion-shell";
import { Briefcase, MapPin, Calendar, Target, CheckCircle2, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { useTracker } from "./tracker-context";

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
  const { 
    state, 
    getApplicationCount, 
    getApplicationCountByStatus, 
    getPendingTodos,
    getWeeklyStats 
  } = useTracker();
  const { applications } = state;
  const pendingTodos = getPendingTodos().slice(0, 4);
  const weeklyStats = getWeeklyStats();
  // Inline `style.width` was clobbered by Tailwind's `transition-all` class on
  // the same element. Inline style now drives the width so the gradient bar
  // actually animates from 0 -> progressWidth.
  const progressWidth = Math.min(weeklyStats.applicationsThisWeek / 5 * 100, 100);

  // Group applications by status
  const applicationsByStatus = {
    Applied: applications.filter(a => a.status === "Applied"),
    Interviewing: applications.filter(a => a.status === "Interviewing"),
    Offer: applications.filter(a => a.status === "Offer"),
    Rejected: applications.filter(a => a.status === "Rejected"),
  };

  const totalApplications = getApplicationCount();
  const interviewingCount = getApplicationCountByStatus("Interviewing");
  const offerCount = getApplicationCountByStatus("Offer");
  const pendingCount = pendingTodos.length;

  const stats = [
    { label: "Total Applications", value: String(totalApplications), icon: Briefcase },
    { label: "Interviews", value: String(interviewingCount), icon: Calendar },
    { label: "Offers", value: String(offerCount), icon: CheckCircle2 },
    { label: "Pending Tasks", value: String(pendingCount), icon: Clock },
  ];

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
              <p className="text-3xl font-extrabold text-[#1D4ED8]">{weeklyStats.applicationsThisWeek} / 5</p>
              <p className="text-sm font-medium text-[#6B7280]">applications this week</p>
            </div>
          </div>
          <div className="mt-4 h-3 rounded-full bg-[#EEF2F7]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] transition-all duration-500"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </GlassCard>
      </Reveal>

      {/* Kanban Board */}
      <div className="grid gap-5 lg:grid-cols-4">
        {Object.entries(applicationsByStatus).map(([status, apps]) => (
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
              {pendingTodos.map((task) => (
                <div
                  key={task.id}
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
                {totalApplications === 0 
                  ? "Start your journey by adding your first job application. CareerPilot will track your progress and provide insights."
                  : `You have ${totalApplications} active application${totalApplications !== 1 ? 's' : ''}. Keep applying to increase your chances!`}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-blue-500" />
                <span className="text-sm font-semibold text-blue-600">{weeklyStats.todosCompletedThisWeek} tasks completed this week</span>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </div>
  );
}
