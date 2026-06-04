"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/motion-shell";
import { TodoList } from "@/components/todo-list";
import { DeadlineList } from "@/components/deadline-list";
import { ProgressWidget } from "@/components/progress-widget";
import { Todo, TodoStats, CalendarEvent, CreateTodoRequest, CreateEventRequest, JobApplication } from "@/types/productivity";
import { getCareerPilotHeaders } from "@/components/user-storage";

const STORAGE_KEY_TODOS = "careerpilot-todos";
const STORAGE_KEY_EVENTS = "careerpilot-events";
const STORAGE_KEY_APPLICATIONS = "careerpilot-applications";

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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export default function ProductivityPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load from local storage first
    const localTodos = loadFromStorage<Todo[]>(STORAGE_KEY_TODOS, []);
    const localEvents = loadFromStorage<CalendarEvent[]>(STORAGE_KEY_EVENTS, []);
    const localApps = loadFromStorage<JobApplication[]>(STORAGE_KEY_APPLICATIONS, []);

    setTodos(localTodos);
    setEvents(localEvents);
    setApplications(localApps);
    updateStats(localTodos);

    // Try to fetch from backend
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
        saveToStorage(STORAGE_KEY_TODOS, todosData);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        saveToStorage(STORAGE_KEY_EVENTS, eventsData);
      }

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData);
        saveToStorage(STORAGE_KEY_APPLICATIONS, appsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch {
      // Backend unavailable, continue with local data
      setError("Running in demo mode. Data saved locally.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStats = (todoList: Todo[]) => {
    const total = todoList.length;
    const completed = todoList.filter((t) => t.is_completed).length;
    const remaining = total - completed;
    const progress_percentage = total > 0 ? (completed / total) * 100 : 0;

    setStats({
      total,
      completed,
      remaining,
      progress_percentage: Math.round(progress_percentage * 10) / 10,
    });
  };

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
        saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
        updateStats(updatedTodos);
      } else {
        throw new Error("Failed to create todo");
      }
    } catch {
      // Demo mode: create local todo
      const newTodo: Todo = {
        id: Date.now(),
        title: data.title,
        description: data.description || null,
        is_completed: false,
        due_date: data.due_date || null,
        linked_type: data.linked_type || null,
        linked_id: data.linked_id || null,
        created_at: new Date().toISOString(),
      };
      const updatedTodos = [newTodo, ...todos];
      setTodos(updatedTodos);
      saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
      updateStats(updatedTodos);
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
        saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
        updateStats(updatedTodos);
      } else {
        throw new Error("Failed to update todo");
      }
    } catch {
      // Demo mode: update locally
      const updatedTodos = todos.map((t) =>
        t.id === id ? { ...t, is_completed: completed } : t
      );
      setTodos(updatedTodos);
      saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
      updateStats(updatedTodos);
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
        saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
        updateStats(updatedTodos);
      } else {
        throw new Error("Failed to delete todo");
      }
    } catch {
      // Demo mode: delete locally
      const updatedTodos = todos.filter((t) => t.id !== id);
      setTodos(updatedTodos);
      saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
      updateStats(updatedTodos);
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
        saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
      } else {
        throw new Error("Failed to update todo");
      }
    } catch {
      // Demo mode: update locally
      const updatedTodos = todos.map((t) =>
        t.id === id ? { ...t, ...data } : t
      );
      setTodos(updatedTodos);
      saveToStorage(STORAGE_KEY_TODOS, updatedTodos);
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
        saveToStorage(STORAGE_KEY_EVENTS, updatedEvents);
      } else {
        throw new Error("Failed to create event");
      }
    } catch {
      // Demo mode: create local event
      const newEvent: CalendarEvent = {
        id: Date.now(),
        title: data.title,
        description: data.description || null,
        event_date: data.event_date,
        related_application_id: data.related_application_id || null,
        linked_type: data.linked_type || null,
        created_at: new Date().toISOString(),
      };
      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      saveToStorage(STORAGE_KEY_EVENTS, updatedEvents);
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
        saveToStorage(STORAGE_KEY_EVENTS, updatedEvents);
      } else {
        throw new Error("Failed to delete event");
      }
    } catch {
      // Demo mode: delete locally
      const updatedEvents = events.filter((e) => e.id !== id);
      setEvents(updatedEvents);
      saveToStorage(STORAGE_KEY_EVENTS, updatedEvents);
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
        {/* Progress Widget - spans full width on first row */}
        <div className="lg:col-span-1">
          <ProgressWidget stats={stats} />
        </div>

        {/* Deadlines - second column */}
        <div className="lg:col-span-2">
          <DeadlineList
            events={events}
            onCreate={handleCreateEvent}
            onDelete={handleDeleteEvent}
            linkedApplications={applications}
          />
        </div>

        {/* Todos - full width */}
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
