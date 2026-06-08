"use client";

import { useState } from "react";
import { Todo, CreateTodoRequest } from "@/types/productivity";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { TodoItem } from "./todo-item";
import { TodoForm } from "./todo-form";

interface JobApplication {
  id: number;
  role: string;
  company: string;
}

interface TodoListProps {
  todos: Todo[];
  onCreate: (data: CreateTodoRequest) => Promise<void>;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, data: Partial<Todo>) => Promise<void>;
  linkedApplications?: JobApplication[];
}

export function TodoList({
  todos,
  onCreate,
  onToggle,
  onDelete,
  onUpdate,
  linkedApplications = [],
}: TodoListProps) {
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (data: CreateTodoRequest) => {
    await onCreate(data);
    setShowForm(false);
  };

  const pendingTodos = todos.filter((t) => !t.is_completed);
  const completedTodos = todos.filter((t) => t.is_completed);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Todos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          Add Todo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <TodoForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          linkedApplications={linkedApplications}
        />
      )}

      {/* Pending todos */}
      {pendingTodos.length > 0 ? (
        <div className="space-y-2">
          {pendingTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
              linkedApplications={linkedApplications}
            />
          ))}
        </div>
      ) : !showForm ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <Circle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-500" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No pending todos</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            Add your first todo
          </button>
        </div>
      ) : null}

      {/* Completed todos */}
      {completedTodos.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Completed ({completedTodos.length})
          </h3>
          {completedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
              linkedApplications={linkedApplications}
            />
          ))}
        </div>
      )}
    </div>
  );
}
