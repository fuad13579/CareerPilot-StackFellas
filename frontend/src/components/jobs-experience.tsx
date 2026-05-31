"use client";

import { useState } from "react";
import { Search, MapPin, DollarSign, Calendar, Sparkles, Bookmark, Loader2, Briefcase, TrendingUp, AlertCircle, Lightbulb, CheckCircle2 } from "lucide-react";
import { GlassCard, Reveal, Stagger } from "./motion-shell";
import { useTracker } from "./tracker-context";

interface Job {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  deadline: string;
  fitScore: number;
  type: "Remote" | "Hybrid" | "On-site" | "Internship" | "Full-time";
  matchReason: string;
  missingSkills: string[];
  matchingSkills: string[];
  requiredSkills?: string[];
}

interface FitScoreResponse {
  fit_score: number;
  matched_skills: string[];
  missing_skills: string[];
  match_count: number;
  total_required: number;
}

const mockJobs: Job[] = [
  {
    id: "1",
    role: "Frontend Developer Intern",
    company: "TechNova",
    location: "Dhaka",
    salary: "BDT 15,000–25,000",
    deadline: "2026-06-12",
    fitScore: 84,
    type: "Internship",
    matchReason: "Strong match with React, TypeScript, Tailwind, and UI project experience.",
    missingSkills: ["Testing experience", "Deployment workflow"],
    matchingSkills: ["React", "TypeScript", "Tailwind CSS"],
    requiredSkills: ["React", "TypeScript", "Tailwind CSS", "JavaScript", "CSS"],
  },
  {
    id: "2",
    role: "Junior Backend Developer",
    company: "CodeCrafters",
    location: "Remote",
    salary: "BDT 30,000–45,000",
    deadline: "2026-06-18",
    fitScore: 76,
    type: "Full-time",
    matchReason: "Good match with FastAPI, Python, database design, and API development experience.",
    missingSkills: ["Docker", "Production deployment"],
    matchingSkills: ["Python", "FastAPI", "Database Design"],
    requiredSkills: ["Python", "FastAPI", "Docker", "PostgreSQL", "REST API"],
  },
  {
    id: "3",
    role: "ML Intern",
    company: "DataBridge AI",
    location: "Dhaka",
    salary: "BDT 20,000–30,000",
    deadline: "2026-06-20",
    fitScore: 68,
    type: "Internship",
    matchReason: "Partial match with Python and project experience.",
    missingSkills: ["Machine learning model training", "Pandas", "Scikit-learn", "Data preprocessing"],
    matchingSkills: ["Python"],
    requiredSkills: ["Python", "Machine Learning", "TensorFlow", "Pandas", "SQL"],
  },
  {
    id: "4",
    role: "React Developer",
    company: "StartupXYZ",
    location: "Remote",
    salary: "BDT 35,000–50,000",
    deadline: "2026-06-25",
    fitScore: 79,
    type: "Full-time",
    matchReason: "Your skills align well with their tech stack including React and TypeScript.",
    missingSkills: ["Redux", "GraphQL"],
    matchingSkills: ["React", "TypeScript", "CSS"],
    requiredSkills: ["React", "TypeScript", "Redux", "GraphQL", "Next.js"],
  },
  {
    id: "5",
    role: "Full Stack Developer",
    company: "WebSol",
    location: "Hybrid",
    salary: "BDT 40,000–60,000",
    deadline: "2026-07-01",
    fitScore: 73,
    type: "Full-time",
    matchReason: "Reasonable match for your experience level with frontend and backend skills.",
    missingSkills: ["Next.js", "AWS services"],
    matchingSkills: ["JavaScript", "Node.js", "MongoDB"],
    requiredSkills: ["JavaScript", "Node.js", "React", "MongoDB", "AWS"],
  },
  {
    id: "6",
    role: "UI/UX Designer",
    company: "DesignFirst",
    location: "Dhaka",
    salary: "BDT 25,000–40,000",
    deadline: "2026-07-05",
    fitScore: 61,
    type: "On-site",
    matchReason: "Your experience shows good design sense. Consider adding more Figma work.",
    missingSkills: ["Figma", "User research", "Prototyping"],
    matchingSkills: ["CSS", "Design fundamentals"],
    requiredSkills: ["Figma", "User Research", "Prototyping", "CSS", "HTML"],
  },
];

