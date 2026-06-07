"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, DollarSign, Calendar, Bookmark, Loader2, Briefcase, TrendingUp, AlertCircle, CheckCircle2, FileText, MessageSquare } from "lucide-react";
import { GlassCard, Reveal, Stagger } from "./motion-shell";
import { useTracker } from "./tracker-context";
import { getPersistedCvId, getPersistedCvSkills, hasPersistedCv } from "./cv-storage";
import { ensureCareerPilotUserId, getCareerPilotHeaders } from "./user-storage";
import { setAssistantJobContext } from "./assistant-job-context";

interface Job {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  deadline: string | null;
  fitScore: number | null;
  type: "Remote" | "Hybrid" | "On-site" | "Internship" | "Full-time";
  matchReason: string;
  missingSkills: string[];
  matchingSkills: string[];
  requiredSkills?: string[];
  jobUrl?: string;
  description?: string;
  source?: string;
}

interface FitScoreResponse {
  fit_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  match_count: number;
  total_required: number;
}

// Live API response types
interface LiveJobSearchResponse {
  jobs: ApiJobResponse[];
  total: number;
  is_live: boolean;
  source: string | null;
  error: string | null;
  requires_cv?: boolean;
  message?: string | null;
  personalized?: boolean;
  fit_scores_enabled?: boolean;
  cached?: boolean;
  fetched_at?: string | null;
  cache_expires_at?: string | null;
}

interface ApiJobResponse {
  job_id: string;
  role: string;
  company: string;
  location?: string | null;
  salary?: string | null;
  deadline?: string | null;
  fit_score?: number | null;
  reason?: string | null;
  missing_skills?: string[];
  matched_skills?: string[];
  required_skills?: string[];
  job_url?: string | null;
  description?: string | null;
  source?: string;
}

function inferJobType(apiJob: ApiJobResponse): Job["type"] {
  const role = apiJob.role.toLowerCase();
  const location = (apiJob.location || "").toLowerCase();
  const description = (apiJob.description || "").toLowerCase();
  const source = (apiJob.source || "").toLowerCase();
  const haystack = `${role} ${location} ${description} ${source}`;

  if (haystack.includes("intern")) return "Internship";
  if (haystack.includes("hybrid")) return "Hybrid";
  if (
    haystack.includes("on-site") ||
    haystack.includes("onsite") ||
    haystack.includes("on site")
  ) {
    return "On-site";
  }
  if (haystack.includes("remote") || source.includes("remotive")) return "Remote";
  return "Full-time";
}

function isUnscoredJob(job: Job, matchedSkills: string[], missingSkills: string[]) {
  const reason = job.matchReason.toLowerCase();
  return (
    matchedSkills.length === 0 &&
    missingSkills.length === 0 &&
    (
      !job.requiredSkills ||
      job.requiredSkills.length === 0 ||
      reason.includes("required skills could not be identified") ||
      reason.includes("required skills unavailable")
    )
  );
}

// Map backend enriched job to frontend Job format
function mapApiJobToJob(apiJob: ApiJobResponse): Job {
  return {
    id: apiJob.job_id,
    role: apiJob.role,
    company: apiJob.company,
    location: apiJob.location || "Location not provided",
    salary: apiJob.salary || "Not specified",
    deadline: apiJob.deadline || null,
    fitScore: typeof apiJob.fit_score === "number" ? Math.round(apiJob.fit_score) : null,
    type: inferJobType(apiJob),
    matchReason: apiJob.reason || "Calculated based on your CV skills",
    missingSkills: apiJob.missing_skills || [],
    matchingSkills: apiJob.matched_skills || [],
    requiredSkills: apiJob.required_skills || [...(apiJob.matched_skills || []), ...(apiJob.missing_skills || [])],
    jobUrl: apiJob.job_url || "",
    description: apiJob.description || "",
    source: apiJob.source,
  };
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
  return getPersistedCvSkills();
};

function getSavedJobsStorageKey() {
  const userId = ensureCareerPilotUserId();
  return `careerpilot_saved_jobs_${userId || "anonymous"}`;
}

