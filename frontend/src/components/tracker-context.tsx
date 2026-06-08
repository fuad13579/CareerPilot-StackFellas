"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ensureCareerPilotUserId, getCareerPilotHeaders } from "./user-storage";

// Types
export interface Application {
  id: string;
  role: string;
  company: string;
  location: string;
  jobDescription: string;
  fitScore: number;
  deadline: string;
  nextAction: string;
  requiredSkills: string[];
  jobUrl: string;
  status: "Applied" | "Interviewing" | "Offer" | "Rejected";
  appliedDate: string;
}

export interface Todo {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  due: string;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  addedDate: string;
}

export interface RoadmapItem {
  week: string;
  title: string;
  progress: number;
  status: "completed" | "in-progress" | "upcoming";
  description: string;
}

export interface TrackerState {
  applications: Application[];
  todos: Todo[];
  skills: Skill[];
  roadmap: RoadmapItem[];
}

// Context type
interface TrackerContextType {
  state: TrackerState;
  dataSource: "backend" | "local_fallback";
  // Application actions
  addApplication: (app: Omit<Application, "id" | "appliedDate">) => void;
  updateApplicationStatus: (id: string, status: Application["status"]) => void;
  removeApplication: (id: string) => void;
  getApplicationCount: () => number;
  getApplicationCountByStatus: (status: Application["status"]) => number;
  // Todo actions
  addTodo: (task: string, priority: Todo["priority"], due: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  getCompletedTodos: () => Todo[];
  getPendingTodos: () => Todo[];
  // Skill actions
  addSkill: (name: string, level: number) => void;
  updateSkillLevel: (id: string, level: number) => void;
  getSkillsCount: () => number;
  // Roadmap actions
  updateRoadmapProgress: (week: string, progress: number) => void;
  completeRoadmapWeek: (week: string) => void;
  getRoadmapProgress: () => number;
  // Weekly summary
  getWeeklyStats: () => {
    applicationsThisWeek: number;
    todosCompletedThisWeek: number;
    skillsAddedThisWeek: number;
  };
}

interface TrackerApplicationResponse {
  id: number;
  role: string;
  company: string;
  location?: string | null;
  job_description?: string | null;
  fit_score?: number | null;
  deadline?: string | null;
  next_action?: string | null;
  notes?: string | null;
  required_skills?: string[];
  job_url?: string | null;
  status: Application["status"];
  created_at?: string | null;
}

interface TrackerTodoResponse {
  id: number;
  title: string;
  priority?: Todo["priority"] | null;
  is_completed: boolean;
  due_date?: string | null;
  created_at?: string | null;
}

const STORAGE_KEY_PREFIX = "careerpilot_tracker_state";

function getTrackerStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

// Default state
const defaultState: TrackerState = {
  applications: [],
  todos: [],
  skills: [],
  roadmap: [
    { week: "Week 1", title: "Resume Improvement", progress: 100, status: "completed", description: "Improve CV structure, project descriptions, and skill keywords." },
    { week: "Week 2", title: "Skill Gap Practice", progress: 75, status: "in-progress", description: "Practice missing skills identified from job fit analysis." },
    { week: "Week 3", title: "Job Applications", progress: 40, status: "in-progress", description: "Apply to matched jobs and track application outcomes." },
    { week: "Week 4", title: "Interview Preparation", progress: 0, status: "upcoming", description: "Prepare answers, practice DSA, and review saved job descriptions." },
  ],
};

// Create context
const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

// Provider component
export function TrackerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TrackerState>(defaultState);
  const [isInitialized, setIsInitialized] = useState(false);
  const anonymousUserIdRef = React.useRef("");
  const [dataSource, setDataSource] = useState<"backend" | "local_fallback">("backend");

