"use client";

import { TodoStats } from "@/types/productivity";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface ProgressWidgetProps {
  stats: TodoStats | null;
}

export function ProgressWidget({ stats }: ProgressWidgetProps) {
  if (!stats) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-20 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  const progressColor =
    stats.progress_percentage >= 80
      ? "bg-green-500"
      : stats.progress_percentage >= 50
        ? "bg-yellow-500"
        : "bg-cyan-600";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-slate-600">Task Progress</h3>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-900">
            {stats.progress_percentage}%
          </span>
          <span className="text-slate-500">
            {stats.completed} of {stats.total} completed
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${stats.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <Circle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {stats.total}
          </p>
          <p className="text-xs text-slate-500">Total</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-1 text-lg font-semibold text-green-600">
            {stats.completed}
          </p>
          <p className="text-xs text-slate-500">Done</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1 text-lg font-semibold text-amber-600">
            {stats.remaining}
          </p>
          <p className="text-xs text-slate-500">Remaining</p>
        </div>
      </div>
    </div>
  );
}