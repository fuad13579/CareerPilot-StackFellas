"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { JobCard, JobApplication } from "./job-card";
import { Plus } from "lucide-react";

export const COLUMNS = [
  { id: "Applied", title: "Applied", color: "bg-blue-500" },
  { id: "Interviewing", title: "Interviewing", color: "bg-yellow-500" },
  { id: "Offer", title: "Offer", color: "bg-green-500" },
  { id: "Rejected", title: "Rejected", color: "bg-red-500" },
] as const;

export type ColumnId = (typeof COLUMNS)[number]["id"];

interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  applications: JobApplication[];
  onDelete: (id: string | number) => void;
  onAddClick: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  applications,
  onDelete,
  onAddClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex h-full min-w-[280px] max-w-[320px] flex-col rounded-xl bg-slate-50">
      {/* Column Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${column.color}`} />
          <h2 className="font-semibold text-slate-800">{column.title}</h2>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
            {applications.length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(column.id)}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          aria-label={`Add application to ${column.title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 space-y-3 ${
          isOver ? "bg-cyan-50 ring-2 ring-cyan-200 ring-inset" : ""
        }`}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <JobCard key={app.id} application={app} onDelete={onDelete} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
            Drop applications here
          </div>
        )}
      </div>
    </div>
  );
}
