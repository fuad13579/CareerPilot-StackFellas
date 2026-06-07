"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

export interface JobApplication {
  id: string | number;
  job_id: string;
  role: string;
  company: string;
  location: string | null;
  status: string;
  fit_score: number | null;
  job_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface JobCardProps {
  application: JobApplication;
  onDelete: (id: string | number) => void;
  isDragging?: boolean;
}

export function JobCard({ application, onDelete, isDragging }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(application.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm
        ${isDragging || isSortableDragging ? "opacity-50 shadow-md ring-2 ring-cyan-500" : ""}
        hover:border-slate-300 hover:shadow-md
      `}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Card Content */}
      <div className="pl-5">
        {/* Header: Role and Delete */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-slate-950">{application.role}</h3>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label="Delete application"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Company */}
        <p className="mt-1 text-sm text-slate-600">{application.company}</p>

        {/* Location */}
        {application.location && (
          <p className="mt-1 text-xs text-slate-500">{application.location}</p>
        )}

        {/* Fit Score Badge */}
        {application.fit_score !== null && (
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                application.fit_score >= 80
                  ? "bg-green-100 text-green-700"
                  : application.fit_score >= 60
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {application.fit_score}% match
            </span>
          </div>
        )}

        {/* Notes Preview */}
        {application.notes && (
          <p className="mt-2 line-clamp-2 text-xs text-slate-500">
            {application.notes}
          </p>
        )}
      </div>
    </div>
  );
}
