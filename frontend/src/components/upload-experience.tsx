"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Upload,
  CloudUpload,
  AlertCircle, 
  X,
  FileJson,
  Sparkles,
  Loader2,
  FileCheck
} from "lucide-react";
import {
  clearPersistedCvSnapshot,
  getPersistedCvSummary,
  persistCvSnapshot,
  type PersistedCvSummary,
} from "./cv-storage";
import { extractSectionEntriesWithFallback } from "./cv-section-parser";
import { getCareerPilotHeaders } from "./user-storage";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface CVSummary {
  filename: string;
  fileType: string;
  analyzedAt?: string;
  extractedText: string;
  profileSummary?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  projects?: string[];
}

interface RagStatus {
  cv_id: string;
  index_exists: boolean;
  embeddings_exists: boolean;
  processed_sections_exists: boolean;
  chunk_count: number;
  sections_indexed: string[];
  embedding_provider?: string | null;
  embedding_model?: string | null;
  last_built_at?: string | null;
}

type RagIndexState = "unknown" | "built" | "failed";

const ACCEPTED_MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const INVALID_CV_FILE_MESSAGE = "Please upload a valid CV file in PDF or DOCX format.";

function normalizeCvSummary(summary: PersistedCvSummary | null): PersistedCvSummary | null {
  if (!summary) return null;

  const experience = extractSectionEntriesWithFallback(
    summary.experience?.join("\n\n"),
    "experience",
    summary.extractedText
  );
  const education = extractSectionEntriesWithFallback(
    summary.education?.join("\n\n"),
    "education",
    summary.extractedText
  );
  const projects = extractSectionEntriesWithFallback(
    summary.projects?.join("\n\n"),
    "projects",
    summary.extractedText
  );

  return {
    ...summary,
    experience: experience.length > 0 ? experience : summary.experience || [],
    education: education.length > 0 ? education : summary.education || [],
    projects: projects.length > 0 ? projects : summary.projects || [],
  };
}

