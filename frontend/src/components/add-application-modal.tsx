"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { X } from "lucide-react";
import { COLUMNS } from "./kanban-column";

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    role: string;
    company: string;
    location?: string;
    notes?: string;
  }) => void;
  defaultColumn: string;
}

export function AddApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  defaultColumn,
}: AddApplicationModalProps) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape; restore focus to the previously-focused element on
  // unmount. Without this, keyboard users can only escape the modal by
  // tabbing out, which is hostile to screen readers.
  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    // Move focus into the dialog so keyboard users land somewhere sensible.
    modalRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      previousActive?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role.trim() || !company.trim()) return;

    setIsSubmitting(true);
    await onSubmit({
      role: role.trim(),
      company: company.trim(),
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setIsSubmitting(false);

    // Reset form
    setRole("");
    setCompany("");
    setLocation("");
    setNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-application-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl outline-none dark:border dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 id="add-application-title" className="text-lg font-semibold text-slate-950 dark:text-slate-100">Add Application</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Adding to{" "}
              <span className="font-medium">
                {COLUMNS.find((c) => c.id === defaultColumn)?.title || defaultColumn}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Job Title / Role <span className="text-red-500">*</span>
            </label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </div>

          <div>
            <label
              htmlFor="company"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Company <span className="text-red-500">*</span>
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA (Remote Optional)"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this application..."
              rows={3}
              className="mt-1 block w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !role.trim() || !company.trim()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
