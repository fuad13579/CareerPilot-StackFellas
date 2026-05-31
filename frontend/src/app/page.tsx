"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  FileText, 
  MessageSquare, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Clock
} from "lucide-react";
import { Reveal, Stagger, GlassCard, AmbientBackground } from "@/components/motion-shell";
import { Navigation } from "@/components/navigation";

const pillars = [
  {
    icon: Briefcase,
    title: "Job Hunter Agent",
    description: "AI-powered job discovery with smart matching based on your skills and experience.",
  },
  {
    icon: FileText,
    title: "Profile& Resume Intelligence",
    description: "Upload your CV once. CareerPilot extracts and indexes your profile for all agents.",
  },
  {
    icon: MessageSquare,
    title: "Personal AI Assistant",
    description: "Ask anything about your career readiness, skill gaps, or job applications.",
  },
  {
    icon: TrendingUp,
    title: "Productivity & Progress Tracker",
    description: "Track applications, monitor progress, and stay on top of your job search.",
  },
];

const demoSteps = [
  { label: "CV Upload", icon: FileText },
  { label: "Job Search", icon: Briefcase },
  { label: "Fit Score", icon: Target },
  { label: "AI Query", icon: MessageSquare },
  { label: "Cover Letter", icon: Sparkles },
  { label: "Tracker", icon: TrendingUp },
];

export default function HomePage() {
  return (
    <>
      <AmbientBackground />
      <Navigation />
      
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 pt-1 text-center">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
              animate={{ opacity: [0.02, 0.04, 0.02] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-0 size-[50rem] -translate-x-1/2 rounded-full bg-[#1D4ED8] blur-[200px]"
            />
          </div>

          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-sm font-medium text-[#6B7280] shadow-sm">
              <Zap size={14} className="text-[#1D4ED8]" />
              Agentic Career Intelligence
            </div>
          </Reveal>

          <Reveal>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-[#111827] sm:text-6xl lg:text-7xl">
              CareerPilot
            </h1>
          </Reveal>

          <Reveal>
            <p className="mt-4 text-xl font-medium text-[#6B7280] sm:text-2xl">
              Your Agentic Career Co-pilot
            </p>
          </Reveal>

          <Reveal>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#6B7280] sm:text-lg">
              Upload your CV, discover matched jobs, calculate fit scores, ask an AI assistant, 
              generate cover letters, and track your applications — all powered by intelligent agents.
            </p>
          </Reveal>

          <Reveal>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/upload"
                className="group flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1E40AF] hover:shadow-lg"
              >
                Get Started
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-semibold text-[#374151] shadow-sm transition-all hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                View Dashboard
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Four Pillars Section */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mb-16 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#1D4ED8]">
                  Core Features
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl">
                  Four Pillars of CareerPilot
                </h2>
                <p className="mt-4 max-w-xl mx-auto text-base text-[#6B7280]">
                  Every feature is powered by your uploaded CV, creating a unified career intelligence system.
</p>
              </div>
            </Reveal>

            <Stagger>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {pillars.map((pillar) => (
                  <GlassCard key={pillar.title}>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF]">
                      <pillar.icon size={22} className="text-[#1D4ED8]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#111827]">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                      {pillar.description}
                    </p>
                  </GlassCard>
                ))}
              </div>
            </Stagger>
          </div>
        </section>

        {/* Demo Flow Section */}
        <section className="px-6 py-24 bg-white">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-16 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#1D4ED8]">
                  How It Works
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl">
                  The Experience
                </h2>
                <p className="mt-4 max-w-xl mx-auto text-base text-[#6B7280]">
                  Experience the full power of CareerPilot in a seamless end-to-end workflow.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {demoSteps.map((step, index) => (
                  <Fragment key={step.label}>
                    <div key={step.label} className="flex flex-col items-center">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#E5E7EB] bg-white shadow-sm transition-all hover:border-[#1D4ED8] hover:shadow-md">
                          <step.icon size={22} className="text-[#1D4ED8]" />
                        </div>
                      </motion.div>
                      <p className="mt-2 text-xs font-semibold text-[#6B7280] sm:text-sm">
                        {step.label}
                      </p>
                    </div>
                    {index < demoSteps.length - 1 && (
                      <ArrowRight size={18} className="hidden text-[#D1D5DB] sm:block" />
                    )}
                  </Fragment>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <div className="rounded-3xl bg-gradient-to-br from-[#1D4ED8] to-[#1E40AF] px-8 py-16 text-white shadow-2xl">
                <Clock size={40} className="mx-auto mb-6 opacity-80" />
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Ready to Launch Your Career?
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/80">
                  Start with uploading your CV. CareerPilot will analyze it and prepare 
                  intelligent agents to help you land your next opportunity.
                </p>
                <Link
                  href="/upload"
                  className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1D4ED8] shadow-md transition-all hover:bg-[#F9FAFB] hover:shadow-lg"
                >
                  Start with CV Upload
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#E5E7EB] px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm font-semibold text-[#111827]">
                CareerPilot
              </p>
              <p className="text-sm text-[#6B7280]">
                Agentic Career Intelligence Platform
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