// Calculate fit score from user skills vs required skills
const calculateFitScore = (userSkills: string[], jobSkills: string[]): FitScoreResponse => {
  const userSet = new Set(userSkills.map(s => s.toLowerCase().trim()));
  const jobSet = new Set(jobSkills.map(s => s.toLowerCase().trim()));

  const matched = [...jobSet].filter(skill => userSet.has(skill));
  const missing = [...jobSet].filter(skill => !userSet.has(skill));

  const total = jobSet.size;
  const fit_score = total === 0 ? 100 : Math.round((matched.length / total) * 100);

  return {
    fit_score,
    matched_skills: matched,
    missing_skills: missing,
    match_count: matched.length,
    total_required: total,
  };
};

// Load CV skills from localStorage
const loadCvSkills = (): string[] => {
  try {
    const stored = localStorage.getItem("careerpilot_cv_skills");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore localStorage errors
  }
  return [];
};

const getMatchColor = (fitScore: number) => {
  if (fitScore >= 80) return "bg-green-100 text-green-700";
  if (fitScore >= 65) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
};

const getTypeBadgeColor = (type: string) => {
  if (type === "Remote") return "bg-green-100 text-green-700";
  if (type === "Hybrid") return "bg-yellow-100 text-yellow-700";
  if (type === "Internship") return "bg-purple-100 text-purple-700";
  return "bg-blue-100 text-blue-700";
};

