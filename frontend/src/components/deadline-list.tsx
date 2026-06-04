"use client";

import { useEffect, useState } from "react";
import { CalendarEvent, CreateEventRequest } from "@/types/productivity";
import { Calendar, X, AlertCircle, Clock } from "lucide-react";

interface JobApplication {
  id: number;
  role: string;
  company: string;
}

interface DeadlineListProps {
  events: CalendarEvent[];
  onCreate: (data: CreateEventRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  linkedApplications?: JobApplication[];
}

export function DeadlineList({
  events,
  onCreate,
  onDelete,
  linkedApplications = [],
}: DeadlineListProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [linkedType, setLinkedType] = useState("");
  const [linkedId, setLinkedId] = useState<number | undefined>(undefined);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [pendingDeleteTimeout, setPendingDeleteTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const beginDelete = (id: number) => {
    if (pendingDeleteTimeout) clearTimeout(pendingDeleteTimeout);
    setConfirmingDeleteId(id);
    const timeout = setTimeout(() => setConfirmingDeleteId(null), 3000);
    setPendingDeleteTimeout(timeout);
  };

  const cancelDelete = () => {
    if (pendingDeleteTimeout) clearTimeout(pendingDeleteTimeout);
    setPendingDeleteTimeout(null);
    setConfirmingDeleteId(null);
  };

  const confirmDelete = async (id: number) => {
    if (pendingDeleteTimeout) clearTimeout(pendingDeleteTimeout);
    setPendingDeleteTimeout(null);
    setConfirmingDeleteId(null);
    await onDelete(id);
  };

  useEffect(() => {
    return () => {
      if (pendingDeleteTimeout) clearTimeout(pendingDeleteTimeout);
    };
  }, [pendingDeleteTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      event_date: eventDate,
      linked_type: linkedType || undefined,
      related_application_id: linkedType === "application" ? linkedId : undefined,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setEventDate("");
    setLinkedType("");
    setLinkedId(undefined);
    setShowForm(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Overdue</span>;
    }
    if (daysUntil === 0) {
      return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Today</span>;
    }
    if (daysUntil <= 3) {
      return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">{daysUntil}d left</span>;
    }
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{daysUntil}d</span>;
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  const linkedApplicationMap = new Map(
    linkedApplications.map((app) => [app.id, app])
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Deadlines</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Calendar className="h-4 w-4" />
          Add Deadline
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div>
            <label htmlFor="deadline-title" className="block text-sm font-medium text-slate-700">Title *</label>
            <input
              id="deadline-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Interview with Google"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="deadline-date" className="block text-sm font-medium text-slate-700">Date *</label>
            <input
              id="deadline-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="deadline-notes" className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              id="deadline-notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional details..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Link to (optional)</label>
            <select
              aria-label="Link type"
              value={linkedType}
              onChange={(e) => {
                setLinkedType(e.target.value);
                setLinkedId(undefined);
              }}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">No link</option>
              <option value="application">Job Application</option>
            </select>

            {linkedType === "application" && linkedApplications.length > 0 && (
              <select
                aria-label="Linked application"
                value={linkedId || ""}
                onChange={(e) => setLinkedId(Number(e.target.value) || undefined)}
                className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Add Deadline
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      {sortedEvents.length > 0 ? (
        <div className="space-y-2">
          {sortedEvents.map((event) => {
            const daysUntil = getDaysUntil(event.event_date);
            const linkedApp = event.related_application_id
              ? linkedApplicationMap.get(event.related_application_id)
              : null;

            return (
              <div
                key={event.id}
                className={`group flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition ${
                  daysUntil < 0 ? "border-red-200" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {daysUntil < 0 ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : daysUntil <= 3 ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Calendar className="h-5 w-5 text-slate-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-950">{event.title}</h3>
                    {getStatusBadge(daysUntil)}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{formatDate(event.event_date)}</p>
                  {linkedApp && (
                    <p className="mt-1 text-xs text-slate-500">
                      {linkedApp.company} - {linkedApp.role}
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-1 text-xs text-slate-500">{event.description}</p>
                  )}
                </div>

                {confirmingDeleteId === event.id ? (
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label="Confirm delete deadline"
                  >
                    <button
                      type="button"
                      onClick={() => confirmDelete(event.id)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                      aria-label="Confirm delete"
                      autoFocus
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      aria-label="Cancel delete"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => beginDelete(event.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete deadline"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No deadlines scheduled</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            Add a deadline
          </button>
        </div>
      )}
    </div>
  );
}