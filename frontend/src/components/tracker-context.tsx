"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// Types
export interface Application {
  id: string;
  role: string;
  company: string;
  location: string;
  fitScore: number;
  deadline: string;
  nextAction: string;
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

const STORAGE_KEY = "careerpilot_tracker_state";

// Default state
const defaultState: TrackerState = {
  applications: [],
  todos: [
    { id: "1", task: "Apply to saved Frontend Developer role", priority: "high", completed: false, due: "Tomorrow", createdAt: new Date().toISOString() },
    { id: "2", task: "Update CV project section", priority: "medium", completed: false, due: "In 2 days", createdAt: new Date().toISOString() },
    { id: "3", task: "Finish DSA practice module", priority: "medium", completed: false, due: "In 3 days", createdAt: new Date().toISOString() },
    { id: "4", task: "Follow up with TechCorp recruiter", priority: "low", completed: false, due: "In 4 days", createdAt: new Date().toISOString() },
  ],
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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ ...defaultState, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load tracker state:", error);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save tracker state:", error);
      }
    }
  }, [state, isInitialized]);

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Application actions
  const addApplication = useCallback((app: Omit<Application, "id" | "appliedDate">) => {
    const newApp: Application = {
      ...app,
      id: generateId(),
      appliedDate: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, applications: [...prev.applications, newApp] }));
  }, []);

  const updateApplicationStatus = useCallback((id: string, status: Application["status"]) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.map((app) =>
        app.id === id ? { ...app, status } : app
      ),
    }));
  }, []);

  const removeApplication = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.filter((app) => app.id !== id),
    }));
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
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }));
  }, []);

  const removeTodo = useCallback((id: string) => {
    setState((prev) => ({ ...prev, todos: prev.todos.filter((todo) => todo.id !== id) }));
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