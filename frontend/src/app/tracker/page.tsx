"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { JobApplication } from "@/components/job-card";

const STORAGE_KEY = "careerpilot-tracker-applications";

async function fetchWithTimeout(url: string, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function loadLocalApplications() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as JobApplication[]) : [];
  } catch {
    return [];
  }
}

export default function TrackerPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const localApplications = loadLocalApplications();
    setApplications(localApplications);

    try {
      const response = await fetchWithTimeout("/api/tracker/applications");
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        setError("Backend is unavailable. Using browser storage for this demo.");
      }
    } catch {
      setError("Backend is unavailable. Using browser storage for this demo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Tracker"
      description="Monitor application status, follow-up timing, interview stages, and outcomes."
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        </div>
      ) : error ? (
        <>
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
          <KanbanBoard initialApplications={applications} />
        </>
      ) : (
        <KanbanBoard initialApplications={applications} />
      )}
    </PageShell>
  );
}
