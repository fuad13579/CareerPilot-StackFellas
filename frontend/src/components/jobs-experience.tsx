"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, DollarSign, Calendar, Sparkles, Bookmark, Loader2, Briefcase, TrendingUp, AlertCircle, Lightbulb, CheckCircle2, FileText } from "lucide-react";
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

// Live API response types
interface LiveJobSearchResponse {
  jobs: Job[];
  total: number;
  is_live: boolean;
  source: string | null;
  error: string | null;
  requires_cv?: boolean;
  message?: string | null;
}

// Map backend enriched job to frontend Job format
function mapApiJobToJob(apiJob: any): Job {
  return {
    id: apiJob.job_id,
    role: apiJob.role,
    company: apiJob.company,
    location: apiJob.location || "Remote",
    salary: apiJob.salary || "Not specified",
    deadline: apiJob.deadline || new Date().toISOString().split('T')[0],
    fitScore: Math.round(apiJob.fit_score || 0),
    type: "Remote" as const, // Remotive only returns remote jobs
    matchReason: apiJob.reason || "Calculated based on your CV skills",
    missingSkills: apiJob.missing_skills || [],
    matchingSkills: apiJob.matched_skills || [],
    requiredSkills: apiJob.required_skills || [...(apiJob.matched_skills || []), ...(apiJob.missing_skills || [])],
  };
}

function mapJobType(jobType: string): Job["type"] {
  const type = jobType?.toLowerCase() || "";
  if (type.includes("contract") || type.includes("freelance")) return "Full-time";
  if (type.includes("fulltime") || type.includes("full-time") || type.includes("full time")) return "Full-time";
  if (type.includes("parttime") || type.includes("part-time") || type.includes("part time")) return "Internship";
  if (type.includes("intern")) return "Internship";
  if (type.includes("hybrid")) return "Hybrid";
  if (type.includes("remote")) return "Remote";
  return "Remote";
}

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [analyzedJobs, setAnalyzedJobs] = useState<Set<string>>(new Set());
  const [cvSkills, setCvSkills] = useState<string[]>(loadCvSkills);
  const [hasCvUploaded, setHasCvUploaded] = useState(cvSkills.length > 0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Reusable refresh function for live jobs only
  const refreshJobs = useCallback(async (overrideQuery?: string) => {
    const currentCvId = localStorage.getItem("careerpilot_cv_id") || "";
    const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
    
    setIsSearching(true);
    setApiError(null);
    
    try {
      const params = new URLSearchParams({
        cv_id: currentCvId,
        limit: "12",
      });
      
      if (query.trim()) {
        params.set("query", query.trim());
      }
      
      const response = await fetch(`/api/jobs/search?${params.toString()}`);
      const data: LiveJobSearchResponse = await response.json();
      
      // Handle requires_cv response
      if (data.requires_cv) {
        setJobs([]);
        setIsLive(false);
        setApiError(data.message || "Please upload your CV first to get personalized job recommendations.");
        setHasCvUploaded(false);
      } else if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs.map(mapApiJobToJob));
        setIsLive(data.is_live);
        setHasCvUploaded(true);
      } else {
        setJobs([]);
        setIsLive(false);
        if (data.error) {
          setApiError(data.error);
        }
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setApiError("Unable to connect to job search service. Please try again.");
      setJobs([]);
      setIsLive(false);
    } finally {
      setIsSearching(false);
      setIsInitialLoad(false);
    }
  }, [searchQuery]);

  // Initial load and CV upload detection
  useEffect(() => {
    refreshJobs();
    
    // Listen for CV updates from same tab (upload page)
    const handleCvUpdated = () => {
      const skills = loadCvSkills();
      setCvSkills(skills);
      setHasCvUploaded(skills.length > 0);
      refreshJobs();
    };
    
    // Listen for CV updates from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "careerpilot_cv_skills" || e.key === "careerpilot_cv_id") {
        const skills = loadCvSkills();
        setCvSkills(skills);
        setHasCvUploaded(skills.length > 0);
        refreshJobs();
      }
    };
    
    window.addEventListener("careerpilot_cv_updated", handleCvUpdated);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("careerpilot_cv_updated", handleCvUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshJobs]);

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
    refreshJobs(searchQuery);
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
          {isSearching && isInitialLoad ? "Loading jobs..." : `${jobs.length} jobs found`}
        </span>
        {isLive && !isSearching && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" />
            Live
          </span>
        )}
      </div>

      {/* CV Skills Notice */}
      {!hasCvUploaded && !isSearching && (
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

      {/* Error State */}
      {apiError && !isSearching && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-700">{apiError}</p>
              <button
                onClick={() => refreshJobs()}
                className="mt-2 text-xs font-medium text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - No CV uploaded */}
      {hasCvUploaded && jobs.length === 0 && !isSearching && !apiError && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Briefcase size={40} className="mx-auto text-gray-400" />
          <p className="mt-4 text-base font-semibold text-gray-700">No jobs found</p>
          <p className="mt-1 text-sm text-gray-500">Try a different search term or check back later for new opportunities.</p>
        </div>
      )}

      {/* Empty State - No CV uploaded */}
      {!hasCvUploaded && jobs.length === 0 && !isSearching && !apiError && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <FileText size={40} className="mx-auto text-gray-400" />
          <p className="mt-4 text-base font-semibold text-gray-700">Upload your CV to see job recommendations</p>
          <p className="mt-1 text-sm text-gray-500">Go to /upload to get personalized job matches based on your skills.</p>
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
