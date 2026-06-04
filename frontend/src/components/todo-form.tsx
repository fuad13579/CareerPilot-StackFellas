"use client";

import { useState } from "react";
import { CreateTodoRequest } from "@/types/productivity";
import { Calendar, Link2 } from "lucide-react";

interface JobApplication {
  id: number;
  role: string;
  company: string;
}

interface TodoFormProps {
  onSubmit: (data: CreateTodoRequest) => void;
  onCancel?: () => void;
  linkedApplications?: JobApplication[];
  initialData?: {
    title?: string;
    description?: string;
    due_date?: string;
    linked_type?: string;
    linked_id?: number;
  };
}

export function TodoForm({
  onSubmit,
  onCancel,
  linkedApplications = [],
  initialData,
}: TodoFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");
  const [linkedType, setLinkedType] = useState(initialData?.linked_type || "");
  const [linkedId, setLinkedId] = useState<number | undefined>(
    initialData?.linked_id || undefined
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      linked_type: linkedType || undefined,
      linked_id: linkedId,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {/* Title */}
      <div>
        <label htmlFor="todo-title" className="block text-sm font-medium text-slate-700">
          Title *
        </label>
        <input
          id="todo-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="todo-desc" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="todo-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          rows={2}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Due date */}
      <div>
        <label htmlFor="todo-due" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Calendar className="h-4 w-4" />
          Due Date
        </label>
        <input
          id="todo-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Link to item */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Link2 className="h-4 w-4" />
          Link to (optional)
        </label>

        <div className="mt-2 space-y-2">
          <select
            aria-label="Link type"
            value={linkedType}
            onChange={(e) => {
              setLinkedType(e.target.value);
              setLinkedId(undefined);
            }}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">No link</option>
            <option value="application">Job Application</option>
          </select>

          {linkedType === "application" && linkedApplications.length > 0 && (
            <select
              aria-label="Linked application"
              value={linkedId || ""}
              onChange={(e) => setLinkedId(Number(e.target.value) || undefined)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select application...</option>
              {linkedApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company} - {app.role}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Add Todo
        </button>
      </div>
    </form>
  );
}