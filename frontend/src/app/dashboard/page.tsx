"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { TodoStats } from "@/types/productivity";

const STORAGE_KEY = "careerpilot-tracker-applications";

const nextActions = [
  { href: "/upload", label: "Upload resume", detail: "Add or refresh your candidate profile." },
  { href: "/jobs", label: "Review matches", detail: "Scan recommended roles for fit." },
  { href: "/tracker", label: "Update tracker", detail: "Keep applications moving forward." },
  { href: "/productivity", label: "Productivity", detail: "Manage tasks and deadlines." },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function DashboardPage() {
  const [appCount, setAppCount] = useState(0);
  const [todoStats, setTodoStats] = useState<TodoStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load from local storage first
    const localApps = loadFromStorage<{ id: number }[]>(STORAGE_KEY, []);
    setAppCount(localApps.length);

    // Try to fetch from backend
    try {
      const [appsRes, todosRes] = await Promise.all([
        fetchWithTimeout("/api/tracker/applications"),
        fetchWithTimeout("/api/todos/stats"),
      ]);

      if (appsRes.ok) {
        const apps = await appsRes.json();
        setAppCount(apps.length);
      }

      if (todosRes.ok) {
        const stats = await todosRes.json();
        setTodoStats(stats);
      }
    } catch {
      // Backend unavailable, continue with local data
    }
  };

  return (
    <PageShell
      title="Dashboard"
      description="Track your job search activity, resume readiness, and application momentum from one place."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          label="Active applications" 
          value={appCount.toString()} 
          helper="Track your job applications" 
        />
        <StatCard 
          label="Pending todos" 
          value={todoStats?.remaining?.toString() || "—"} 
          helper={todoStats ? `${todoStats.progress_percentage}% complete` : "Manage your tasks"} 
        />
        <StatCard 
          label="Completed todos" 
          value={todoStats?.completed?.toString() || "—"} 
          helper="Tasks you've finished" 
        />
        <StatCard 
          label="Progress" 
          value={todoStats ? `${todoStats.progress_percentage}%` : "—"} 
          helper="Overall task completion" 
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        {nextActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-950">{action.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.detail}</p>
          </Link>
        ))}
      </section>
    </PageShell>
  );
}
