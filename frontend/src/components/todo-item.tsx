"use client";

import { useState } from "react";
import { Todo } from "@/types/productivity";
import { CheckCircle2, Circle, Trash2, Calendar, Link2, Edit2 } from "lucide-react";
import { TodoForm } from "./todo-form";
import { parseGoalMetadata } from "./productivity-goals";

interface JobApplication {
  id: number;
  role: string;
  company: string;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<Todo>) => void;
  linkedApplications?: JobApplication[];
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onUpdate,
  linkedApplications = [],
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleToggle = () => {
    onToggle(todo.id, !todo.is_completed);
  };

  const handleDelete = () => {
    onDelete(todo.id);
  };

  const handleUpdate = (data: { title?: string; description?: string; due_date?: string }) => {
    onUpdate(todo.id, data);
    setIsEditing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return "Overdue";
    if (diff === 0) return "Due today";
    if (diff === 1) return "Due tomorrow";
    return `${diff} days left`;
  };

  const linkedApplication = todo.linked_type === "application" && todo.linked_id
    ? linkedApplications.find((app) => app.id === todo.linked_id)
    : null;
  const goalMeta = parseGoalMetadata(todo.description);

  if (isEditing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <TodoForm
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
          linkedApplications={linkedApplications}
          initialData={{
            title: todo.title,
            description: todo.description || undefined,
            due_date: todo.due_date || undefined,
            linked_type: todo.linked_type || undefined,
            linked_id: todo.linked_id || undefined,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`group rounded-lg border bg-white p-4 shadow-sm transition ${
        todo.is_completed
          ? "border-green-200 bg-green-50/50"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Completion checkbox */}
        <button
          onClick={handleToggle}
          className="mt-0.5 shrink-0 text-slate-400 transition-colors hover:text-cyan-600"
          aria-label={todo.is_completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {todo.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3
            className={`font-medium ${
              todo.is_completed ? "text-slate-500 line-through" : "text-slate-950"
            }`}
          >
            {todo.title}
          </h3>

          {goalMeta.goal && (
            <div className="mt-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${goalMeta.goal.tone}`}>
                {goalMeta.goal.label}
              </span>
            </div>
          )}

          {/* Description */}
          {goalMeta.cleanDescription && (
            <p className="mt-1 text-sm text-slate-600">{goalMeta.cleanDescription}</p>
          )}

          {/* Meta info */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {/* Due date */}
            {todo.due_date && (
              <span
                className={`flex items-center gap-1 ${
                  getDaysUntil(todo.due_date) === "Overdue" && !todo.is_completed
                    ? "text-red-600 font-medium"
                    : ""
                }`}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(todo.due_date)}
                {!todo.is_completed && (
                  <span className="ml-1">· {getDaysUntil(todo.due_date)}</span>
                )}
              </span>
            )}

            {/* Link */}
            {todo.linked_type && todo.linked_id && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {todo.linked_type === "application" && linkedApplication
                  ? `${linkedApplication.company} - ${linkedApplication.role}`
                  : todo.linked_type === "goal"
                    ? "Career Goal"
                    : todo.linked_type}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Edit todo"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label="Delete todo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
