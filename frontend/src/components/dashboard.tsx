"use client";

import { motion } from "framer-motion";
import Link from "next/link";
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
  Send
} from "lucide-react";
import { Reveal, Stagger } from "./motion-shell";

export function DashboardHome() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <WelcomeHero />
      <main className="space-y-16 pb-16">
        <CVStatusSection />
        <QuickStatsSection />
        <RecommendedJobsSection />
        <ApplicationTrackerSection />
        <UpcomingTasksSection />
        <LearningRoadmapSection />
        <AINudgesSection />
        <SkillsToImproveSection />
      </main>
    </div>
  );
}

const welcomeInfo = {
  greeting: "Welcome back!",
  message: "Your CV has been analyzed and CareerPilot is ready to help you apply smarter.",
  lastActive: "Last active: Today",
};

const cvStatus = {
  uploaded: true,
  lastAnalyzed: "May 30, 2026",
  skillsDetected: 12,
  experienceSections: 3,
  overallScore: 85,
};

const quickStats = [
  { value: "7", label: "Applications Sent", icon: Send, color: "text-[#1d4ed8]" },
  { value: "78%", label: "Avg. Fit Score", icon: Target, color: "text-[#059669]" },
  { value: "15", label: "Jobs Saved", icon: Briefcase, color: "text-[#d97706]" },
  { value: "45%", label: "Roadmap Progress", icon: TrendingUp, color: "text-[#7c3aed]" },
];

const recommendedJobs = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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

const applicationTracker = [
  { status: "Applied", count: 4, color: "bg-[#3b82f6]" },
  { status: "Interviewing", count: 2, color: "bg-[#f59e0b]" },
  { status: "Offer", count: 0, color: "bg-[#10b981]" },
  { status: "Rejected", count: 1, color: "bg-[#ef4444]" },
];

const upcomingTasks = [
  { task: "Apply to saved Frontend Developer role", due: "Tomorrow", priority: "high" },
  { task: "Update CV project section", due: "In 2 days", priority: "medium" },
  { task: "Finish DSA practice module", due: "In 3 days", priority: "medium" },
  { task: "Follow up with TechCorp recruiter", due: "In 4 days", priority: "low" },
];

const roadmapProgress = [
  { 
    week: "Week 1", 
    title: "Resume Improvement", 
    progress: 100, 
    status: "completed",
    description: "Improve CV structure, project descriptions, and skill keywords."
  },
  { 
    week: "Week 2", 
    title: "Skill Gap Practice", 
    progress: 75, 
    status: "in-progress",
    description: "Practice missing skills identified from job fit analysis."
  },
  { 
    week: "Week 3", 
    title: "Job Applications", 
    progress: 40, 
    status: "in-progress",
    description: "Apply to matched jobs and track application outcomes."
  },
  { 
    week: "Week 4", 
    title: "Interview Preparation", 
    progress: 0, 
    status: "upcoming",
    description: "Prepare answers, practice DSA, and review saved job descriptions."
  },
];

const aiNudges = [
  {
    type: "alert",
    message: "You have not applied to any jobs this week.",
    icon: AlertCircle,
    color: "text-[#ef4444]",
    bg: "bg-red-50",
  },
  {
    type: "suggestion",
    message: "Your CV is strong in React but missing backend project details.",
    icon: Lightbulb,
    color: "text-[#f59e0b]",
    bg: "bg-amber-50",
  },
  {
    type: "reminder",
    message: "Three saved jobs have deadlines within 5 days.",
    icon: Clock,
    color: "text-[#3b82f6]",
    bg: "bg-blue-50",
  },
];

const skillsToImprove = [
  { name: "System Design", level: 45 },
  { name: "Node.js", level: 38 },
  { name: "GraphQL", level: 52 },
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

function WelcomeHero() {
  return (
    <section className="relative flex min-h-[50vh] items-center px-6 py-16 lg:px-16">
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} 
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <Reveal>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-[#1d4ed8]" size={20} />
            <span className="text-sm font-semibold text-[#1d4ed8]">CareerPilot Active</span>
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

function CVStatusSection() {
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
              <p className="mt-1 text-lg font-bold text-black">Uploaded</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#eff6ff]">
                <FileText className="text-[#1d4ed8]" size={24} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">Skills Detected</p>
              <p className="mt-1 text-lg font-bold text-black">{cvStatus.skillsDetected} skills</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#f3f4f6]">
                <BookOpen className="text-[#6b7280]" size={24} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">Experience</p>
              <p className="mt-1 text-lg font-bold text-black">{cvStatus.experienceSections} sections</p>
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

function QuickStatsSection() {
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

function RecommendedJobsSection() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Job Matches"
          title="Recommended For You"
          description="Jobs that match your skills and preferences."
        />
        <Stagger className="grid gap-5 lg:grid-cols-3">
          {recommendedJobs.map((job) => (
            <Reveal key={job.id}>
              <div className="group flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F3F6FB] text-lg font-extrabold text-[#1D4ED8]">
                      {job.company[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-black">{job.role}</h3>
                      <p className="text-sm font-bold text-[#1D4ED8]">{job.company}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${
                    job.fitScore >= 90 ? "bg-green-100 text-green-700" :
                    job.fitScore >= 80 ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {job.fitScore}%
                  </span>
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
          ))}
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
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Tasks"
          title="Upcoming Deadlines"
          description="Career tasks and deadlines to keep you on track."
        />
        <Stagger className="max-w-2xl">
          {upcomingTasks.map((task, index) => (
            <Reveal key={index}>
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
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  task.priority === "high" ? "bg-red-100 text-red-700" :
                  task.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {task.priority}
                </span>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function LearningRoadmapSection() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Learning Path"
          title="Your Roadmap"
          description="CareerPilot builds your roadmap from CV gaps, target roles, and application progress."
        />
        <Stagger className="grid gap-5 md:grid-cols-2">
          {roadmapProgress.map((week) => (
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
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Improvement Areas"
          title="Skills to Develop"
          description="Based on your target roles, here is what to focus on."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {skillsToImprove.map((skill) => (
            <Reveal key={skill.name}>
              <div className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-[#1D4ED8]/5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-bold text-[#111827]">
                    {skill.name}
                  </span>
                  <span className="text-sm font-semibold text-[#1D4ED8]">
                    {skill.level}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.level}%` }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      duration: 1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6]"
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
