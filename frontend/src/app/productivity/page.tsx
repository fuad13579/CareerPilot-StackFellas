"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/motion-shell";
import { TodoList } from "@/components/todo-list";
import { DeadlineList } from "@/components/deadline-list";
import { ProgressWidget } from "@/components/progress-widget";
import {
  Todo,
  TodoStats,
  CalendarEvent,
  CreateTodoRequest,
  CreateEventRequest,
  JobApplication,
} from "@/types/productivity";
import { getCareerPilotHeaders } from "@/components/user-storage";
import { parseGoalMetadata } from "@/components/productivity-goals";
import {
  AlarmClock,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

async function fetchWithTimeout(url: string, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: getCareerPilotHeaders(),
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getStoredDateKey(dateLike: string | null | undefined) {
  if (!dateLike) return "";
  const normalized = dateLike.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function parseStoredDate(dateLike: string | Date) {
  if (dateLike instanceof Date) {
    return startOfDay(dateLike);
  }

  const key = getStoredDateKey(dateLike);
  if (key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return startOfDay(new Date(dateLike));
}

function isWithinNextDays(dateLike: string, days: number) {
  const today = startOfDay(new Date());
  const target = startOfDay(parseStoredDate(dateLike));
  const diff = target.getTime() - today.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function formatShortDate(dateLike: string | Date) {
  return parseStoredDate(dateLike).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ProductivityPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateStats = (todoList: Todo[]) => {
    const total = todoList.length;
    const completed = todoList.filter((t) => t.is_completed).length;
    const remaining = total - completed;
    const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

    setStats({
      total,
      completed,
      remaining,
      progress_percentage: Math.round(progressPercentage * 10) / 10,
    });
  };

  const loadData = useCallback(async () => {
    try {
      const [todosRes, eventsRes, appsRes, statsRes] = await Promise.all([
        fetchWithTimeout("/api/todos"),
        fetchWithTimeout("/api/calendar/events"),
        fetchWithTimeout("/api/tracker/applications"),
        fetchWithTimeout("/api/todos/stats"),
      ]);

      if (todosRes.ok) {
        const todosData = await todosRes.json();
        setTodos(todosData);
        updateStats(todosData);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch {
      setError("Productivity data is unavailable because the backend could not be reached.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadData]);

  const handleCreateTodo = async (data: CreateTodoRequest) => {
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCareerPilotHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newTodo = await response.json();
        const updatedTodos = [newTodo, ...todos];
        setTodos(updatedTodos);
        updateStats(updatedTodos);
      } else {
        throw new Error("Failed to create todo");
      }
    } catch {
      setError("Could not create todo because the backend is unavailable.");
    }
  };

  const handleToggleTodo = async (id: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCareerPilotHeaders(),
        },
        body: JSON.stringify({ is_completed: completed }),
      });

      if (response.ok) {
        const updated = await response.json();
        const updatedTodos = todos.map((t) => (t.id === id ? updated : t));
        setTodos(updatedTodos);
        updateStats(updatedTodos);
      } else {
        if (response.status === 404) {
          const updatedTodos = todos.filter((t) => t.id !== id);
          setTodos(updatedTodos);
          updateStats(updatedTodos);
          return;
        }
        throw new Error("Failed to update todo");
      }
    } catch {
      setError("Could not update todo because the backend is unavailable.");
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
        headers: { ...getCareerPilotHeaders() },
      });

      if (response.ok) {
        const updatedTodos = todos.filter((t) => t.id !== id);
        setTodos(updatedTodos);
        updateStats(updatedTodos);
      } else {
        if (response.status === 404) {
          const updatedTodos = todos.filter((t) => t.id !== id);
          setTodos(updatedTodos);
          updateStats(updatedTodos);
          return;
        }
        throw new Error("Failed to delete todo");
      }
    } catch {
      setError("Could not delete todo because the backend is unavailable.");
    }
  };

  const handleUpdateTodo = async (id: number, data: Partial<Todo>) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCareerPilotHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updated = await response.json();
        const updatedTodos = todos.map((t) => (t.id === id ? updated : t));
        setTodos(updatedTodos);
      } else {
        if (response.status === 404) {
          const updatedTodos = todos.filter((t) => t.id !== id);
          setTodos(updatedTodos);
          updateStats(updatedTodos);
          return;
        }
        throw new Error("Failed to update todo");
      }
    } catch {
      setError("Could not update todo because the backend is unavailable.");
    }
  };

  const handleCreateEvent = async (data: CreateEventRequest) => {
    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCareerPilotHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newEvent = await response.json();
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
      } else {
        throw new Error("Failed to create event");
      }
    } catch {
      setError("Could not create event because the backend is unavailable.");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: "DELETE",
        headers: { ...getCareerPilotHeaders() },
      });

      if (response.ok) {
        const updatedEvents = events.filter((e) => e.id !== id);
        setEvents(updatedEvents);
      } else {
        if (response.status === 404) {
          const updatedEvents = events.filter((e) => e.id !== id);
          setEvents(updatedEvents);
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        const statusLabel = response.status ? `HTTP ${response.status}` : "";
        const detail =
          typeof errorData?.detail === "string" && errorData.detail
            ? errorData.detail
            : "Failed to delete event";
        throw new Error(
          detail === "Failed to delete event" && statusLabel
            ? `${detail} (${statusLabel})`
            : detail
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? `Could not delete event: ${error.message}`
          : "Could not delete event because the backend is unavailable."
      );
    }
  };

  if (isLoading) {
    return (
      <PageShell
        title="Productivity"
        description="Plan deadlines, manage weekly goals, and turn career progress into a routine instead of a one-off push."
      >
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        </div>
      </PageShell>
    );
  }

  const today = startOfDay(new Date());
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const pendingTodos = todos.filter((todo) => !todo.is_completed);
  const completedTodos = todos.filter((todo) => todo.is_completed);
  const weeklyApplications = applications.filter((app) => {
    if (!app?.created_at) return false;
    return new Date(app.created_at).getTime() >= today.getTime() - weekMs;
  }).length;
  const interviewingCount = applications.filter(
    (app) => app?.status === "Interviewing"
  ).length;
  const dueThisWeek = pendingTodos.filter(
    (todo) => todo.due_date && isWithinNextDays(todo.due_date, 7)
  ).length;
  const overdueTodos = pendingTodos.filter(
    (todo) =>
      todo.due_date &&
      startOfDay(parseStoredDate(todo.due_date)).getTime() < today.getTime()
  ).length;
  const upcomingEvents = [...events]
    .filter(
      (event) => startOfDay(parseStoredDate(event.event_date)).getTime() >= today.getTime()
    )
    .sort(
      (a, b) => parseStoredDate(a.event_date).getTime() - parseStoredDate(b.event_date).getTime()
    );
  const upcomingThisWeek = upcomingEvents.filter((event) =>
    isWithinNextDays(event.event_date, 7)
  );

  const weeklyGoals = [
    {
      label: "Apply to 5 jobs this week",
      progress: Math.min(weeklyApplications, 5),
      target: 5,
      detail: `${Math.max(0, 5 - weeklyApplications)} left to hit target`,
      tone: "from-[#1D4ED8] to-[#60A5FA]",
      icon: Briefcase,
    },
    {
      label: "Clear pending tasks",
      progress: completedTodos.length,
      target: Math.max(todos.length, 1),
      detail: `${pendingTodos.length} still open`,
      tone: "from-[#059669] to-[#34D399]",
      icon: CheckCircle2,
    },
    {
      label: "Protect upcoming deadlines",
      progress: upcomingThisWeek.length,
      target: Math.max(upcomingEvents.length, 1),
      detail: `${dueThisWeek} todo${dueThisWeek === 1 ? "" : "s"} due in 7 days`,
      tone: "from-[#D97706] to-[#FBBF24]",
      icon: CalendarDays,
    },
  ];

  const aiNudges = [
    overdueTodos > 0
      ? `You have ${overdueTodos} overdue task${overdueTodos === 1 ? "" : "s"}. Clear the oldest blocker first.`
      : null,
    weeklyApplications === 0
      ? "You haven't applied to any jobs this week. Save one role from Jobs and push it into the tracker."
      : null,
    interviewingCount > 0
      ? `You have ${interviewingCount} interview-stage application${interviewingCount === 1 ? "" : "s"}. Schedule prep blocks now, not the night before.`
      : null,
    upcomingThisWeek.length > 0
      ? `${upcomingThisWeek.length} deadline${upcomingThisWeek === undefined || upcomingThisWeek.length === 1 ? "" : "s"} arrive in the next 7 days. Convert each into a concrete todo.`
      : "No deadlines are scheduled this week. Add application cutoffs, follow-ups, or mock interviews to stay accountable.",
  ].filter(Boolean) as string[];

  const calendarDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const iso = formatLocalDateKey(date);
    const dayEvents = events.filter((event) => getStoredDateKey(event.event_date) === iso);
    const dayTodos = pendingTodos.filter((todo) => getStoredDateKey(todo.due_date) === iso);
    return {
      iso,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: date.getDate(),
      isToday: index === 0,
      events: dayEvents,
      todos: dayTodos,
    };
  });

  return (
    <PageShell
      title="Productivity"
      description="Plan deadlines, manage weekly goals, and turn career progress into a routine instead of a one-off push."
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <section className="grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
          <div className="overflow-hidden rounded-[28px] border border-[#D6E4FF] bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,.22),_transparent_34%),linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_48%,#F8FAFC_100%)] p-6 shadow-[0_16px_48px_rgba(29,78,216,.08)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.18),transparent_34%),linear-gradient(135deg,#172554_0%,#111827_48%,#0F172A_100%)] dark:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:text-blue-300">
                  Weekly Command Center
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#0F172A] dark:text-slate-100">
                  Turn career goals into scheduled action.
                </h2>
                <p className="mt-3 text-sm font-medium leading-7 text-[#475569] dark:text-slate-300">
                  This page now maps more directly to the problem statement:
                  calendar planning, weekly goal setting, and AI-style accountability nudges
                  tied to your real tasks and applications.
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm dark:border-slate-600 dark:bg-slate-800/90">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B] dark:text-slate-400">
                  This Week
                </p>
                <p className="mt-1 text-3xl font-extrabold text-[#0F172A] dark:text-slate-100">
                  {weeklyApplications}
                </p>
                <p className="text-sm font-medium text-[#64748B] dark:text-slate-300">
                  applications submitted
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {weeklyGoals.map((goal) => {
                const Icon = goal.icon;
                const percentage = Math.min(
                  100,
                  Math.round((goal.progress / goal.target) * 100)
                );

                return (
                  <div
                    key={goal.label}
                    className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800/90"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br ${goal.tone} text-white shadow-sm`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-[#334155] dark:text-slate-200">
                        {goal.progress}/{goal.target}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-bold text-[#0F172A] dark:text-slate-100">{goal.label}</p>
                    <p className="mt-1 text-xs font-medium text-[#64748B] dark:text-slate-300">{goal.detail}</p>
                    <div className="mt-4 h-2 rounded-full bg-[#E2E8F0] dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${goal.tone}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,.06)] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8] dark:bg-slate-800 dark:text-blue-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1D4ED8] dark:text-blue-300">
                  AI Nudges
                </p>
                <h3 className="text-xl font-extrabold text-[#0F172A] dark:text-slate-100">
                  What needs attention next
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {aiNudges.map((nudge, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[#1D4ED8] shadow-sm dark:bg-slate-900 dark:text-blue-300">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium leading-6 text-[#334155] dark:text-slate-100">{nudge}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.05)] dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B] dark:text-slate-300">
                    Execution
                  </p>
                  <h3 className="text-xl font-extrabold text-[#0F172A] dark:text-slate-100">
                    Progress snapshot
                  </h3>
                </div>
              </div>
              <ProgressWidget stats={stats} />
            </div>

            <div className="rounded-[26px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.05)] dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#B45309]">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B] dark:text-slate-300">
                    Goal Setting
                  </p>
                  <h3 className="text-xl font-extrabold text-[#0F172A] dark:text-slate-100">
                    Suggested weekly targets
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#FFF7ED] p-4 dark:bg-orange-950/40">
                  <p className="text-sm font-bold text-[#9A3412] dark:text-orange-200">Apply to 5 jobs this week</p>
                  <p className="mt-1 text-sm text-[#7C2D12] dark:text-orange-100">
                    Use the Jobs page, then move each application into the tracker board.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#EFF6FF] p-4 dark:bg-blue-950/40">
                  <p className="text-sm font-bold text-[#1D4ED8] dark:text-blue-300">
                    Finish every task due in the next 7 days
                  </p>
                  <p className="mt-1 text-sm text-[#1E40AF] dark:text-blue-200">
                    You currently have {dueThisWeek} deadline-linked task
                    {dueThisWeek === 1 ? "" : "s"} in that window.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F0FDF4] p-4 dark:bg-emerald-950/40">
                  <p className="text-sm font-bold text-[#15803D] dark:text-emerald-200">
                    Schedule interview prep blocks
                  </p>
                  <p className="mt-1 text-sm text-[#166534] dark:text-emerald-100">
                    {interviewingCount > 0
                      ? `You have ${interviewingCount} interviewing application${interviewingCount === 1 ? "" : "s"} to support.`
                      : "Add mock interview sessions before interviews start to stack up."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.05)] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4338CA]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                    Calendar View
                  </p>
                  <h3 className="text-xl font-extrabold text-[#0F172A]">
                    Next 7 days
                  </h3>
                </div>
              </div>

              <div className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#475569] dark:bg-slate-800 dark:text-slate-300">
                {upcomingThisWeek.length} event{upcomingThisWeek.length === 1 ? "" : "s"} scheduled
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-7">
              {calendarDays.map((day) => (
                <div
                  key={day.iso}
                  className={`rounded-2xl border p-3 ${
                    day.isToday
                      ? "border-[#93C5FD] bg-[#EFF6FF]"
                      : "border-[#E2E8F0] bg-[#F8FAFC] dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                      {day.label}
                    </p>
                    <span
                      className={`grid size-7 place-items-center rounded-full text-sm font-bold ${
                        day.isToday ? "bg-[#1D4ED8] text-white" : "bg-white text-[#0F172A] dark:bg-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {day.events.slice(0, 2).map((event) => {
                      const goalMeta = parseGoalMetadata(event.description);
                      return (
                        <div
                          key={`event-${event.id}`}
                          className="rounded-xl bg-white px-2.5 py-2 text-xs font-medium text-[#334155] shadow-sm dark:bg-slate-800 dark:text-slate-200"
                        >
                          <div className="flex items-center gap-1.5 text-[#1D4ED8]">
                            <AlarmClock className="h-3.5 w-3.5" />
                            <span>Deadline</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[#0F172A] dark:text-slate-100">{event.title}</p>
                          {goalMeta.goal && (
                            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${goalMeta.goal.tone}`}>
                              {goalMeta.goal.label}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {day.todos.slice(0, 2).map((todo) => (
                      <div
                        key={`todo-${todo.id}`}
                        className="rounded-xl bg-[#FEFCE8] px-2.5 py-2 text-xs font-medium text-[#713F12] dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>Todo due</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[#854D0E] dark:text-amber-100">{todo.title}</p>
                      </div>
                    ))}

                    {day.events.length === 0 && day.todos.length === 0 && (
                      <p className="pt-4 text-xs font-medium text-[#94A3B8] dark:text-slate-400">
                        Open for deep work
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {upcomingEvents.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Next important date</p>
                <p className="mt-1 text-sm text-[#475569] dark:text-slate-300">
                  {upcomingEvents[0].title} on {formatShortDate(upcomingEvents[0].event_date)}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DeadlineList
              events={events}
              onCreate={handleCreateEvent}
              onDelete={handleDeleteEvent}
              linkedApplications={applications}
            />
          </div>

          <div className="rounded-[26px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.05)] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                  Tracker Sync
                </p>
                <h3 className="text-xl font-extrabold text-[#0F172A]">
                  Application pressure
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-[#F8FAFC] p-4 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  Pipeline size
                </p>
                <p className="mt-1 text-3xl font-extrabold text-[#0F172A]">{applications.length}</p>
                <p className="mt-1 text-sm text-[#475569]">tracked applications</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#FEF2F2] p-4 dark:bg-red-950/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#991B1B]">
                    Overdue
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-[#B91C1C]">{overdueTodos}</p>
                </div>
                <div className="rounded-2xl bg-[#ECFDF5] p-4 dark:bg-emerald-950/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#166534]">
                    Interviewing
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-[#15803D]">{interviewingCount}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#EFF6FF] p-4 dark:bg-blue-950/40">
                <p className="text-sm font-bold text-[#1D4ED8] dark:text-blue-300">Recommended next step</p>
                <p className="mt-1 text-sm text-[#1E3A8A] dark:text-blue-100">
                  {applications.length === 0
                    ? "Start by saving one job from the Jobs page, then create a related deadline here."
                    : "Link each important application to at least one deadline and one todo so the tracker drives daily work."}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <TodoList
              todos={todos}
              onCreate={handleCreateTodo}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
              onUpdate={handleUpdateTodo}
              linkedApplications={applications}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
