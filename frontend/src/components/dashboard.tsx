"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  Briefcase, 
  Calendar, 
  MapPin, 
  DollarSign,
  Clock,
  Target,
  Lightbulb,
  Sparkles,
  AlertCircle,
  Star,
  Zap,
  BookOpen,
  MessageSquare,
  Send,
  Plus
} from "lucide-react";
import { Reveal, Stagger } from "./motion-shell";
import { useTracker } from "./tracker-context";
import { getPersistedCvId, getPersistedCvSummary } from "./cv-storage";
import { getCareerPilotHeaders } from "./user-storage";

interface CvSnapshot {
  filename: string;
  fileType: string;
  extractedText: string;
  profileSummary?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
}

interface RecommendedJob {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  fitScore: number;
  matchReason: string;
  type: string;
  deadline: string;
}

interface LiveJobSearchResponse {
  jobs: any[];
  total: number;
  is_live: boolean;
  source: string | null;
  error: string | null;
  requires_cv?: boolean;
  message?: string | null;
  personalized?: boolean;
  fit_scores_enabled?: boolean;
}

interface TrackerApplicationResponse {
  id: number;
  status: string;
  created_at: string;
}

interface TrackerTodoResponse {
  id: number;
  is_completed: boolean;
  created_at: string;
}

export function DashboardHome() {
  const [cvSnapshot, setCvSnapshot] = useState<CvSnapshot | null>(null);

  useEffect(() => {
    const loadSnapshot = () => {
      setCvSnapshot(getPersistedCvSummary());
    };

    loadSnapshot();

    window.addEventListener("careerpilot_cv_updated", loadSnapshot);
    window.addEventListener("storage", loadSnapshot);

    return () => {
      window.removeEventListener("careerpilot_cv_updated", loadSnapshot);
      window.removeEventListener("storage", loadSnapshot);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSections = async () => {
      const cvId = getPersistedCvId();
      if (!cvId) return;

      try {
        const response = await fetch(`/api/cv/${encodeURIComponent(cvId)}/sections`, {
          headers: getCareerPilotHeaders(),
        });
        if (!response.ok) return;

        const data = await response.json();
        const summary = getPersistedCvSummary();
        if (!summary) return;

        const experience = extractSectionEntries(data?.sections?.experience);
        const education = extractSectionEntries(data?.sections?.education);

        if (cancelled) return;

        setCvSnapshot({
          ...summary,
          experience: experience.length > 0 ? experience : summary.experience || [],
          education: education.length > 0 ? education : summary.education || [],
        });
      } catch (error) {
        console.error("Failed to load CV sections:", error);
      }
    };

    const handleCvUpdated = () => {
      void loadSections();
    };

    void loadSections();
    window.addEventListener("careerpilot_cv_updated", handleCvUpdated);
    window.addEventListener("storage", handleCvUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("careerpilot_cv_updated", handleCvUpdated);
      window.removeEventListener("storage", handleCvUpdated);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <WelcomeHero cvSnapshot={cvSnapshot} />
      <main className="space-y-16 pb-16">
        <CVStatusSection cvSnapshot={cvSnapshot} />
        <QuickStatsSection cvSnapshot={cvSnapshot} />
        <RecommendedJobsSection />
        <ApplicationTrackerSection />
        <UpcomingTasksSection />
        <LiveLearningRoadmapSection cvSnapshot={cvSnapshot} />
        <AINudgesSection />
        <LiveSkillsToImproveSection cvSnapshot={cvSnapshot} />
      </main>
    </div>
  );
}

// Dev/test fallback only. NOT used in normal runtime rendering — see
// RecommendedJobsSection, which always tries the live API first.
// Kept here so unit tests and Storybook-style previews have something
// to render when there is no backend available.
const DEV_FALLBACK_RECOMMENDED_JOBS: RecommendedJob[] = [
  {
    id: "1",
    role: "Frontend Developer",
    company: "TechCorp Inc.",
    location: "Remote",
    salary: "$85k - $110k",
    fitScore: 92,
    matchReason: "Strong React & TypeScript match",
    type: "Remote",
    deadline: "2026-06-05",
  },
  {
    id: "2",
    role: "React Developer",
    company: "StartupXYZ",
    location: "New York, NY",
    salary: "$90k - $120k",
    fitScore: 87,
    matchReason: "Your skills align with their tech stack",
    type: "Hybrid",
    deadline: "2026-06-08",
  },
  {
    id: "3",
    role: "UI Engineer",
    company: "DesignFirst",
    location: "San Francisco, CA",
    salary: "$100k - $130k",
    fitScore: 81,
    matchReason: "Good fit for your experience level",
    type: "On-site",
    deadline: "2026-06-12",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Reveal>
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D4ED8]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#111827] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-[#6B7280]">
          {description}
        </p>
      </div>
    </Reveal>
  );
}

function WelcomeHero({
  cvSnapshot,
}: {
  cvSnapshot: CvSnapshot | null;
}) {
  const hasCvUploaded = Boolean(cvSnapshot);
  const welcomeInfo = {
    greeting: hasCvUploaded ? "Welcome back!" : "Welcome to CareerPilot",
    message: hasCvUploaded
      ? "Your CV has been analyzed and CareerPilot is ready to help you apply smarter."
      : "Upload your CV to unlock job matching, fit scores, AI answers, and cover letters.",
    lastActive: hasCvUploaded ? "Last active: Today" : "Last active: Not uploaded",
  };

  return (
    <section className="relative flex min-h-[50vh] items-center px-6 py-16 lg:px-16">
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03] dot-pattern" 
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <Reveal>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-[#1d4ed8]" size={20} />
            <span className="text-sm font-semibold text-[#1d4ed8]">
              {hasCvUploaded ? "CareerPilot Active" : "CareerPilot Ready"}
            </span>
          </div>
        </Reveal>
        <Reveal>
          <h1 className="mb-4 text-[clamp(2.5rem,8vw,5rem)] font-extrabold tracking-tight leading-[0.95] text-black">
            {welcomeInfo.greeting}
          </h1>
        </Reveal>
        <Reveal>
          <p className="mb-6 max-w-2xl text-xl leading-[1.7] text-[#374151]">
            {welcomeInfo.message}
          </p>
        </Reveal>
        {cvSnapshot && (
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] shadow-sm">
              <FileText size={14} className="text-[#1d4ed8]" />
              <span>{cvSnapshot.filename}</span>
            </div>
          </Reveal>
        )}
        <Reveal>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 text-sm font-bold text-white transition-all hover:bg-[#1d4ed8]"
            >
              Find Jobs <ArrowRight size={16} />
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#e5e7eb] bg-white px-8 py-4 text-sm font-bold text-black transition-all hover:border-black"
            >
              Update CV <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>
        <Reveal>
          <div className="mt-10 flex items-center gap-6 text-sm text-[#6b7280]">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#10b981]" />
              <span>CV Analyzed</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>{welcomeInfo.lastActive}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CVStatusSection({
  cvSnapshot,
}: {
  cvSnapshot: CvSnapshot | null;
}) {
  const cvStatus = {
    uploaded: Boolean(cvSnapshot),
    lastAnalyzed: cvSnapshot ? "Just now" : "Not analyzed yet",
    skillsDetected: cvSnapshot?.skills?.length || 0,
    experienceSections: cvSnapshot?.experience?.length || 0,
    overallScore: cvSnapshot ? Math.min(100, 60 + (cvSnapshot.skills?.length || 0) * 2) : 0,
  };

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="CV Analysis"
          title="Your Profile Status"
          description="CareerPilot has analyzed your uploaded CV."
        />
        <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#ecfdf5]">
                <CheckCircle2 className="text-[#059669]" size={24} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">Status</p>
              <p className="mt-1 text-lg font-bold text-black">
                {cvStatus.uploaded ? "Uploaded" : "Not uploaded"}
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#eff6ff]">
                <FileText className="text-[#1d4ed8]" size={24} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">Skills Detected</p>
              <p className="mt-1 text-lg font-bold text-black">
                {cvStatus.skillsDetected} skills
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#f3f4f6]">
                <BookOpen className="text-[#6b7280]" size={24} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">Experience</p>
              <p className="mt-1 text-lg font-bold text-black">
                {cvStatus.experienceSections} sections
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#fef3c7]">
                <Star className="text-[#d97706]" size={24} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">CV Score</p>
              <p className="mt-1 text-lg font-bold text-black">{cvStatus.overallScore}%</p>
            </div>
          </Reveal>
        </Stagger>
        <Reveal>
          <p className="mt-4 text-sm text-[#6b7280]">
            Last analyzed: {cvStatus.lastAnalyzed}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function QuickStatsSection({
  cvSnapshot,
}: {
  cvSnapshot: CvSnapshot | null;
}) {
  const [applicationCount, setApplicationCount] = useState(0);
  const [completedTodosCount, setCompletedTodosCount] = useState(0);
  const [totalTodosCount, setTotalTodosCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const skillsCount = cvSnapshot?.skills?.length || 0;
  const experienceSections = cvSnapshot?.experience?.length || 0;

  useEffect(() => {
    const loadTrackerCounts = async () => {
      try {
        const headers = getCareerPilotHeaders();
        const [applicationsResponse, todosResponse] = await Promise.all([
          fetch("/api/tracker/applications", { headers }),
          fetch("/api/todos", { headers }),
        ]);

        const applicationsData: TrackerApplicationResponse[] = applicationsResponse.ok
          ? await applicationsResponse.json()
          : [];
        const todosData: TrackerTodoResponse[] = todosResponse.ok
          ? await todosResponse.json()
          : [];

        setApplicationCount(applicationsData.length);
        setTotalTodosCount(todosData.length);
        setCompletedTodosCount(todosData.filter((todo) => todo.is_completed).length);
      } catch (error) {
        console.error("Failed to load quick stats:", error);
        setApplicationCount(0);
        setCompletedTodosCount(0);
        setTotalTodosCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrackerCounts();

    const handleTrackerUpdate = () => {
      loadTrackerCounts();
    };

    window.addEventListener("careerpilot_tracker_updated", handleTrackerUpdate);
    window.addEventListener("storage", handleTrackerUpdate);

    return () => {
      window.removeEventListener("careerpilot_tracker_updated", handleTrackerUpdate);
      window.removeEventListener("storage", handleTrackerUpdate);
    };
  }, []);

  const roadmapProgress = calculateRoadmapProgress({
    applicationCount,
    completedTodosCount,
    totalTodosCount,
    skillsCount,
    experienceSections,
  });

  const quickStats = [
    {
      value: isLoading ? "..." : String(applicationCount),
      label: "Applications Sent",
      icon: Send,
      color: "text-[#1d4ed8]",
      subLabel: cvSnapshot ? "from backend tracker" : "no CV uploaded yet",
    },
    {
      value: isLoading ? "..." : String(completedTodosCount),
      label: "Completed Todos",
      icon: CheckCircle2,
      color: "text-[#059669]",
      subLabel: isLoading ? "loading backend data" : `${totalTodosCount} total tasks`,
    },
    {
      value: cvSnapshot ? String(skillsCount) : "0",
      label: "Skills Added",
      icon: Plus,
      color: "text-[#7c3aed]",
      subLabel: cvSnapshot ? "from uploaded CV" : "upload a CV to begin",
    },
    {
      value: `${roadmapProgress}%`,
      label: "Roadmap Progress",
      icon: TrendingUp,
      color: "text-[#d97706]",
      subLabel: cvSnapshot ? "derived from CV + tracker activity" : "no profile yet",
    },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Dashboard"
          title="Quick Stats"
          description="Your career progress at a glance."
        />
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => (
            <Reveal key={stat.label}>
              <div className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-extrabold text-black">{stat.value}</p>
                    <p className="mt-1 text-sm font-medium text-[#6b7280]">{stat.label}</p>
                    <p className="mt-0.5 text-xs text-[#9ca3af]">{stat.subLabel}</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#f3f4f6]">
                    <stat.icon size={20} className={stat.color} />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function calculateRoadmapProgress({
  applicationCount,
  completedTodosCount,
  totalTodosCount,
  skillsCount,
  experienceSections,
}: {
  applicationCount: number;
  completedTodosCount: number;
  totalTodosCount: number;
  skillsCount: number;
  experienceSections: number;
}): number {
  const applicationScore = Math.min(applicationCount, 5) / 5;
  const todoScore = totalTodosCount > 0 ? completedTodosCount / totalTodosCount : 0;
  const profileScore = Math.min(skillsCount + experienceSections, 12) / 12;

  return Math.max(
    0,
    Math.min(100, Math.round((applicationScore * 40) + (todoScore * 30) + (profileScore * 30)))
  );
}

function extractSectionEntries(value: unknown): string[] {
  if (typeof value !== "string") return [];

  const text = value.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const paragraphBlocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !/^experience$/i.test(block) && !/^education$/i.test(block));

  if (paragraphBlocks.length > 1) {
    return paragraphBlocks;
  }

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^experience$/i.test(line) && !/^education$/i.test(line));

  const entries: string[] = [];
  let currentEntry: string[] = [];

  for (const line of lines) {
    const startsNewEntry = isExperienceHeader(line) && currentEntry.length > 0;

    if (startsNewEntry) {
      entries.push(currentEntry.join("\n").trim());
      currentEntry = [line];
      continue;
    }

    currentEntry.push(line);
  }

  if (currentEntry.length > 0) {
    entries.push(currentEntry.join("\n").trim());
  }

  return entries.length > 0 ? entries : lines;
}

function isExperienceHeader(line: string): boolean {
  const normalized = line.toLowerCase();
  const hasDateRange =
    /\b(?:19|20)\d{2}\b/.test(line) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/.test(normalized) ||
    /\bpresent\b/.test(normalized);

  const looksLikeRoleLine =
    normalized.includes(" at ") ||
    normalized.includes(" | ") ||
    normalized.includes(" - ");

  return hasDateRange || looksLikeRoleLine;
}

// Map a backend JobCard to the dashboard's RecommendedJob shape. Defined
// here (not inside the component) so it stays referentially stable and
// can be reused if we ever call the same endpoint from a second place.
//
// Field names follow the backend JobCard model in
// backend/app/models/job_models.py (role/company, not title/company_name).
const mapApiJobToRecommendedJob = (job: any): RecommendedJob => ({
  id: job.job_id,
  role: job.role ?? job.title ?? "",
  company: job.company ?? job.company_name ?? "",
  location: job.location || "Remote",
  salary: job.salary || "Not specified",
  // Backend returns fit_score=null when not personalized. Don't fall
  // back to 0 — that would silently re-introduce the fabrication we
  // just removed. The card gates the badge on > 0 so 0 means "no score".
  fitScore:
    typeof job.fit_score === "number" &&
    !(
      Array.isArray(job.matched_skills) &&
      job.matched_skills.length === 0 &&
      Array.isArray(job.missing_skills) &&
      job.missing_skills.length === 0 &&
      typeof job.reason === "string" &&
      job.reason.toLowerCase().includes("required skills could not be identified")
    )
      ? Math.round(job.fit_score)
      : 0,
  matchReason: job.reason || "Based on your skills",
  type: job.source === "Remotive" ? "Remote" : job.type ?? "Remote",
  deadline: job.deadline || new Date().toISOString().split("T")[0],
});

function RecommendedJobsSection() {
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [recommendMessage, setRecommendMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRecommendedJobs = async () => {
      setIsLoading(true);
      try {
        const cvId = getPersistedCvId();

        // No CV uploaded: show live general jobs (no fake fit scores).
        // The /search endpoint is happy without a cv_id — it just
        // returns fit_score=null and personalized=false. We treat the
        // results as "general" cards and surface a clear message.
        if (!cvId) {
          const response = await fetch(
            `/api/jobs/search?limit=3`,
            { headers: getCareerPilotHeaders() },
          );
          const data: LiveJobSearchResponse = await response.json();

          if (cancelled) return;

          if (!data.jobs || data.jobs.length === 0) {
            setRecommendedJobs([]);
            setRecommendMessage(
              data.message ||
                "No live jobs available right now. Check back soon.",
            );
            return;
          }

          setRecommendMessage(
            data.message ||
              "Showing general live jobs. Upload your CV to get personalized fit scores.",
          );
          setRecommendedJobs(data.jobs.map(mapApiJobToRecommendedJob));
          return;
        }

        // With a CV: hit /recommend for real, sorted, fit-scored jobs.
        const response = await fetch(
          `/api/jobs/recommend?cv_id=${encodeURIComponent(cvId)}&limit=3`,
          { headers: getCareerPilotHeaders() },
        );
        const data: LiveJobSearchResponse = await response.json();

        if (cancelled) return;

        // /recommend refuses cleanly with requires_cv when the CV is
        // missing/empty/wrong-user. We already checked for cvId above,
        // but the backend may still reject (e.g. CV doesn't belong to
        // this anonymous user). Show the backend's message and an empty
        // list rather than fabricating cards.
        if (data.requires_cv || !data.jobs || data.jobs.length === 0) {
          setRecommendedJobs([]);
          setRecommendMessage(
            data.message ||
              "Upload your CV to get personalized job recommendations.",
          );
          return;
        }

        setRecommendMessage(null);
        setRecommendedJobs(data.jobs.map(mapApiJobToRecommendedJob));
      } catch (err) {
        console.error("Failed to fetch recommended jobs:", err);
        // Network/backend failure: keep the existing UI stable. Don't
        // blow away the user's view of their recommendations.
        if (!cancelled) {
          setRecommendMessage("Couldn't refresh recommendations right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchRecommendedJobs();

    // Refresh when the user uploads/updates/removes their CV so the
    // section flips between personalized and general automatically.
    const handleCvUpdated = () => {
      fetchRecommendedJobs();
    };
    window.addEventListener("careerpilot_cv_updated", handleCvUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("careerpilot_cv_updated", handleCvUpdated);
    };
  }, []);

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Job Matches"
          title="Recommended For You"
          description={
            recommendMessage ??
            "Jobs that match your skills and preferences."
          }
        />
        <Stagger className="grid gap-5 lg:grid-cols-3">
          {isLoading && recommendedJobs.length === 0 ? (
            <Reveal>
              <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white p-10">
                <p className="text-sm text-[#6b7280]">Loading recommendations…</p>
              </div>
            </Reveal>
          ) : recommendedJobs.length === 0 ? (
            <Reveal>
              <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white p-10">
                <p className="text-sm text-[#6b7280]">
                  {recommendMessage ?? "No live jobs available right now. Check back soon."}
                </p>
              </div>
            </Reveal>
          ) : (
            recommendedJobs.slice(0, 3).map((job) => (
            <Reveal key={job.id}>
              <div className="group flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F3F6FB] text-lg font-extrabold text-[#1D4ED8]">
                      {job.company?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-black">{job.role}</h3>
                      <p className="text-sm font-bold text-[#1D4ED8]">{job.company}</p>
                    </div>
                  </div>
                  {job.fitScore > 0 ? (
                    <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${
                      job.fitScore >= 90 ? "bg-green-100 text-green-700" :
                      job.fitScore >= 80 ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {job.fitScore}%
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-extrabold text-gray-500">
                      General
                    </span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                    <DollarSign size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">{job.salary}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6b7280]">{job.matchReason}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    job.type === "Remote" ? "bg-green-100 text-green-700" :
                    job.type === "Hybrid" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {job.type}
                  </span>
                  <span className="text-xs text-[#9ca3af]">
                    Due: {new Date(job.deadline).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </span>
                </div>
                <Link
                  href="/jobs"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1e40af]"
                >
                  Apply Now <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
            ))
          )}
        </Stagger>
        <Reveal>
          <div className="mt-6 flex justify-center">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4ed8] transition-colors hover:text-[#1e40af]"
            >
              View All Jobs <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ApplicationTrackerSection() {
  const { getApplicationCountByStatus } = useTracker();
  
  const applied = getApplicationCountByStatus("Applied");
  const interviewing = getApplicationCountByStatus("Interviewing");
  const offer = getApplicationCountByStatus("Offer");
  const rejected = getApplicationCountByStatus("Rejected");

  const applicationTracker = [
    { status: "Applied", count: applied, color: "bg-[#3b82f6]" },
    { status: "Interviewing", count: interviewing, color: "bg-[#f59e0b]" },
    { status: "Offer", count: offer, color: "bg-[#10b981]" },
    { status: "Rejected", count: rejected, color: "bg-[#ef4444]" },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Application Tracker"
          title="Your Pipeline"
          description="Track the status of your job applications."
        />
        <Stagger className="grid gap-4 md:grid-cols-4">
          {applicationTracker.map((item) => (
            <Reveal key={item.status}>
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${item.color}`}>
                  <span className="text-2xl font-extrabold text-white">
                    {item.count}
                  </span>
                </div>
                <p className="text-sm font-bold text-black">{item.status}</p>
              </div>
            </Reveal>
          ))}
        </Stagger>
        <Reveal>
          <div className="mt-6 flex justify-center">
            <Link
              href="/tracker"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4ed8] transition-colors hover:text-[#1e40af]"
            >
              View Tracker <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function UpcomingTasksSection() {
  const { getPendingTodos, toggleTodo } = useTracker();
  const pendingTodos = getPendingTodos().slice(0, 4);

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Tasks"
          title="Upcoming Deadlines"
          description="Career tasks and deadlines to keep you on track."
        />
        <Stagger className="max-w-2xl">
          {pendingTodos.map((task) => (
            <Reveal key={task.id}>
              <div className="flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  task.priority === "high" ? "bg-red-100" :
                  task.priority === "medium" ? "bg-yellow-100" :
                  "bg-gray-100"
                }`}>
                  <Calendar size={18} className={
                    task.priority === "high" ? "text-red-600" :
                    task.priority === "medium" ? "text-yellow-600" :
                    "text-gray-600"
                  } />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-black">{task.task}</p>
                  <p className="text-xs text-[#6b7280]">Due: {task.due}</p>
                </div>
                <button
                  onClick={() => toggleTodo(task.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    task.priority === "high" ? "bg-red-100 text-red-700 hover:bg-red-200" :
                    task.priority === "medium" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                    "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Complete
                </button>
              </div>
            </Reveal>
          ))}
          {pendingTodos.length === 0 && (
            <Reveal>
              <div className="flex items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white p-8">
                <p className="text-sm text-[#6b7280]">No pending tasks. Great job!</p>
              </div>
            </Reveal>
          )}
        </Stagger>
      </div>
    </section>
  );
}

function LearningRoadmapSection() {
  const { state } = useTracker();
  const { roadmap } = state;

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Learning Path"
          title="Your Roadmap"
          description="CareerPilot builds your roadmap from CV gaps, target roles, and application progress."
        />
        <Stagger className="grid gap-5 md:grid-cols-2">
          {roadmap.map((week) => (
            <Reveal key={week.week}>
              <div className="group relative rounded-2xl border border-[#e5e7eb] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-[#1D4ED8]/5">
                {/* Timeline dot */}
                <div className={`absolute -left-3 top-6 flex size-6 items-center justify-center rounded-full ring-4 ring-white ${
                  week.status === "completed" ? "bg-[#10b981]" :
                  week.status === "in-progress" ? "bg-[#1d4ed8]" :
                  "bg-[#e5e7eb]"
                }`}>
                  {week.status === "completed" && (
                    <CheckCircle2 size={14} className="text-white" />
                  )}
                  {week.status === "in-progress" && (
                    <Zap size={12} className="text-white" />
                  )}
                  {week.status === "upcoming" && (
                    <div className="size-2 rounded-full bg-gray-400" />
                  )}
                </div>

                {/* Week badge and status */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1d4ed8]">{week.week}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    week.status === "completed" ? "bg-green-100 text-green-700" :
                    week.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {week.status === "completed" ? "✓ Completed" :
                     week.status === "in-progress" ? "⟳ In Progress" :
                     "○ Upcoming"}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-extrabold text-black">{week.title}</h3>

                {/* Description */}
                <p className="mt-2 text-sm text-[#6b7280]">{week.description}</p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-[#6b7280]">
                    <span>Progress</span>
                    <span className="font-semibold text-black">{week.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${week.progress}%` }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{
                        duration: 1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`h-full rounded-full ${
                        week.status === "completed" 
                          ? "bg-gradient-to-r from-[#10b981] to-[#34d399]" 
                          : week.status === "in-progress"
                          ? "bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6]"
                          : "bg-[#e5e7eb]"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function AINudgesSection() {
  const { state, getWeeklyStats } = useTracker();
  const { applications, todos } = state;
  const weeklyStats = getWeeklyStats();

  // Generate dynamic AI nudges based on state
  const aiNudges = [
    {
      type: weeklyStats.applicationsThisWeek === 0 ? "alert" : "success",
      message: weeklyStats.applicationsThisWeek === 0
        ? "You haven't applied to any jobs this week. Start applying to stay on track!"
        : `Great progress! You've applied to ${weeklyStats.applicationsThisWeek} jobs this week.`,
      icon: weeklyStats.applicationsThisWeek === 0 ? AlertCircle : CheckCircle2,
      color: weeklyStats.applicationsThisWeek === 0 ? "text-[#ef4444]" : "text-[#10b981]",
      bg: weeklyStats.applicationsThisWeek === 0 ? "bg-red-50" : "bg-green-50",
    },
    {
      type: "suggestion",
      message: applications.filter(a => a.status === "Rejected").length > 0
        ? "Keep pushing! Each rejection brings you closer to the right opportunity."
        : "You've received positive responses on some applications. Keep the momentum going!",
      icon: Lightbulb,
      color: "text-[#f59e0b]",
      bg: "bg-amber-50",
    },
    {
      type: "reminder",
      message: weeklyStats.todosCompletedThisWeek < 3
        ? `You have ${todos.filter(t => !t.completed).length} pending tasks. Complete them to stay on track!`
        : "Excellent work on completing tasks this week! You're building strong habits.",
      icon: Clock,
      color: "text-[#3b82f6]",
      bg: "bg-blue-50",
    },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="AI Assistant"
          title="CareerPilot Insights"
          description="Proactive suggestions to help you stay on track."
        />
        <Stagger className="grid gap-4 md:grid-cols-3">
          {aiNudges.map((nudge, index) => (
            <Reveal key={index}>
              <div className={`flex items-start gap-4 rounded-2xl ${nudge.bg} p-5 border border-transparent`}>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white">
                  <nudge.icon size={20} className={nudge.color} />
                </div>
                <p className="text-sm font-medium leading-relaxed text-black">
                  {nudge.message}
                </p>
              </div>
            </Reveal>
          ))}
        </Stagger>
        <Reveal>
          <div className="mt-6 flex justify-center">
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4ed8] transition-colors hover:text-[#1e40af]"
            >
              Chat with AI <MessageSquare size={14} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SkillsToImproveSection() {
  const { state } = useTracker();
  const { skills } = state;

  // Map skills to display format - use default data if no skills added yet
  const displaySkills = skills.length > 0 ? skills.map(skill => ({
    id: skill.id,
    name: skill.name,
    proficiency: skill.level,
    priority: skill.level < 40 ? "high" : skill.level < 70 ? "medium" : "low" as "high" | "medium" | "low",
    category: "User Added",
  })) : [
    { id: "default-1", name: "System Design", proficiency: 45, priority: "high" as const, category: "Backend" },
    { id: "default-2", name: "TypeScript", proficiency: 72, priority: "medium" as const, category: "Frontend" },
    { id: "default-3", name: "GraphQL", proficiency: 38, priority: "high" as const, category: "API" },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Improvement Areas"
          title="Skills to Develop"
          description="Based on your target roles, here is what to focus on."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displaySkills.slice(0, 6).map((skill, index) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-4 transition-all duration-300 hover:border-[#1d4ed8]/30 hover:shadow-lg hover:shadow-[#1d4ed8]/10"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#1d4ed8]/10">
                  <Target size={18} className="text-[#1d4ed8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">{skill.name}</h3>
                  <p className="text-xs text-[#6b7280]">{skill.category}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6b7280]">Proficiency</span>
                  <span className="font-semibold text-black">{skill.proficiency}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.proficiency}%` }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      skill.priority === "high" ? "bg-gradient-to-r from-[#ef4444] to-[#f87171]" :
                      skill.priority === "medium" ? "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]" :
                      "bg-gradient-to-r from-[#10b981] to-[#34d399]"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveLearningRoadmapSection({
  cvSnapshot,
}: {
  cvSnapshot: CvSnapshot | null;
}) {
  const { state, getWeeklyStats } = useTracker();
  const roadmap = buildDashboardRoadmap(state, cvSnapshot, getWeeklyStats());

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Learning Path"
          title="Your Roadmap"
          description="CareerPilot builds your roadmap from CV gaps, target roles, and application progress."
        />
        <Stagger className="grid gap-5 md:grid-cols-2">
          {roadmap.map((week) => (
            <Reveal key={week.week}>
              <div className="group relative rounded-2xl border border-[#e5e7eb] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-[#1D4ED8]/5">
                <div className={`absolute -left-3 top-6 flex size-6 items-center justify-center rounded-full ring-4 ring-white ${
                  week.status === "completed" ? "bg-[#10b981]" :
                  week.status === "in-progress" ? "bg-[#1d4ed8]" :
                  "bg-[#e5e7eb]"
                }`}>
                  {week.status === "completed" && (
                    <CheckCircle2 size={14} className="text-white" />
                  )}
                  {week.status === "in-progress" && (
                    <Zap size={12} className="text-white" />
                  )}
                  {week.status === "upcoming" && (
                    <div className="size-2 rounded-full bg-gray-400" />
                  )}
                </div>

                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1d4ed8]">{week.week}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    week.status === "completed" ? "bg-green-100 text-green-700" :
                    week.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {week.status === "completed" ? "Completed" :
                     week.status === "in-progress" ? "In Progress" :
                     "Upcoming"}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-black">{week.title}</h3>
                <p className="mt-2 text-sm text-[#6b7280]">{week.description}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-[#6b7280]">
                    <span>Progress</span>
                    <span className="font-semibold text-black">{week.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${week.progress}%` }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{
                        duration: 1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`h-full rounded-full ${
                        week.status === "completed"
                          ? "bg-gradient-to-r from-[#10b981] to-[#34d399]"
                          : week.status === "in-progress"
                            ? "bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6]"
                            : "bg-[#e5e7eb]"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function LiveSkillsToImproveSection({
  cvSnapshot,
}: {
  cvSnapshot: CvSnapshot | null;
}) {
  const { state } = useTracker();
  const displaySkills = buildDashboardSkillFocus(state, cvSnapshot);

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Improvement Areas"
          title="Skills to Develop"
          description="Based on your target roles, here is what to focus on."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displaySkills.slice(0, 6).map((skill, index) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-4 transition-all duration-300 hover:border-[#1d4ed8]/30 hover:shadow-lg hover:shadow-[#1d4ed8]/10"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#1d4ed8]/10">
                  <Target size={18} className="text-[#1d4ed8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">{skill.name}</h3>
                  <p className="text-xs text-[#6b7280]">{skill.category}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6b7280]">Proficiency</span>
                  <span className="font-semibold text-black">{skill.proficiency}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.proficiency}%` }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      skill.priority === "high" ? "bg-gradient-to-r from-[#ef4444] to-[#f87171]" :
                      skill.priority === "medium" ? "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]" :
                      "bg-gradient-to-r from-[#10b981] to-[#34d399]"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
          {displaySkills.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-6 text-sm text-[#6b7280] md:col-span-2 lg:col-span-3">
              Upload a CV or save applications to surface real skill gaps here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function buildDashboardRoadmap(
  state: {
    applications: Array<{ status: string; requiredSkills: string[] }>;
    todos: Array<{ completed: boolean }>;
    skills: Array<{ name: string }>;
  },
  cvSnapshot: CvSnapshot | null,
  weeklyStats: {
    applicationsThisWeek: number;
    todosCompletedThisWeek: number;
    skillsAddedThisWeek: number;
  }
) {
  const cvSkills = normalizeSkills(cvSnapshot?.skills || []);
  const missingSkills = collectMissingApplicationSkills(state.applications, cvSkills);
  const totalTodos = state.todos.length;
  const completedTodos = state.todos.filter((todo) => todo.completed).length;
  const interviewing = state.applications.filter((app) => app.status === "Interviewing").length;
  const experienceCount = cvSnapshot?.experience?.length || 0;

  return [
    {
      week: "Step 1",
      title: "CV and Profile Readiness",
      progress: cvSnapshot ? 100 : 10,
      status: (cvSnapshot ? "completed" : "in-progress") as "completed" | "in-progress" | "upcoming",
      description: cvSnapshot
        ? `Your CV is uploaded with ${cvSnapshot.skills?.length || 0} detected skills and ${experienceCount} experience section${experienceCount === 1 ? "" : "s"}.`
        : "Upload your CV to unlock fit scores, assistant grounding, and cover letter generation.",
    },
    {
      week: "Step 2",
      title: "Close Target Role Skill Gaps",
      progress: missingSkills.length === 0 ? 15 : Math.max(25, 100 - missingSkills.length * 15),
      status: (missingSkills.length === 0 ? "upcoming" : "in-progress") as "completed" | "in-progress" | "upcoming",
      description:
        missingSkills.length > 0
          ? `Focus next on ${missingSkills.slice(0, 3).join(", ")} based on the requirements of your saved applications.`
          : "Save a few target jobs so CareerPilot can identify missing skills from real application requirements.",
    },
    {
      week: "Step 3",
      title: "Application Momentum",
      progress: Math.min(100, weeklyStats.applicationsThisWeek * 20),
      status: (weeklyStats.applicationsThisWeek >= 5
        ? "completed"
        : weeklyStats.applicationsThisWeek > 0
          ? "in-progress"
          : "upcoming") as "completed" | "in-progress" | "upcoming",
      description:
        weeklyStats.applicationsThisWeek > 0
          ? `You have submitted ${weeklyStats.applicationsThisWeek} application${weeklyStats.applicationsThisWeek === 1 ? "" : "s"} this week. Keep pushing toward your weekly goal of 5.`
          : "Start your weekly goal by applying to your strongest-fit roles from the jobs page.",
    },
    {
      week: "Step 4",
      title: "Follow-up and Interview Readiness",
      progress: totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0,
      status: (interviewing > 0 || completedTodos > 0 ? "in-progress" : "upcoming") as "completed" | "in-progress" | "upcoming",
      description:
        interviewing > 0
          ? `You currently have ${interviewing} application${interviewing === 1 ? "" : "s"} in interviewing. Use todos and the assistant to prepare responses and next steps.`
          : totalTodos > 0
            ? `You have completed ${completedTodos} of ${totalTodos} productivity tasks. Keep deadlines and follow-ups moving.`
            : "Add tracker tasks and deadlines to keep your preparation and follow-ups organized.",
    },
  ];
}

function buildDashboardSkillFocus(
  state: {
    applications: Array<{ requiredSkills: string[] }>;
    skills: Array<{ id: string; name: string; level: number }>;
  },
  cvSnapshot: CvSnapshot | null
) {
  const cvSkills = normalizeSkills(cvSnapshot?.skills || []);
  const missingSkillCards = collectMissingApplicationSkills(state.applications, cvSkills).map((skill, index) => ({
    id: `gap-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    name: skill,
    proficiency: 20,
    priority: "high" as const,
    category: "Job Gap",
  }));

  const trackerSkillCards = state.skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    proficiency: skill.level,
    priority: (skill.level < 40 ? "high" : skill.level < 70 ? "medium" : "low") as "high" | "medium" | "low",
    category: "Tracked Skill",
  }));

  const cvSkillCards = (cvSnapshot?.skills || []).slice(0, 6).map((skill, index) => ({
    id: `cv-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    name: skill,
    proficiency: 75,
    priority: "low" as const,
    category: "CV Skill",
  }));

  const seen = new Set<string>();
  return [...missingSkillCards, ...trackerSkillCards, ...cvSkillCards].filter((skill) => {
    const key = skill.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeSkills(skills: string[]) {
  return new Set(skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean));
}

function collectMissingApplicationSkills(
  applications: Array<{ requiredSkills: string[] }>,
  cvSkills: Set<string>
) {
  const missing = new Set<string>();
  for (const application of applications) {
    for (const skill of application.requiredSkills || []) {
      const normalized = skill.trim().toLowerCase();
      if (!normalized || cvSkills.has(normalized)) continue;
      missing.add(skill.trim());
    }
  }
  return Array.from(missing);
}
