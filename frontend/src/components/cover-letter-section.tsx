"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  Check,
  Copy,
  FileText,
  Loader2,
  PenTool,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getPersistedCvId } from "./cv-storage";
import { getCareerPilotHeaders } from "./user-storage";

type CoverLetterStatus = "idle" | "loading-applications" | "generating" | "success" | "error";

interface TrackerApplication {
  id: string;
  role: string;
  company: string;
  location: string;
  deadline: string | null;
  nextAction: string | null;
  jobDescription: string | null;
  requiredSkills: string[];
  jobUrl: string | null;
  status: string;
  fitScore: number | null;
  notes: string | null;
}

interface CoverLetterResponse {
  cover_letter: string;
  cv_id: string;
  job_title: string;
  company: string;
  used_context?: string | null;
}

const NO_CV_MESSAGE = "Please upload your CV first.";
const NO_APPLICATIONS_MESSAGE =
  "Save a job to your tracker first to generate a personalized cover letter.";

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const detail = "detail" in payload ? (payload as { detail?: unknown }).detail : undefined;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            const msg = (item as { msg?: unknown }).msg;
            return typeof msg === "string" ? msg : "";
          }
          return "";
        })
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
    if ("message" in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
  }

  return fallback;
}

function formatRequiredSkills(skills: string[]): string {
  return skills.length > 0 ? skills.slice(0, 6).join(", ") : "Not provided";
}