export function UploadExperience() {
  const router = useRouter();
  const persistedSummary = normalizeCvSummary(getPersistedCvSummary());
  const [status, setStatus] = useState<UploadStatus>(persistedSummary ? "success" : "idle");
  const [cvSummary, setCvSummary] = useState<CVSummary | null>(persistedSummary);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
  const [ragWarning, setRagWarning] = useState("");
  const [ragIndexState, setRagIndexState] = useState<RagIndexState>("unknown");
  const [isLoadingRagStatus, setIsLoadingRagStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const expectedMimeType = ACCEPTED_MIME_BY_EXTENSION[extension];
    const mimeType = (file.type || "").toLowerCase();

    if (!expectedMimeType || mimeType !== expectedMimeType) {
      return INVALID_CV_FILE_MESSAGE;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Uploaded CV file is too large. Maximum size is 5 MB.";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setError("");
    setCvSummary(null);
    setRagStatus(null);
    setRagWarning("");
    setRagIndexState("unknown");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cv/upload", {
        method: "POST",
        headers: getCareerPilotHeaders(),
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload and analyze the CV.";
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMessage = Array.isArray(errorData.detail)
              ? errorData.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ")
              : String(errorData.detail);
          }
        } catch {
          const errorText = await response.text().catch(() => "");
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const sectionsResponse = await fetch(`/api/cv/${encodeURIComponent(String(data.cv_id))}/sections`, {
        headers: getCareerPilotHeaders(),
      });
      const sectionsData = sectionsResponse.ok ? await sectionsResponse.json() : null;
      const experienceSections = extractSectionEntriesWithFallback(
        sectionsData?.sections?.experience,
        "experience",
        data.extracted_text
      );
      const educationSections = extractSectionEntriesWithFallback(
        sectionsData?.sections?.education,
        "education",
        data.extracted_text
      );
      const projectSections = extractSectionEntriesWithFallback(
        sectionsData?.sections?.projects,
        "projects",
        data.extracted_text
      );

      // Save CV skills and ID to localStorage for Jobs page
      const snapshot: PersistedCvSummary = {
        filename: data.filename || file.name,
        fileType: data.file_type || file.name.split(".").pop()?.toUpperCase() || "Unknown",
        extractedText: data.extracted_text || "CV extraction successful.",
        analyzedAt: new Date().toISOString(),
        profileSummary: data.profile_summary,
        skills: data.skills || data.extracted_skills || [],
        experience: experienceSections.length > 0 ? experienceSections : data.experience || [],
        education: educationSections.length > 0 ? educationSections : data.education || [],
        projects: projectSections.length > 0 ? projectSections : data.projects || [],
      };
      persistCvSnapshot(snapshot, String(data.cv_id));

      // Notify jobs page of CV update for real-time refresh
      window.dispatchEvent(new Event("careerpilot_cv_updated"));

      const cvSummary: CVSummary = {
        filename: data.filename || file.name,
        fileType: data.file_type || file.name.split(".").pop()?.toUpperCase() || "Unknown",
        extractedText: data.extracted_text || "CV extraction successful.",
        profileSummary: data.profile_summary,
        skills: data.skills || [],
        experience: experienceSections.length > 0 ? experienceSections : data.experience || [],
        education: educationSections.length > 0 ? educationSections : data.education || [],
        projects: projectSections.length > 0 ? projectSections : data.projects || [],
      };

      setRagWarning(
        data.rag_index_built === false && typeof data.rag_warning === "string"
          ? data.rag_warning
          : ""
      );
      setRagIndexState(data.rag_index_built === false ? "failed" : "built");
      setCvSummary(cvSummary);
      setStatus("success");

      setIsLoadingRagStatus(true);
      try {
        const ragResponse = await fetch(
          `/api/rag/status?cv_id=${encodeURIComponent(String(data.cv_id))}`,
          {
            headers: getCareerPilotHeaders(),
            cache: "no-store",
          }
        );
        const ragPayload = await ragResponse.json().catch(() => ({}));
        if (!ragResponse.ok) {
          throw new Error(
            typeof ragPayload.detail === "string"
              ? ragPayload.detail
              : "Failed to load RAG status after upload."
          );
        }

        setRagStatus({
          cv_id: typeof ragPayload.cv_id === "string" ? ragPayload.cv_id : String(data.cv_id),
          index_exists: Boolean(ragPayload.index_exists),
          embeddings_exists: Boolean(ragPayload.embeddings_exists),
          processed_sections_exists: Boolean(ragPayload.processed_sections_exists),
          chunk_count: typeof ragPayload.chunk_count === "number" ? ragPayload.chunk_count : 0,
          sections_indexed: Array.isArray(ragPayload.sections_indexed) ? ragPayload.sections_indexed : [],
          embedding_provider:
            typeof ragPayload.embedding_provider === "string" ? ragPayload.embedding_provider : null,
          embedding_model:
            typeof ragPayload.embedding_model === "string" ? ragPayload.embedding_model : null,
          last_built_at:
            typeof ragPayload.last_built_at === "string" ? ragPayload.last_built_at : null,
        });
      } catch (ragErr) {
        const statusMessage =
          ragErr instanceof Error && ragErr.message
            ? ragErr.message
            : "Failed to load RAG status after upload.";
        setRagWarning((current) => {
          if (current) return current;
          if (data.rag_index_built === false) return statusMessage;
          return "RAG index was created, but live status could not be refreshed.";
        });
        setRagStatus(null);
      } finally {
        setIsLoadingRagStatus(false);
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to upload and analyze the CV. Please try again.";
      setError(message);
      clearPersistedCvSnapshot();
      setCvSummary(null);
      setStatus("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const resetUpload = () => {
    setStatus("idle");
    setCvSummary(null);
    setError("");
    setRagStatus(null);
    setRagWarning("");
    setRagIndexState("unknown");
    setIsLoadingRagStatus(false);
    clearPersistedCvSnapshot();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-8">
      {/* Premium Upload Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-100/50 border border-gray-100">
        {/* Subtle gradient border effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        
        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => status === "idle" && fileInputRef.current?.click()}
          className={`
            relative min-h-[420px] cursor-pointer transition-all duration-300 ease-out
            ${isDragging 
              ? "bg-gradient-to-br from-blue-50 to-blue-100/50" 
              : status === "idle" 
                ? "bg-white hover:bg-gray-50/50"
                : "cursor-default bg-white"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload CV file"
          />

          {/* Idle State */}
          {status === "idle" && (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-12 py-16 text-center">
              {/* Premium Upload Icon with Glow */}
              <div className="relative mb-10">
                <div className="absolute -inset-4 blur-3xl bg-blue-500/10" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-2xl shadow-blue-500/20">
                  <CloudUpload size={44} className="text-white" />
                </div>
              </div>

              {/* Heading */}
              <h2 className="text-4xl font-bold tracking-tight text-gray-900">
                Upload Your CV
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500">
                CareerPilot extracts skills, experience, education, and projects from your CV to power job matching, AI assistant answers, cover letters, and skill gap analysis.
              </p>

              {/* Supported Formats - Premium Cards */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-3 shadow-sm">
                  <FileText size={20} className="text-blue-600" />
                  <span className="text-base font-semibold text-gray-700">PDF</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-3 shadow-sm">
                  <FileJson size={20} className="text-blue-600" />
                  <span className="text-base font-semibold text-gray-700">DOCX</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-3 shadow-sm">
                  <span className="text-base font-medium text-gray-400">Max 10MB</span>
                </div>
              </div>

              {/* Drag & Drop Text */}
              <p className="mt-6 text-sm font-medium text-gray-400">
                Drag & drop your file here, or
              </p>

              {/* Upload Button - Premium */}
              <button className="mt-4 flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-xl">
                <Upload size={16} />
                Select file
              </button>
            </div>
          )}

          {/* Uploading State */}
          {status === "uploading" && (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-12 py-16 text-center">
              <div className="relative mb-10">
                <div className="absolute -inset-4 animate-ping rounded-full bg-blue-500/20" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-2xl">
                  <Loader2 size={44} className="animate-spin text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Analyzing Your CV
              </h2>
              <p className="mt-4 max-w-lg text-xl font-medium text-gray-500">
                Extracting text, chunking by section, detecting skills and experience, and preparing your profile for RAG-based recommendations...
              </p>
              <div className="mt-10 h-2.5 w-80 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500 progress-bar-60" />
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "success" && cvSummary && (
            <div className="p-10">
              <div className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-green-50 shadow-sm">
                    <FileCheck size={30} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">CV analyzed successfully</p>
                    <p className="text-lg font-medium text-gray-500">{cvSummary.filename}</p>
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  aria-label="Upload another CV"
                  title="Upload another CV"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CV Summary Content */}
              <div className="space-y-8">
                {/* Profile Summary */}
                {cvSummary.profileSummary && (
                  <div className="rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/30 p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <Sparkles size={16} className="text-blue-600" />
                      <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
                        Profile Summary
                      </p>
                    </div>
                    <p className="text-base leading-relaxed text-gray-700">
                      {cvSummary.profileSummary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {cvSummary.skills && cvSummary.skills.length > 0 && (
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Skills Identified
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cvSummary.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {cvSummary.experience && cvSummary.experience.length > 0 && (
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Experience
                    </p>
                    <ul className="space-y-3">
                      {cvSummary.experience.map((exp, i) => (
                        <li key={i} className="flex items-start gap-3 text-base text-gray-700">
                          <span className="mt-2 size-2 shrink-0 rounded-full bg-blue-600" />
                          {exp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Projects */}
                {cvSummary.projects && cvSummary.projects.length > 0 && (
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Projects
                    </p>
                    <ul className="space-y-3">
                      {cvSummary.projects.map((project, i) => (
                        <li key={i} className="flex items-start gap-3 text-base text-gray-700">
                          <span className="mt-2 size-2 shrink-0 rounded-full bg-blue-600" />
                          {project}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Education */}
                {cvSummary.education && cvSummary.education.length > 0 && (
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Education
                    </p>
                    <ul className="space-y-3">
                      {cvSummary.education.map((edu, i) => (
                        <li key={i} className="flex items-start gap-3 text-base text-gray-700">
                          <span className="mt-2 size-2 shrink-0 rounded-full bg-blue-600" />
                          {edu}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Raw Extracted Text */}
                <details className="group">
                  <summary className="cursor-pointer text-base font-semibold text-gray-500 hover:text-blue-600">
                    View extracted text
                  </summary>
                  <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl bg-gray-50 border border-gray-100 p-6">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-500">
                      {cvSummary.extractedText}
                    </p>
                  </div>
                </details>

                {/* RAG/Core Message */}
                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/30 p-4 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-700">
                    Your CV is now indexed for CareerPilot agents.
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    This profile will be used by the Job Hunter, AI Assistant, Cover Letter Generator, and Progress Dashboard.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D6E4FF] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-[#64748B]">
                        RAG Index Status
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {isLoadingRagStatus
                          ? "Checking retrieval readiness..."
                          : ragStatus
                            ? ragStatus.index_exists && ragStatus.embeddings_exists
                              ? "Your CV is ready for grounded assistant answers."
                              : "Your CV was uploaded, but the retrieval index is incomplete."
                            : ragWarning ||
                              (ragIndexState === "built"
                                ? "RAG index was created, but live status could not be refreshed."
                                : "RAG status unavailable after upload.")}
                      </p>
                    </div>
                    {ragStatus && (
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          ragStatus.index_exists && ragStatus.embeddings_exists
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            ragStatus.index_exists && ragStatus.embeddings_exists
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {ragStatus.index_exists && ragStatus.embeddings_exists ? "Ready" : "Needs attention"}
                      </span>
                    )}
                  </div>

                  {ragStatus && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                          Chunks
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[#0F172A]">{ragStatus.chunk_count}</p>
                      </div>
                      <div className="rounded-xl bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                          Embeddings
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]">
                          {ragStatus.embedding_provider || "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {ragStatus.embedding_model || "No model metadata"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                          Sections
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]">
                          {ragStatus.sections_indexed.length > 0
                            ? ragStatus.sections_indexed.join(", ")
                            : "None indexed"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                          Last Built
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]">
                          {ragStatus.last_built_at
                            ? new Date(ragStatus.last_built_at).toLocaleString([], {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                  )}

                  {ragWarning && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                      {ragWarning}
                    </div>
                  )}

                  {ragStatus?.embedding_provider === "sklearn-hashing" && (
                    <p className="mt-4 text-xs font-medium text-amber-700">
                      Fallback embeddings are active. Assistant grounding will still work, but semantic retrieval quality is lower than sentence-transformers.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <button
                    onClick={resetUpload}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  >
                    <Upload size={14} />
                    Upload another
                  </button>
                  <button
                    onClick={() => router.push("/assistant")}
                    className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-600"
                  >
                    <FileJson size={14} />
                    Use with Assistant
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-12 py-16 text-center">
              <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-3xl bg-red-50 shadow-lg">
                <AlertCircle size={44} className="text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Upload failed</h2>
              <p className="mt-4 max-w-md text-xl font-medium text-gray-500">{error}</p>
              <div className="mt-10 flex items-center gap-5">
                <button
                  onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                  className="rounded-2xl bg-gray-900 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-blue-600"
                >
                  Try again
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                  className="rounded-2xl border-2 border-gray-200 bg-white px-10 py-4 text-lg font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {status !== "idle" && (
        <div className={`flex items-center justify-between rounded-2xl px-6 py-4 text-base font-medium ${
          status === "uploading" ? "bg-blue-50 text-blue-600" :
          status === "success" ? "bg-green-50 text-green-600" :
          "bg-red-50 text-red-600"
        }`}>
          <span>
            {status === "uploading" && "Extracting and analyzing your CV..."}
            {status === "success" && "CareerPilot can now use your profile across all agents."}
            {status === "error" && "Something went wrong"}
          </span>
          {status === "uploading" && (
            <Loader2 size={20} className="animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}
