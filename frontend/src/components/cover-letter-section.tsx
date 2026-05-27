"use client";

import { useState } from "react";
import { 
  Loader2, PenTool, Copy, Check,
  RefreshCw, AlertTriangle, Briefcase
} from "lucide-react";

type CoverLetterStatus = "idle" | "generating" | "success" | "error";

interface JobDetails {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
}

const MOCK_JOBS: JobDetails[] = [
  { id: "1", title: "Frontend Developer", company: "Vercel", location: "Remote", description: "Build next-gen web applications with React and TypeScript" },
  { id: "2", title: "Product Engineer", company: "Linear", location: "New York, NY", description: "Join our team building the future of project management tools" },
  { id: "3", title: "Full Stack Developer", company: "Stripe", location: "Seattle, WA", description: "Help build payment infrastructure" },
];

const MOCK_COVER_LETTER = `Dear Hiring Manager,

I am writing to express my strong interest in the [Position] role at [Company]. With my background in full-stack development, I am confident in my ability to contribute to your team.

Throughout my career, I have developed expertise in React, TypeScript, and Node.js, consistently delivering high-quality solutions. My experience includes architecting pixel-perfect UIs and collaborating with cross-functional teams.

I am particularly excited about [Company]'s mission and would welcome the opportunity to discuss how my skills align with your needs.

Thank you for considering my application.

Best regards`;

export function CoverLetterSection() {
  const [coverLetterStatus, setCoverLetterStatus] = useState<CoverLetterStatus>("idle");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [coverLetterError, setCoverLetterError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedLetter, setEditedLetter] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [fitScore, setFitScore] = useState<number>(0);
  const [analyzingJob, setAnalyzingJob] = useState(false);

  const analyzeJobFit = async (job: JobDetails) => {
    setAnalyzingJob(true);
    // TODO: Connect to backend: POST /api/analyze-fit
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setFitScore(Math.floor(Math.random() * 30) + 70);
    setSelectedJob(job);
    setAnalyzingJob(false);
  };

  const generateCoverLetter = async () => {
    if (!selectedJob) return;
    setCoverLetterStatus("generating");
    setCoverLetterError("");
    try {
      // TODO: Connect to backend: POST /api/cover-letter/generate
      // const response = await fetch("http://localhost:5000/api/cover-letter/generate", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     cv_id: cvSummary.cv_id,
      //     job_title: selectedJob.title,
      //     company: selectedJob.company,
      //     job_description: selectedJob.description,
      //   }),
      // });
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const personalizedLetter = MOCK_COVER_LETTER
        .replace("[Position]", selectedJob.title)
        .replace("[Company]", selectedJob.company);
      setCoverLetter(personalizedLetter);
      setCoverLetterStatus("success");
    } catch (err) {
      setCoverLetterError(err instanceof Error ? err.message : "Failed to generate");
      setCoverLetterStatus("error");
    }
  };

  const copyToClipboard = async () => {
    const textToCopy = isEditing ? editedLetter : coverLetter;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCoverLetterError("Failed to copy");
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) setEditedLetter(coverLetter);
    else if (editedLetter !== coverLetter) setCoverLetter(editedLetter);
    setIsEditing(!isEditing);
  };

  return (
    <div className="space-y-8">
      {/* Cover Letter Section */}
      {coverLetterStatus !== "idle" && (
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl border border-gray-100">
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                  <PenTool size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Cover Letter</h3>
                  <p className="text-sm font-medium text-gray-500">{selectedJob?.title} at {selectedJob?.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {coverLetterStatus === "success" && (
                  <>
                    <button onClick={handleEditToggle} className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-blue-600">
                      {isEditing ? <><Check size={16} /> Save</> : <><PenTool size={16} /> Edit</>}
                    </button>
                    <button onClick={copyToClipboard} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                      {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                    </button>
                  </>
                )}
                {coverLetterStatus === "error" && (
                  <button onClick={() => setCoverLetterStatus("idle")} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">
                    <RefreshCw size={16} /> Try Again
                  </button>
                )}
              </div>
            </div>

            {coverLetterStatus === "generating" && (
              <div className="py-12 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute -inset-4 animate-ping rounded-full bg-blue-500/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
                      <Loader2 size={28} className="animate-spin text-white" />
                    </div>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-gray-900">Generating your cover letter</h4>
                <p className="mt-2 text-base font-medium text-gray-500">Analyzing your CV and job requirements...</p>
                <div className="mt-6 h-2.5 w-full max-w-md mx-auto overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: "70%" }} />
                </div>
              </div>
            )}

            {coverLetterStatus === "success" && coverLetter && (
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6">
                {isEditing ? (
                  <textarea value={editedLetter} onChange={(e) => setEditedLetter(e.target.value)}
                    className="w-full min-h-80 p-4 text-base leading-relaxed text-gray-700 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <pre className="whitespace-pre-wrap text-base leading-relaxed text-gray-700 font-sans">{coverLetter}</pre>
                )}
              </div>
            )}

            {coverLetterStatus === "error" && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-red-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="text-lg font-bold text-red-800">Generation Failed</h4>
                    <p className="mt-1 text-base font-medium text-red-600">{coverLetterError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Selection Section */}
      <div className="rounded-3xl bg-white shadow-xl border border-gray-100 p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
              <Briefcase size={22} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Select a Job</h3>
              <p className="text-sm font-medium text-gray-500">Choose a job posting to analyze and generate cover letter</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {MOCK_JOBS.map((job) => (
              <button key={job.id} onClick={() => analyzeJobFit(job)}
                className={`rounded-2xl border-2 p-5 text-left transition-all ${selectedJob?.id === job.id ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-400"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{job.title}</p>
                    <p className="text-sm font-medium text-blue-600">{job.company}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${job.location === "Remote" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {job.location}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedJob && (
            <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-gray-50 p-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="size-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke={fitScore >= 85 ? "#10B981" : "#F59E0B"} strokeWidth="3" strokeDasharray={`${fitScore}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{fitScore}%</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">Fit Score</p>
                  <p className="text-xs text-gray-500">Based on your CV</p>
                </div>
              </div>
              <div className="ml-auto">
                {analyzingJob ? (
                  <button disabled className="flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white">
                    <Loader2 size={20} className="animate-spin" /> Analyzing...
                  </button>
                ) : (
                  <button onClick={generateCoverLetter} disabled={coverLetterStatus === "generating"}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-bold text-white shadow-lg hover:-translate-y-1 disabled:opacity-50">
                    <PenTool size={20} /> Generate Cover Letter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