export function CoverLetterSection() {
  const [status, setStatus] = useState<CoverLetterStatus>("loading-applications");
  const [applications, setApplications] = useState<TrackerApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedLetter, setEditedLetter] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const cvId = getPersistedCvId();
  const hasCv = Boolean(cvId);

  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      if (!hasCv) {
        if (isMounted) {
          setApplications([]);
          setSelectedApplicationId("");
          setStatus("idle");
        }
        return;
      }

      if (isMounted) {
        setStatus("loading-applications");
        setError("");
      }

      try {
        const response = await fetch("/api/tracker/applications", {
          headers: getCareerPilotHeaders(),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(extractErrorMessage(payload, "Failed to load saved applications."));
        }

        const mappedApplications = Array.isArray(payload)
          ? payload.map((app: any) => ({
              id: String(app.id),
              role: app.role || "Untitled role",
              company: app.company || "Unknown company",
              location: app.location || "",
              deadline: app.deadline || null,
              nextAction: app.next_action || app.notes || null,
              jobDescription: app.job_description || null,
              requiredSkills: Array.isArray(app.required_skills) ? app.required_skills : [],
              jobUrl: app.job_url || null,
              status: app.status || "Saved",
              fitScore: typeof app.fit_score === "number" ? app.fit_score : null,
              notes: app.notes || null,
            }))
          : [];

        if (!isMounted) return;
        setApplications(mappedApplications);
        setSelectedApplicationId((current) => current || mappedApplications[0]?.id || "");
        setStatus("idle");
      } catch (err) {
        if (!isMounted) return;
        setApplications([]);
        setSelectedApplicationId("");
        setError(err instanceof Error && err.message ? err.message : "Failed to load saved applications.");
        setStatus("error");
      }
    };

    void loadApplications();

    return () => {
      isMounted = false;
    };
  }, [hasCv]);

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === selectedApplicationId) || null,
    [applications, selectedApplicationId]
  );

  const refreshApplications = async () => {
    if (!hasCv) return;
    setIsRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/tracker/applications", {
        headers: getCareerPilotHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Failed to load saved applications."));
      }

      const mappedApplications = Array.isArray(payload)
        ? payload.map((app: any) => ({
            id: String(app.id),
            role: app.role || "Untitled role",
            company: app.company || "Unknown company",
            location: app.location || "",
            deadline: app.deadline || null,
            nextAction: app.next_action || app.notes || null,
            jobDescription: app.job_description || null,
            requiredSkills: Array.isArray(app.required_skills) ? app.required_skills : [],
            jobUrl: app.job_url || null,
            status: app.status || "Saved",
            fitScore: typeof app.fit_score === "number" ? app.fit_score : null,
            notes: app.notes || null,
          }))
        : [];

      setApplications(mappedApplications);
      setSelectedApplicationId((current) => current || mappedApplications[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to load saved applications.");
      setStatus("error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateCoverLetter = async () => {
    if (!hasCv) {
      setError(NO_CV_MESSAGE);
      setStatus("error");
      return;
    }

    if (!selectedApplication) {
      setError(NO_APPLICATIONS_MESSAGE);
      setStatus("error");
      return;
    }

    setIsGenerating(true);
    setStatus("generating");
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: {
          ...getCareerPilotHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cv_id: cvId,
          job_title: selectedApplication.role,
          company: selectedApplication.company,
          job_description:
            selectedApplication.jobDescription ||
            selectedApplication.nextAction ||
            selectedApplication.notes ||
            "Saved tracker application",
          location: selectedApplication.location || undefined,
          required_skills: selectedApplication.requiredSkills,
          job_url: selectedApplication.jobUrl || undefined,
          application_id: selectedApplication.id,
          next_action: selectedApplication.nextAction || undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as CoverLetterResponse | { detail?: unknown };
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Failed to generate a cover letter."));
      }

      const generatedLetter =
        typeof (payload as CoverLetterResponse).cover_letter === "string" &&
        (payload as CoverLetterResponse).cover_letter.trim()
          ? (payload as CoverLetterResponse).cover_letter
          : "The backend did not return a cover letter.";

      setCoverLetter(generatedLetter);
      setEditedLetter(generatedLetter);
      setIsEditing(false);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to generate a cover letter.");
      setStatus("error");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    const textToCopy = isEditing ? editedLetter : coverLetter;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy");
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedLetter(coverLetter);
      setIsEditing(true);
      return;
    }

    if (editedLetter !== coverLetter) {
      setCoverLetter(editedLetter);
    }
    setIsEditing(false);
  };

  if (!hasCv) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{NO_CV_MESSAGE}</p>
              <Link href="/upload" className="mt-1 inline-flex text-sm font-semibold text-amber-900 underline underline-offset-4">
                Go to CV upload
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading-applications") {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3 text-gray-700">
          <Loader2 size={18} className="animate-spin text-[#1D4ED8]" />
          <span className="text-sm font-semibold">Loading saved tracker applications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {applications.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{NO_APPLICATIONS_MESSAGE}</p>
              <p className="mt-1 text-xs text-amber-700">
                Save a job from the Jobs page or add one in Tracker, then come back here.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                  <PenTool size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Your Personalized Cover Letter</h3>
                  <p className="text-sm font-medium text-gray-500">
                    {selectedApplication.role} at {selectedApplication.company}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {status === "success" && (
                  <>
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-blue-600"
                    >
                      {isEditing ? (
                        <>
                          <Check size={16} /> Save
                        </>
                      ) : (
                        <>
                          <PenTool size={16} /> Edit
                        </>
                      )}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      {copied ? (
                        <>
                          <Check size={16} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} /> Copy
                        </>
                      )}
                    </button>
                  </>
                )}
                {status === "error" && (
                  <button
                    onClick={() => setStatus("idle")}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    <RefreshCw size={16} /> Try Again
                  </button>
                )}
              </div>
            </div>

            {status === "success" && (
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  <FileText size={12} /> Based on saved tracker application
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <Briefcase size={12} /> Uses selected job data
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  <TrendingUp size={12} /> Uses tracker history
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  <Sparkles size={12} /> Personalized draft
                </span>
              </div>
            )}

            {status === "generating" && (
              <div className="py-12 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute -inset-4 animate-ping rounded-full bg-blue-500/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
                      <Loader2 size={28} className="animate-spin text-white" />
                    </div>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-gray-900">Generating your personalized cover letter</h4>
                <p className="mt-2 text-base font-medium text-gray-500">
                  Analyzing your CV, tracker record, and selected job requirements...
                </p>
                <div className="mx-auto mt-6 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                  <div className="progress-bar-70 h-full animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-400" />
                </div>
              </div>
            )}

            {status === "success" && coverLetter && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                {isEditing ? (
                  <textarea
                    value={editedLetter}
                    onChange={(e) => setEditedLetter(e.target.value)}
                    aria-label="Edit cover letter"
                    placeholder="Edit your cover letter here..."
                    className="min-h-80 w-full resize-none rounded-xl border border-gray-300 p-4 text-base leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-gray-700">
                    {coverLetter}
                  </pre>
                )}
              </div>
            )}

            {status === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="mt-1 shrink-0 text-red-600" />
                  <div>
                    <h4 className="text-lg font-bold text-red-800">Generation Failed</h4>
                    <p className="mt-1 text-base font-medium text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
              <Briefcase size={22} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Select a saved application</h3>
              <p className="text-sm font-medium text-gray-500">
                Choose one job from your tracker to generate a tailored cover letter.
              </p>
            </div>
          </div>
          <button
            onClick={refreshApplications}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-blue-600 disabled:opacity-50"
          >
            <Loader2 size={16} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {applications.map((application) => {
            const isSelected = application.id === selectedApplicationId;
            return (
              <button
                key={application.id}
                onClick={() => setSelectedApplicationId(application.id)}
                className={`rounded-2xl border-2 p-5 text-left transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-400"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{application.role}</p>
                    <p className="text-sm font-medium text-blue-600">{application.company}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
                    {application.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-500">Location</span>
                    <span className="font-semibold text-gray-700">{application.location || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-500">Fit score</span>
                    <span className="font-semibold text-gray-700">
                      {typeof application.fitScore === "number" ? `${application.fitScore}%` : "Not scored"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-500">Deadline</span>
                    <span className="font-semibold text-gray-700">{application.deadline || "Not set"}</span>
                  </div>
                </div>

                {(application.requiredSkills.length > 0 || application.jobUrl) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {application.requiredSkills.slice(0, 3).map((skill) => (
                      <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {skill}
                      </span>
                    ))}
                    {application.jobUrl && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Apply URL saved
                      </span>
                    )}
                  </div>
                )}

                {selectedApplicationId === application.id && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Selected
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedApplication && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-6">
            <div className="mb-4 flex flex-wrap items-start gap-6">
              <div className="min-w-[220px] flex-1">
                <p className="text-sm font-bold text-gray-700">Job Description</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {selectedApplication.jobDescription || "No job description was saved with this application."}
                </p>
              </div>
              <div className="min-w-[220px] flex-1">
                <p className="text-sm font-bold text-gray-700">Required Skills</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedApplication.requiredSkills.length > 0 ? (
                    selectedApplication.requiredSkills.map((skill) => (
                      <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Not available</span>
                  )}
                </div>
              </div>
              <div className="min-w-[220px] flex-1">
                <p className="text-sm font-bold text-gray-700">Apply URL</p>
                <p className="mt-2 break-all text-sm text-gray-600">
                  {selectedApplication.jobUrl || "Not available"}
                </p>
              </div>
            </div>

            <button
              onClick={generateCoverLetter}
              disabled={isGenerating}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-lg hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <PenTool size={20} /> Generate Cover Letter
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
