"use client";

import { useState, useRef, useCallback } from "react";
import { 
  FileText, 
  Upload,
  CloudUpload,
  CheckCircle2, 
  AlertCircle, 
  X,
  FileJson,
  Sparkles,
  Loader2,
  FileCheck
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface CVSummary {
  filename: string;
  fileType: string;
  extractedText: string;
  profileSummary?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadExperience() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cvSummary, setCvSummary] = useState<CVSummary | null>(null);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return `Unsupported file type. Please upload ${ACCEPTED_EXTENSIONS.join(" or ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
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

    setSelectedFile(file);
    setStatus("uploading");
    setError("");
    setCvSummary(null);

    try {
      // Backend integration point: POST /api/cv/upload
      const formData = new FormData();
      formData.append("file", file);

      // TODO: Connect to backend when endpoint is ready
      // const response = await fetch("/api/cv/upload", {
      //   method: "POST",
      //   body: formData,
      // });
      // if (!response.ok) throw new Error("Upload failed");
      // const data = await response.json();

      // Mock response for demonstration (remove when backend is connected)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mockSummary: CVSummary = {
        filename: file.name,
        fileType: file.name.endsWith(".pdf") ? "PDF" : "DOCX",
        extractedText: "CV extraction successful. The document contains standard resume sections including professional summary, work experience, education, and skills.",
        profileSummary: "Experienced full-stack developer with 5+ years building scalable web applications.",
        skills: ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "AWS"],
        experience: ["Senior Developer at Tech Corp", "Full Stack Developer at StartupXYZ"],
        education: ["B.S. Computer Science, State University"],
      };

      setCvSummary(mockSummary);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setStatus("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const resetUpload = () => {
    setStatus("idle");
    setSelectedFile(null);
    setCvSummary(null);
    setError("");
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
            accept={[...ACCEPTED_TYPES, ...ACCEPTED_EXTENSIONS].join(",")}
            onChange={handleFileSelect}
            className="hidden"
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
              <h2 className="text-[56px] font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                Resume intake
              </h2>
              <p className="mt-5 max-w-xl text-xl font-medium leading-relaxed text-gray-500">
                Upload your resume or paste a job description to extract skills, experience, and requirements.
              </p>

              {/* Supported Formats - Premium Cards */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
              <p className="mt-8 text-lg font-medium text-gray-400">
                Drag & drop your file here, or
              </p>

              {/* Upload Button - Premium */}
              <button className="mt-6 flex items-center gap-3 rounded-2xl bg-gray-900 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-blue-600 hover:shadow-xl">
                <Upload size={20} />
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
                Processing {selectedFile?.name}
              </h2>
              <p className="mt-4 max-w-lg text-xl font-medium text-gray-500">
                Extracting text, analyzing content, and building your profile summary...
              </p>
              <div className="mt-10 h-2.5 w-80 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500" style={{ width: "60%" }} />
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
                    <p className="text-xl font-bold text-gray-900">Upload complete</p>
                    <p className="text-lg font-medium text-gray-500">{cvSummary.filename}</p>
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CV Summary Content */}
              <div className="space-y-8">
                {/* Profile Summary */}
                {cvSummary.profileSummary && (
                  <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100/30 p-7 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <Sparkles size={18} className="text-blue-600" />
                      <p className="text-base font-bold uppercase tracking-widest text-blue-600">
                        Profile Summary
                      </p>
                    </div>
                    <p className="text-xl font-medium leading-relaxed text-gray-700">
                      {cvSummary.profileSummary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {cvSummary.skills && cvSummary.skills.length > 0 && (
                  <div>
                    <p className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Skills Identified
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {cvSummary.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-xl bg-gray-100 px-4 py-2.5 text-base font-semibold text-gray-700"
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
                    <p className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Experience
                    </p>
                    <ul className="space-y-4">
                      {cvSummary.experience.map((exp, i) => (
                        <li key={i} className="flex items-start gap-4 text-lg text-gray-700">
                          <span className="mt-2.5 size-2.5 shrink-0 rounded-full bg-blue-600" />
                          {exp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Education */}
                {cvSummary.education && cvSummary.education.length > 0 && (
                  <div>
                    <p className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-500">
                      Education
                    </p>
                    <ul className="space-y-4">
                      {cvSummary.education.map((edu, i) => (
                        <li key={i} className="flex items-start gap-4 text-lg text-gray-700">
                          <span className="mt-2.5 size-2.5 shrink-0 rounded-full bg-blue-600" />
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

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-5 pt-6">
                  <button
                    onClick={resetUpload}
                    className="flex items-center gap-3 rounded-2xl bg-gray-900 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-blue-600"
                  >
                    <Upload size={18} />
                    Upload another
                  </button>
                  <button className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 text-lg font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-600">
                    <FileJson size={18} />
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
            {status === "uploading" && "Processing your CV..."}
            {status === "success" && "CV extracted and analyzed successfully"}
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