  // Load the anonymous user, then hydrate from backend and local cache.
  useEffect(() => {
    const userId = ensureCareerPilotUserId();
    anonymousUserIdRef.current = userId;

    const hydrate = async () => {
      let cachedState: Partial<TrackerState> | null = null;
      try {
        const stored = localStorage.getItem(getTrackerStorageKey(userId));
        if (stored) {
          cachedState = JSON.parse(stored) as Partial<TrackerState>;
        }
      } catch (cacheError) {
        console.error("Failed to read tracker cache:", cacheError);
      }

      try {
        const headers = getCareerPilotHeaders();
        const [applicationsResponse, todosResponse] = await Promise.all([
          fetch("/api/tracker/applications", { headers }),
          fetch("/api/todos", { headers }),
        ]);

        const applications: TrackerApplicationResponse[] = applicationsResponse.ok ? await applicationsResponse.json() : [];
        const todos: TrackerTodoResponse[] = todosResponse.ok ? await todosResponse.json() : [];
        const cachedApplicationsById = new Map(
          Array.isArray(cachedState?.applications)
            ? cachedState.applications.map((app) => [String(app.id), app] as const)
            : []
        );

        setState((prev) => ({
          ...prev,
          applications: Array.isArray(applications)
            ? applications.map((app) => {
                const cachedApp = cachedApplicationsById.get(String(app.id));
                return {
                  id: String(app.id),
                  role: app.role,
                  company: app.company,
                  location: app.location || "",
                  jobDescription: app.job_description || "",
                  fitScore: Number(app.fit_score || 0),
                  deadline: app.deadline || "",
                  nextAction: app.next_action || app.notes || "Follow up with recruiter",
                  requiredSkills: Array.isArray(app.required_skills) ? app.required_skills : [],
                  jobUrl: app.job_url || "",
                  status: cachedApp?.status || app.status,
                  appliedDate: app.created_at || new Date().toISOString(),
                };
              })
            : [],
          todos: Array.isArray(todos)
            ? todos.map((todo) => ({
                id: String(todo.id),
                task: todo.title,
                // Preserve the backend's priority if it exists, otherwise
                // default to "medium". Hardcoding "medium" for every todo
                // made the UI lie about user-defined priority.
                priority: todo.priority || "medium",
                completed: Boolean(todo.is_completed),
                due: todo.due_date || "",
                createdAt: todo.created_at || new Date().toISOString(),
              }))
            : [],
          skills: Array.isArray(cachedState?.skills) ? cachedState.skills : prev.skills,
          roadmap: Array.isArray(cachedState?.roadmap) ? cachedState.roadmap : prev.roadmap,
        }));
        setDataSource("backend");
      } catch (error) {
        console.error("Failed to hydrate tracker state:", error);

        // Backend is unreachable: fall back to the per-user localStorage cache
        // so the UI still has *something* to render. The cache key is already
        // namespaced by anonymousUserId, so two demo users on the same browser
        // do not see each other's data.
        try {
          if (cachedState) {
            setState((prev) => ({
              ...prev,
              applications: Array.isArray(cachedState?.applications) ? cachedState.applications : prev.applications,
              todos: Array.isArray(cachedState?.todos) ? cachedState.todos : prev.todos,
              skills: Array.isArray(cachedState?.skills) ? cachedState.skills : prev.skills,
              roadmap: Array.isArray(cachedState?.roadmap) ? cachedState.roadmap : prev.roadmap,
            }));
            setDataSource("local_fallback");
          }
        } catch (cacheError) {
          console.error("Failed to load tracker cache:", cacheError);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    void hydrate();
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (isInitialized && anonymousUserIdRef.current) {
      try {
        localStorage.setItem(getTrackerStorageKey(anonymousUserIdRef.current), JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save tracker state:", error);
      }
    }
  }, [state, isInitialized]);

  // Helper to generate IDs (local-only; the backend id replaces this once the
  // POST returns so we never persist a uuid as a primary key).
  const generateId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  // Application actions
  const addApplication = useCallback((app: Omit<Application, "id" | "appliedDate">) => {
    const newApp: Application = {
      ...app,
      id: generateId(),
      appliedDate: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, applications: [...prev.applications, newApp] }));

    void fetch("/api/tracker/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getCareerPilotHeaders(),
      },
      body: JSON.stringify({
        job_id: newApp.id,
        role: newApp.role,
        company: newApp.company,
        location: newApp.location,
        deadline: newApp.deadline,
        next_action: newApp.nextAction,
        job_description: newApp.jobDescription,
        required_skills: newApp.requiredSkills,
        status: newApp.status,
        fit_score: newApp.fitScore,
        // Don't fall back to the deadline string: that turns into nonsense
        // URLs in the DB and on subsequent reads. Send null when absent.
        job_url: newApp.jobUrl?.trim() ? newApp.jobUrl.trim() : null,
      }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const created = await response.json().catch(() => null);
        if (!created?.id) return null;

        let resolvedStatus: Application["status"] = newApp.status;

        setState((prev) => ({
          ...prev,
          applications: prev.applications.map((item) => {
            if (item.id !== newApp.id) return item;
            resolvedStatus = item.status;
            return { ...item, id: String(created.id) };
          }),
        }));

        if (resolvedStatus !== created.status) {
          void fetch(`/api/tracker/applications/${encodeURIComponent(String(created.id))}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...getCareerPilotHeaders(),
            },
            body: JSON.stringify({ status: resolvedStatus }),
          }).catch((error) =>
            console.error("Failed to reconcile application status after create:", error)
          );
        }
        return created;
      })
      .catch((error) => console.error("Failed to persist application:", error));
  }, []);

  const updateApplicationStatus = useCallback((id: string, status: Application["status"]) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === id ? { ...app, status } : app
      ),
    }));

    void fetch(`/api/tracker/applications/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getCareerPilotHeaders(),
      },
      body: JSON.stringify({ status }),
    }).catch((error) => console.error("Failed to persist application status:", error));
  }, []);

  const removeApplication = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.filter((app) => app.id !== id),
    }));

    void fetch(`/api/tracker/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        ...getCareerPilotHeaders(),
      },
    }).catch((error) => console.error("Failed to delete application:", error));
  }, []);

  const getApplicationCount = useCallback(() => state.applications.length, [state.applications]);

  const getApplicationCountByStatus = useCallback(
    (status: Application["status"]) => state.applications.filter((app) => app.status === status).length,
    [state.applications]
  );

  // Todo actions
  const addTodo = useCallback((task: string, priority: Todo["priority"], due: string) => {
    const newTodo: Todo = {
      id: generateId(),
      task,
      priority,
      completed: false,
      due,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, todos: [...prev.todos, newTodo] }));

    void fetch("/api/todos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getCareerPilotHeaders(),
      },
      body: JSON.stringify({
        title: task,
        description: priority,
        due_date: due,
      }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const created = await response.json().catch(() => null);
        if (!created?.id) return null;

        setState((prev) => ({
          ...prev,
          todos: prev.todos.map((item) =>
            item.id === newTodo.id ? { ...item, id: String(created.id) } : item
          ),
        }));
        return created;
      })
      .catch((error) => console.error("Failed to persist todo:", error));
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }));

    const currentTodo = state.todos.find((todo) => todo.id === id);
    if (currentTodo) {
      void fetch(`/api/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCareerPilotHeaders(),
        },
        body: JSON.stringify({
          title: currentTodo.task,
          description: currentTodo.priority,
          is_completed: !currentTodo.completed,
          due_date: currentTodo.due,
        }),
      }).catch((error) => console.error("Failed to persist todo completion:", error));
    }
  }, [state.todos]);

  const removeTodo = useCallback((id: string) => {
    setState((prev) => ({ ...prev, todos: prev.todos.filter((todo) => todo.id !== id) }));

    void fetch(`/api/todos/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        ...getCareerPilotHeaders(),
      },
    }).catch((error) => console.error("Failed to delete todo:", error));
  }, []);

  const getCompletedTodos = useCallback(
    () => state.todos.filter((todo) => todo.completed),
    [state.todos]
  );

  const getPendingTodos = useCallback(
    () => state.todos.filter((todo) => !todo.completed),
    [state.todos]
  );

  // Skill actions
  const addSkill = useCallback((name: string, level: number) => {
    const newSkill: Skill = {
      id: generateId(),
      name,
      level,
      addedDate: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, skills: [...prev.skills, newSkill] }));
  }, []);

  const updateSkillLevel = useCallback((id: string, level: number) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) =>
        skill.id === id ? { ...skill, level } : skill
      ),
    }));
  }, []);

  const getSkillsCount = useCallback(() => state.skills.length, [state.skills]);

  // Roadmap actions
  const updateRoadmapProgress = useCallback((week: string, progress: number) => {
    setState((prev) => ({
      ...prev,
      roadmap: prev.roadmap.map((item) =>
        item.week === week ? { ...item, progress } : item
      ),
    }));
  }, []);

  const completeRoadmapWeek = useCallback((week: string) => {
    setState((prev) => ({
      ...prev,
      roadmap: prev.roadmap.map((item) =>
        item.week === week
          ? { ...item, progress: 100, status: "completed" as const }
          : item
      ),
    }));
  }, []);

  const getRoadmapProgress = useCallback(() => {
    if (state.roadmap.length === 0) return 0;
    const total = state.roadmap.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(total / state.roadmap.length);
  }, [state.roadmap]);

  // Weekly stats
  const getWeeklyStats = useCallback(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const applicationsThisWeek = state.applications.filter(
      (app) => new Date(app.appliedDate) >= weekAgo
    ).length;

    const todosCompletedThisWeek = state.todos.filter(
      (todo) => todo.completed && new Date(todo.createdAt) >= weekAgo
    ).length;

    const skillsAddedThisWeek = state.skills.filter(
      (skill) => new Date(skill.addedDate) >= weekAgo
    ).length;

    return { applicationsThisWeek, todosCompletedThisWeek, skillsAddedThisWeek };
  }, [state.applications, state.todos, state.skills]);

  const contextValue: TrackerContextType = {
    state,
    dataSource,
    addApplication,
    updateApplicationStatus,
    removeApplication,
    getApplicationCount,
    getApplicationCountByStatus,
    addTodo,
    toggleTodo,
    removeTodo,
    getCompletedTodos,
    getPendingTodos,
    addSkill,
    updateSkillLevel,
    getSkillsCount,
    updateRoadmapProgress,
    completeRoadmapWeek,
    getRoadmapProgress,
    getWeeklyStats,
  };

  return (
    <TrackerContext.Provider value={contextValue}>
      {children}
    </TrackerContext.Provider>
  );
}

// Hook to use the tracker context
export function useTracker() {
  const context = useContext(TrackerContext);
  if (context === undefined) {
    throw new Error("useTracker must be used within a TrackerProvider");
  }
  return context;
}
