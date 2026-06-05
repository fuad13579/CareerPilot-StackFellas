"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientOnly, GlassCard, Reveal, Stagger } from "./motion-shell";
import { Briefcase, Calendar, Target, CheckCircle2, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { useTracker } from "./tracker-context";
import { getCareerPilotUserId } from "./user-storage";
import { KanbanBoard } from "./kanban-board";

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
  const [userId, setUserId] = useState<string | null>(null);
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
  const kanbanApplications = useMemo(
    () =>
      applications.map((app) => ({
        id: Number(app.id),
        job_id: app.id,
        role: app.role,
        company: app.company,
        location: app.location || null,
        status: app.status,
        fit_score: Number.isFinite(app.fitScore) ? app.fitScore : null,
        job_url: app.jobUrl || null,
        notes: app.nextAction || app.jobDescription || null,
        created_at: app.appliedDate,
        updated_at: app.appliedDate,
      })),
    [applications]
  );

  useEffect(() => {
    setUserId(getCareerPilotUserId() || null);
  }, []);

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

      <Reveal>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1D4ED8]">Application Board</p>
              <h3 className="mt-1 text-lg font-extrabold text-black">Track jobs by stage</h3>
            </div>
          </div>
          <ClientOnly
            fallback={
              <div className="grid gap-4 lg:grid-cols-4">
                {["Applied", "Interviewing", "Offer", "Rejected"].map((column) => (
                  <div key={column} className="rounded-xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                      <h4 className="font-semibold text-slate-800">{column}</h4>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">0</span>
                    </div>
                    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
                      Loading board...
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <KanbanBoard initialApplications={kanbanApplications} userId={userId} />
          </ClientOnly>
        </GlassCard>
      </Reveal>

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
