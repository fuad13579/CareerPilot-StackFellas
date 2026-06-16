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
  Trash2,
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

interface TrackerApplicationApiResponse {
  id?: string | number | null;
  role?: string | null;
  company?: string | null;
  location?: string | null;
  deadline?: string | null;
  next_action?: string | null;
  notes?: string | null;
  job_description?: string | null;
  required_skills?: unknown;
  job_url?: string | null;
  status?: string | null;
  fit_score?: number | null;
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

function normalizeJobDescription(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<\s*(br|\/p|\/li|\/div|\/section|\/article|\/ul|\/ol)\s*\/?>/gi, "\n")
    .replace(/<\s*(li|p|div|section|article|ul|ol)(?:\s+[^>]*)?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .split(/\s+/)
    .join(" ")
    .trim();
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
  const [removingApplicationId, setRemovingApplicationId] = useState<string>("");

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
          ? (payload as TrackerApplicationApiResponse[]).map((app) => ({
              id: String(app.id),
              role: app.role || "Untitled role",
              company: app.company || "Unknown company",
              location: app.location || "",
              deadline: app.deadline || null,
              nextAction: app.next_action || app.notes || null,
              jobDescription: normalizeJobDescription(app.job_description) || null,
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
        ? (payload as TrackerApplicationApiResponse[]).map((app) => ({
            id: String(app.id),
            role: app.role || "Untitled role",
            company: app.company || "Unknown company",
            location: app.location || "",
            deadline: app.deadline || null,
            nextAction: app.next_action || app.notes || null,
            jobDescription: normalizeJobDescription(app.job_description) || null,
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

  const removeApplication = async (applicationId: string) => {
    setRemovingApplicationId(applicationId);
    setError("");

    try {
      const response = await fetch(`/api/tracker/applications/${encodeURIComponent(applicationId)}`, {
        method: "DELETE",
        headers: getCareerPilotHeaders(),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Failed to remove saved application."));
      }

      const remainingApplications = applications.filter((application) => application.id !== applicationId);
      setApplications(remainingApplications);

      if (selectedApplicationId === applicationId) {
        setSelectedApplicationId(remainingApplications[0]?.id || "");
        setCoverLetter("");
        setEditedLetter("");
        setStatus(remainingApplications.length > 0 ? "idle" : "idle");
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to remove saved application.");
      setStatus("error");
    } finally {
      setRemovingApplicationId("");
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
            normalizeJobDescription(selectedApplication.jobDescription) ||
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

  // Step indicator for UX clarity
  const currentStep = status === "success" ? 3 : selectedApplication ? 2 : 1;

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      {applications.length > 0 && (
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? "text-blue-600" : "text-gray-400"}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>1</span>
            <span className="font-semibold">Select Job</span>
          </div>
          <div className={`h-8 w-8 border-b-2 ${currentStep >= 2 ? "border-blue-600" : "border-gray-300"}`} />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? "text-blue-600" : "text-gray-400"}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>2</span>
            <span className="font-semibold">Generate</span>
          </div>
          <div className={`h-8 w-8 border-b-2 ${currentStep >= 3 ? "border-blue-600" : "border-gray-300"}`} />
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? "text-blue-600" : "text-gray-400"}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>3</span>
            <span className="font-semibold">Copy & Use</span>
          </div>
        </div>
      )}

      {/* No Applications Empty State */}
      {applications.length === 0 && (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-12 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100">
            <Briefcase size={36} className="text-amber-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">No Saved Applications Yet</h3>
          <p className="mx-auto mt-3 max-w-md text-base text-gray-600">
            {NO_APPLICATIONS_MESSAGE}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/jobs"
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Briefcase size={18} /> Find Jobs
            </Link>
            <Link
              href="/tracker"
              className="flex items-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-6 py-3 text-base font-bold text-gray-700 transition-colors hover:border-blue-600 hover:text-blue-600"
            >
              Go to Tracker
            </Link>
          </div>
        </div>
      )}

      {/* Application Selection Grid */}
      {applications.length > 0 && (
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                <Briefcase size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedApplication ? "Job Selected" : "Select a Job"}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  {selectedApplication
                    ? `${selectedApplication.role} at ${selectedApplication.company}`
                    : "Choose one job from your tracker to generate a cover letter"}
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
                <div
                  key={application.id}
                  className={`rounded-2xl border-2 p-5 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2"
                      : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900">{application.role}</p>
                      <p className="text-sm font-medium text-blue-600">{application.company}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {application.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeApplication(application.id)}
                        disabled={removingApplicationId === application.id}
                        className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Remove ${application.role} at ${application.company}`}
                      >
                        {removingApplicationId === application.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
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
                  </div>

                  {application.requiredSkills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {application.requiredSkills.slice(0, 3).map((skill) => (
                        <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {skill}
                        </span>
                      ))}
                      {application.requiredSkills.length > 3 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          +{application.requiredSkills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {isSelected && (
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                        <Check size={12} /> Selected
                      </span>
                    </div>
                  )}
                  {!isSelected && (
                    <button
                      type="button"
                      onClick={() => setSelectedApplicationId(application.id)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50"
                    >
                      Select
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Application Details & Generate Button */}
      {selectedApplication && applications.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                  <PenTool size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Ready to Generate</h3>
                  <p className="text-sm font-medium text-gray-500">
                    {selectedApplication.role} at {selectedApplication.company}
                  </p>
                </div>
              </div>
              <button
                onClick={generateCoverLetter}
                disabled={isGenerating}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> Generate Cover Letter
                  </>
                )}
              </button>
            </div>

            {/* Job Details Preview */}
            <div className="mb-6 flex flex-wrap items-start gap-6 rounded-2xl bg-gray-50 p-6">
              <div className="min-w-[200px] flex-1">
                <p className="text-sm font-bold text-gray-700">Job Description</p>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
                  {normalizeJobDescription(selectedApplication.jobDescription) || "No job description was saved with this application."}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-bold text-gray-700">Required Skills</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedApplication.requiredSkills.length > 0 ? (
                    selectedApplication.requiredSkills.slice(0, 5).map((skill) => (
                      <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Not available</span>
                  )}
                </div>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-bold text-gray-700">Location</p>
                <p className="mt-2 text-sm font-semibold text-gray-700">
                  {selectedApplication.location || "Not specified"}
                </p>
                {selectedApplication.deadline && (
                  <>
                    <p className="mt-3 text-sm font-bold text-gray-700">Deadline</p>
                    <p className="mt-1 text-sm font-semibold text-amber-600">{selectedApplication.deadline}</p>
                  </>
                )}
              </div>
            </div>

            {/* Generation Progress */}
            {status === "generating" && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute -inset-4 animate-ping rounded-full bg-blue-500/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
                      <Loader2 size={28} className="animate-spin text-white" />
                    </div>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-gray-900 text-center">Generating your personalized cover letter</h4>
                <p className="mt-2 text-base font-medium text-gray-600 text-center">
                  Analyzing your CV, job requirements, and skills...
                </p>
                <div className="mx-auto mt-6 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-400" />
                </div>
              </div>
            )}

            {/* Generated Cover Letter */}
            {status === "success" && coverLetter && (
              <div className="space-y-4">
                <div className="mb-4 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    <FileText size={12} /> Based on your CV
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <Briefcase size={12} /> Tailored to job
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    <Sparkles size={12} /> AI-generated draft
                  </span>
                </div>

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

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:border-blue-600 hover:text-blue-600"
                  >
                    {isEditing ? (
                      <>
                        <Check size={16} /> Save Changes
                      </>
                    ) : (
                      <>
                        <PenTool size={16} /> Edit Letter
                      </>
                    )}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    {copied ? (
                      <>
                        <Check size={16} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="mt-1 shrink-0 text-red-600" />
                  <div>
                    <h4 className="text-lg font-bold text-red-800">Generation Failed</h4>
                    <p className="mt-1 text-base font-medium text-red-600">{error}</p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200"
                    >
                      <RefreshCw size={14} /> Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