function loadSavedJobs(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem(getSavedJobsStorageKey());
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

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
  const router = useRouter();
  const { addApplication } = useTracker();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [cacheExpiresAt, setCacheExpiresAt] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fitScoresEnabled, setFitScoresEnabled] = useState(false);
  const [resultsMessage, setResultsMessage] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(loadSavedJobs);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [cvSkills, setCvSkills] = useState<string[]>(loadCvSkills());
  const [hasCvUploaded, setHasCvUploaded] = useState(hasPersistedCv());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      getSavedJobsStorageKey(),
      JSON.stringify(Array.from(savedJobs))
    );
  }, [savedJobs]);

  // Reusable refresh function for live jobs only.
  // Uses a ref for the live query so the function identity stays stable
  // across keystrokes — otherwise the initial-load effect below would
  // re-fire on every character typed in the search bar.
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  const refreshJobs = useCallback(async (options?: { query?: string; forceRefresh?: boolean }) => {
    const currentCvId = getPersistedCvId();
    const query = options?.query !== undefined ? options.query : searchQueryRef.current;
    const forceRefresh = Boolean(options?.forceRefresh);

    setIsSearching(true);
    setApiError(null);
    setResultsMessage(null);

    try {
      const params = new URLSearchParams({
        cv_id: currentCvId,
        limit: "12",
      });

      if (query && query.trim()) {
        params.set("query", query.trim());
        params.set("location", "");
      }
      if (forceRefresh) {
        params.set("force_refresh", "true");
      }

      const response = await fetch(`/api/jobs/search?${params.toString()}`, {
        headers: getCareerPilotHeaders(),
      });
      const data: LiveJobSearchResponse = await response.json();

      // Always sync the personalization flags from the response
      setFitScoresEnabled(Boolean(data.fit_scores_enabled));
      setActiveSource(data.source || null);
      setIsCachedResult(Boolean(data.cached));
      setCacheExpiresAt(data.cache_expires_at || null);
      if (data.message) {
        setResultsMessage(data.message);
      }

      // Handle requires_cv response — backend rejected the cv_id we sent
      if (data.requires_cv) {
        setJobs([]);
        setIsLive(false);
        setApiError(data.message || "Please upload your CV first to get personalized job recommendations.");
        setHasCvUploaded(false);
      } else if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs.map(mapApiJobToJob));
        setIsLive(data.is_live);
        setHasCvUploaded(Boolean(currentCvId || hasPersistedCv()));
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
      setActiveSource(null);
      setIsCachedResult(false);
      setCacheExpiresAt(null);
      setFitScoresEnabled(false);
    } finally {
      setIsSearching(false);
      setIsInitialLoad(false);
    }
  }, []);

  // Debounced live search-as-you-type. Re-runs only when the query string
  // actually changes (not on every keystroke). Initial load fetches once.
  useEffect(() => {
    if (isInitialLoad) {
      const initialHandle = setTimeout(() => {
        void refreshJobs();
      }, 0);
      return () => clearTimeout(initialHandle);
    }
    const handle = setTimeout(() => {
      void refreshJobs();
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isInitialLoad]);

  // CV update listeners (same-tab and cross-tab).
  useEffect(() => {
    const handleCvUpdated = () => {
      const skills = loadCvSkills();
      setCvSkills(skills);
      setHasCvUploaded(hasPersistedCv());
      refreshJobs();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "careerpilot_cv_skills" || e.key === "careerpilot_cv_id") {
        const skills = loadCvSkills();
        setCvSkills(skills);
        setHasCvUploaded(hasPersistedCv());
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
    void refreshJobs({
      query: searchQuery,
      forceRefresh: true,
    });
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

  const handleApplyJob = (job: Job, fitScore: number | null) => {
    addApplication({
      role: job.role,
      company: job.company,
      location: job.location,
      status: "Applied",
      fitScore: fitScore ?? 0,
      deadline: job.deadline ?? "",
      nextAction: "Follow up with recruiter in 1 week",
      jobDescription: job.description || job.matchReason,
      requiredSkills: job.requiredSkills || [],
      jobUrl: job.jobUrl || job.id,
    });
    setAppliedJobs((prev) => new Set(prev).add(job.id));
  };

  const handleAskAssistant = (
    job: Job,
    fitScore: number | null,
    matchedSkills: string[],
    missingSkills: string[]
  ) => {
    setAssistantJobContext({
      id: job.id,
      role: job.role,
      company: job.company,
      description: job.description,
      requiredSkills: job.requiredSkills || [],
      matchingSkills: matchedSkills,
      missingSkills,
      matchReason: job.matchReason,
      fitScore,
      trackerApplicationId: null,
    });
    router.push("/assistant");
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs in natural language: remote React internships, hybrid data roles in New York..."
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
        {activeSource && !isSearching && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            Source: {activeSource}
          </span>
        )}
        {isCachedResult && !isSearching && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Cached
          </span>
        )}
        {!isSearching && savedJobs.size > 0 && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
            {savedJobs.size} saved on this device
          </span>
        )}
      </div>

      {activeSource && !isSearching && !apiError && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">
            Results are coming from {activeSource}.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {isCachedResult
              ? `This result set came from the short-lived cache${cacheExpiresAt ? ` and expires at ${new Date(cacheExpiresAt).toLocaleString("en-US")}` : ""}. Press Search again to force a refresh.`
              : activeSource.includes("Remotive") && !activeSource.includes("Adzuna") && !activeSource.includes("Arbeitnow")
                ? "Remotive is used as a fallback source and can return broader remote results than your exact query."
                : "Typed searches are strongest when Adzuna or Arbeitnow are contributing results."}
          </p>
        </div>
      )}

      {/* General-results notice (no CV or CV rejected). Copy is driven by the
          backend's `message` field; falls back to a local default. */}
      {!fitScoresEnabled && !isSearching && !apiError && jobs.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-700">
                {resultsMessage || "Showing general live jobs. Upload a CV to get personalized fit scores."}
              </p>
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
                onClick={() => refreshJobs({ forceRefresh: true })}
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
          const displayMatchedSkills = computedFit ? computedFit.matched_skills : job.matchingSkills;
          const displayMissingSkills = computedFit ? computedFit.missing_skills : job.missingSkills;
          const forceUnscored = isUnscoredJob(job, displayMatchedSkills, displayMissingSkills);
          const displayFitScore = forceUnscored
            ? null
            : computedFit
              ? computedFit.fit_score
              : job.fitScore;

          return (
          <Reveal key={job.id}>
            <GlassCard className="flex h-full flex-col p-6 transition-shadow hover:shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#F3F6FB] text-xl font-extrabold text-[#1D4ED8]">
                    {job.company?.[0] || "?"}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{job.role}</h2>
                    <p className="text-sm font-bold text-[#1D4ED8]">{job.company}</p>
                  </div>
                </div>
                {fitScoresEnabled ? (
                  typeof displayFitScore === "number" ? (
                    <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${getMatchColor(displayFitScore)}`}>
                      {displayFitScore}% Match
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-extrabold text-gray-500">
                      Not scored
                    </span>
                  )
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-extrabold text-gray-500">
                    General
                  </span>
                )}
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
                    {job.deadline
                      ? new Date(job.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Deadline not provided"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getTypeBadgeColor(job.type)}`}>
                    {job.type}
                  </span>
                </div>
              </div>

              {/* Match Reason — only when we have a CV and computed fit scores */}
              {fitScoresEnabled && (
                <div className="mt-4 rounded-xl bg-[#F0F9FF] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#1D4ED8]" />
                    <span className="text-xs font-semibold text-[#1D4ED8]">Why this matches</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">{job.matchReason}</p>
                </div>
              )}

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

              {/* Actions */}
              <div className="mt-auto grid grid-cols-[1fr_auto_auto] gap-3 pt-5">
                <button
                  onClick={() => handleApplyJob(job, displayFitScore)}
                  disabled={appliedJobs.has(job.id)}
                  aria-label={
                    appliedJobs.has(job.id)
                      ? `Added ${job.role} at ${job.company} to your tracker`
                      : `Add ${job.role} at ${job.company} to your tracker as applied`
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-3 font-extrabold text-white transition-all hover:bg-[#1e40af] disabled:opacity-50 disabled:bg-green-600"
                >
                  {appliedJobs.has(job.id) ? (
                    <>
                      <CheckCircle2 size={18} />
                      Added to Tracker
                    </>
                  ) : (
                    <>
                      <Briefcase size={18} />
                      Add to Tracker
                    </>
                  )}
                </button>
                <button
                  onClick={() =>
                    handleAskAssistant(
                      job,
                      displayFitScore,
                      displayMatchedSkills,
                      displayMissingSkills
                    )
                  }
                  aria-label={`Ask assistant about ${job.role} at ${job.company}`}
                  className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-3 font-extrabold text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-100"
                >
                  <MessageSquare size={18} />
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
              <p className="mt-3 text-xs text-gray-500">
                This does not submit an application to the employer. It only saves the job in your tracker.
              </p>
            </GlassCard>
          </Reveal>
          );
        })}
      </Stagger>
    </div>
  );
}
