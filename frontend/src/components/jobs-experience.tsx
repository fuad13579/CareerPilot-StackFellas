"use client";

import { useState } from "react";
import { Search, MapPin, DollarSign, Calendar, Sparkles, Bookmark, Loader2, Briefcase } from "lucide-react";
import { GlassCard, Reveal, Stagger } from "./motion-shell";

interface Job {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  deadline: string;
  match: number;
  type: "Remote" | "Hybrid" | "On-site";
}

const mockJobs: Job[] = [
  { id: "1", role: "Frontend Developer", company: "Vercel", location: "San Francisco, CA", salary: "$120k - $180k", deadline: "2026-06-15", match: 92, type: "Remote" },
  { id: "2", role: "Product Engineer", company: "Linear", location: "New York, NY", salary: "$140k - $200k", deadline: "2026-06-20", match: 87, type: "Hybrid" },
  { id: "3", role: "Full Stack Developer", company: "Stripe", location: "Seattle, WA", salary: "$130k - $190k", deadline: "2026-06-25", match: 81, type: "Remote" },
  { id: "4", role: "React Developer", company: "Notion", location: "Austin, TX", salary: "$110k - $160k", deadline: "2026-07-01", match: 78, type: "On-site" },
  { id: "5", role: "Next.js Engineer", company: "Figma", location: "Los Angeles, CA", salary: "$135k - $185k", deadline: "2026-07-10", match: 85, type: "Hybrid" },
  { id: "6", role: "UI Engineer", company: "Slack", location: "Denver, CO", salary: "$115k - $170k", deadline: "2026-07-15", match: 74, type: "Remote" },
];

const getMatchColor = (match: number) => {
  if (match >= 85) return "bg-green-100 text-green-700";
  if (match >= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
};

export function JobsExperience() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSearching(false);
  };

  const handleAnalyzeFit = async (jobId: string) => {
    setAnalyzingId(jobId);
    // Simulate AI analysis
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAnalyzingId(null);
    // In production, this would call the backend API
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
            placeholder="Search for jobs... e.g. 'React developer in New York'"
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

      {/* Job Cards */}
      <Stagger className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <Reveal key={job.id}>
            <GlassCard className="h-full flex flex-col p-6 hover:shadow-xl transition-shadow">
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
                <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${getMatchColor(job.match)}`}>
                  {job.match}% Match
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
                  <span className="text-sm font-medium text-gray-700">{job.salary}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(job.deadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    job.type === "Remote" ? "bg-green-100 text-green-700" :
                    job.type === "Hybrid" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {job.type}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-3 pt-5">
                <button
                  onClick={() => handleAnalyzeFit(job.id)}
                  disabled={analyzingId === job.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-3 font-extrabold text-white transition-all hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {analyzingId === job.id ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Analyze Fit
                </button>
                <button
                  onClick={() => handleSaveJob(job.id)}
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
        ))}
      </Stagger>
    </div>
  );
}