export function JobsExperience() {
  const { addApplication } = useTracker();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [jobs] = useState<Job[]>(mockJobs);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [analyzedJobs, setAnalyzedJobs] = useState<Set<string>>(new Set());
  const [cvSkills] = useState<string[]>(loadCvSkills);
  const [hasCvUploaded, setHasCvUploaded] = useState(cvSkills.length > 0);

  // Calculate fit scores based on CV skills
  const getJobFitScore = (job: Job): FitScoreResponse | null => {
    if (!job.requiredSkills || job.requiredSkills.length === 0) {
      return null;
    }
    return calculateFitScore(cvSkills, job.requiredSkills);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSearching(false);
  };

  const handleAnalyzeFit = async (jobId: string) => {
    setAnalyzingId(jobId);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAnalyzingId(null);
    setAnalyzedJobs((prev) => new Set(prev).add(jobId));
  };

  const handleSaveJob = (jobId: string) => {
    setSavedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleApplyJob = (job: Job, fitScore: number) => {
    addApplication({
      role: job.role,
      company: job.company,
      location: job.location,
      status: "Applied",
      fitScore: fitScore,
      deadline: job.deadline,
      nextAction: "Follow up with recruiter in 1 week",
    });
    setAppliedJobs((prev) => new Set(prev).add(job.id));
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search frontend internships, remote backend roles, or data jobs..."
            className="w-full rounded-2xl border-2 border-gray-200 bg-white py-4 pl-14 pr-32 text-lg font-medium shadow-lg transition-all focus:border-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#1D4ED8] px-6 py-2.5 font-extrabold text-white transition-all hover:bg-[#1e40af] disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <Briefcase size={18} className="text-[#1D4ED8]" />
        <span className="text-sm font-bold text-gray-600">
          {jobs.length} jobs found
        </span>
      </div>

      {/* CV Skills Notice */}
      {!hasCvUploaded && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-700">Upload your CV first to calculate personalized fit scores</p>
              <p className="text-xs text-blue-600">Go to /upload to upload your CV and enable skill-based matching</p>
            </div>
          </div>
        </div>
      )}

      {/* Job Cards */}
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => {
          const computedFit = getJobFitScore(job);
          const displayFitScore = computedFit ? computedFit.fit_score : job.fitScore;
          const displayMatchedSkills = computedFit ? computedFit.matched_skills : job.matchingSkills;
          const displayMissingSkills = computedFit ? computedFit.missing_skills : job.missingSkills;

          return (
          <Reveal key={job.id}>
            <GlassCard className="flex h-full flex-col p-6 transition-shadow hover:shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#F3F6FB] text-xl font-extrabold text-[#1D4ED8]">
                    {job.company[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{job.role}</h2>
                    <p className="text-sm font-bold text-[#1D4ED8]">{job.company}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${getMatchColor(displayFitScore)}`}>
                  {displayFitScore}% Match
                </span>
              </div>

              {/* Details */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{job.location}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <DollarSign size={16} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-700">{job.salary}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-700">
                    {new Date(job.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getTypeBadgeColor(job.type)}`}>
                    {job.type}
                  </span>
                </div>
              </div>

              {/* Match Reason */}
              <div className="mt-4 rounded-xl bg-[#F0F9FF] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#1D4ED8]" />
                  <span className="text-xs font-semibold text-[#1D4ED8]">Why this matches</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{job.matchReason}</p>
              </div>

              {/* Missing Skills - Always visible */}
              {displayMissingSkills.length > 0 ? (
              <div className="mt-3 flex items-center gap-2">
                <AlertCircle size={12} className="shrink-0 text-orange-500" />
                <span className="text-xs font-medium text-gray-500">Improve before applying:</span>
                <div className="flex flex-wrap gap-1">
                  {displayMissingSkills.slice(0, 2).map((skill) => (
                    <span key={skill} className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                      {skill}
                    </span>
                  ))}
                  {displayMissingSkills.length > 2 && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                      +{displayMissingSkills.length - 2}
                    </span>
                  )}
                </div>
              </div>
              ) : (
              <div className="mt-3 flex items-center gap-2">
                <TrendingUp size={12} className="shrink-0 text-green-500" />
                <span className="text-xs font-medium text-gray-500">Required skills unavailable for this job</span>
              </div>
              )}

              {/* Analysis Result */}
              {analyzedJobs.has(job.id) && (
                <div className="mt-4 space-y-3 rounded-xl border border-[#E5E7EB] p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb size={14} className="mt-0.5 text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Matching skills</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {displayMatchedSkills.map((skill) => (
                          <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 text-orange-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Skills to improve</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {displayMissingSkills.map((skill) => (
                          <span key={skill} className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-auto flex gap-3 pt-5">
                <button
                  onClick={() => handleApplyJob(job, displayFitScore)}
                  disabled={appliedJobs.has(job.id)}
                  aria-label={appliedJobs.has(job.id) ? `Applied to ${job.role} at ${job.company}` : `Apply to ${job.role} at ${job.company}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-3 font-extrabold text-white transition-all hover:bg-[#1e40af] disabled:opacity-50 disabled:bg-green-600"
                >
                  {appliedJobs.has(job.id) ? (
                    <>
                      <CheckCircle2 size={18} />
                      Applied
                    </>
                  ) : (
                    <>
                      <Briefcase size={18} />
                      Apply Now
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSaveJob(job.id)}
                  aria-label={savedJobs.has(job.id) ? `Remove ${job.role} from saved jobs` : `Save ${job.role} job`}
                  className={`rounded-xl border-2 px-4 py-3 font-extrabold transition-all ${
                    savedJobs.has(job.id)
                      ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
                      : "border-gray-200 text-gray-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                  }`}
                >
                  <Bookmark size={18} fill={savedJobs.has(job.id) ? "currentColor" : "none"} />
                </button>
              </div>
            </GlassCard>
          </Reveal>
          );
        })}
      </Stagger>
    </div>
  );
}
