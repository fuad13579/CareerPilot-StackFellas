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
        description="Manage tasks, deadlines, and track your progress toward career goals."
      >
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Productivity"
      description="Manage tasks, deadlines, and track your progress toward career goals."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProgressWidget stats={stats} />
        </div>

        <div className="lg:col-span-2">
          <DeadlineList
            events={events}
            onCreate={handleCreateEvent}
            onDelete={handleDeleteEvent}
            linkedApplications={applications}
          />
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
      </div>
    </PageShell>
  );
}
