"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Award, CheckCircle2, Mail, MapPin, Calendar, ExternalLink, Globe, Briefcase, Languages } from "lucide-react";
import { GlassCard, Reveal, Stagger, entranceVariants } from "./motion-shell";

// =============================================
// DATA - Personal Brand Information
// =============================================

const heroInfo = {
  name: "Tahmeed",
  role: "Frontend Developer",
  tagline: "Building polished, reliable digital experiences.",
  summary:
    "I create structured, responsive interfaces with strong attention to usability, implementation detail, and recruiter-ready presentation. Focused on clean code and scalable UI systems.",
  availability: [
    { label: "Open to Opportunities", active: true },
    { label: "Remote Friendly", active: true },
    { label: "Internship Available", active: false },
  ],
};

const profileStats = [
  { value: "3+", label: "Projects Shipped" },
  { value: "5", label: "Core Skills" },
  { value: "2026", label: "Graduation" },
];

const coreStack = [
  "React", "Next.js", "TypeScript", "Tailwind CSS", "UI Systems", "Framer Motion"
];

const highlights = [
  "Production-ready interfaces",
  "Clean component architecture",
  "Professional communication",
];

const about = {
  positioning: "Frontend engineering with product judgement.",
  description:
    "I care about interfaces that are structured, accessible, responsive, and intuitive. My work combines modern frontend tools with a calm, professional design sensibility — avoiding flashy trends in favor of intentional, lasting quality.",
};

const education = [
  {
    period: "2022 — Present",
    title: "Computer Science",
    institution: "University",
    description:
      "Software engineering, web systems, and product-focused development.",
  },
  {
    period: "2020 — 2022",
    title: "Higher Secondary",
    institution: "High School",
    description:
      "Analytical thinking, communication, and technical problem solving.",
  },
];

const experience = [
  {
    period: "2024 — Present",
    role: "Frontend Developer",
    type: "Professional",
    description:
      "Designed responsive web interfaces, reusable components, and polished user experiences.",
    technologies: ["React", "Next.js", "Tailwind"],
    outcome: "Delivered production-ready UI systems",
  },
  {
    period: "2023 — 2024",
    role: "Project Contributor",
    type: "Collaborative",
    description:
      "Collaborated across product, design, and engineering workflows to ship practical features.",
    technologies: ["TypeScript", "UI Systems"],
    outcome: "Shipped features with cross-functional teams",
  },
];

const skills = [
  { name: "React / Next.js", level: 88 },
  { name: "TypeScript", level: 82 },
  { name: "UI Engineering", level: 86 },
  { name: "Tailwind CSS", level: 90 },
  { name: "Communication", level: 84 },
  { name: "Problem Solving", level: 80 },
];

const projects = [
  {
    title: "CareerPilot",
    description:
      "Career workflow platform for resumes, job tracking, and interview preparation.",
    role: "Frontend Lead",
    stack: "Next.js, TypeScript, Tailwind",
    result: "End-to-end platform for career management",
    link: "#",
  },
  {
    title: "Portfolio System",
    description:
      "Personal brand site designed for recruiter clarity and professional storytelling.",
    role: "Designer & Developer",
    stack: "React, Framer Motion",
    result: "Recruiter-focused personal brand",
    link: "#",
  },
  {
    title: "Application Tracker",
    description:
      "Structured interface for monitoring applications, interviews, and follow-ups.",
    role: "Product Developer",
    stack: "React, UI Systems",
    result: "Structured application management",
    link: "#",
  },
];

const achievements = [
  "Built production-ready responsive interfaces",
  "Designed reusable UI component systems",
  "Delivered polished project work under tight timelines",
];

const certifications = [
  "Frontend development foundations",
  "Modern React application patterns",
  "Responsive web design and accessibility",
];

// =============================================
// MAIN COMPONENT
// =============================================

export function PortfolioHome() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Hero />
      <main className="space-y-28 pb-20">
        <AboutSection />
        <EducationSection />
        <ExperienceSection />
        <SkillsSection />
        <ProjectsSection />
        <RecruiterSnapshot />
        <ContactSection />
      </main>
    </div>
  );
}

// =============================================
// HERO SECTION
// =============================================

function Hero() {
  return (
    <section className="relative flex min-h-[85vh] items-center px-6 py-24 lg:px-16">
      {/* Subtle dot-grid decoration */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} 
      />
      
      <div className="relative mx-auto w-full max-w-5xl">
        {/* Availability Pills */}
        <Reveal>
          <div className="mb-6 flex flex-wrap gap-3">
            {heroInfo.availability.map((item, i) => (
              <span
                key={i}
                className={`text-[11px] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border ${
                  item.active
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-[#e5e7eb]"
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </Reveal>

        {/* Name */}
        <Reveal>
          <h1 className="mb-3 text-[clamp(3rem,8vw,5.5rem)] font-extrabold tracking-tight leading-[0.95] text-black">
            {heroInfo.name}
          </h1>
        </Reveal>

        {/* Role */}
        <Reveal>
          <p className="mb-6 text-[clamp(1.5rem,4vw,2.75rem)] font-bold text-[#1d4ed8] tracking-tight">
            {heroInfo.role}
          </p>
        </Reveal>

        {/* Summary */}
        <Reveal>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[#374151]">
            {heroInfo.summary}
          </p>
        </Reveal>

        {/* CTAs */}
        <Reveal>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#1d4ed8]"
            >
              Get in Touch <ArrowRight size={16} />
            </Link>
            <Link
              href="#projects"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#e5e7eb] bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:border-black"
            >
              View Work <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>

        {/* Slim info row */}
        <Reveal delay={0.2}>
          <div className="mt-16 grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-4">
            {profileStats.map((stat, i) => (
              <div key={i} className="border-l-2 border-[#e5e7eb] pl-4">
                <div className="text-2xl font-extrabold text-black">{stat.value}</div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">{stat.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// =============================================
// SECTION HEADER COMPONENT
// =============================================

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
      <div className="mb-12 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1D4ED8]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-[#111827] sm:text-5xl">
          {title}
        </h2>
        <p className="mt-5 text-base font-medium leading-7 text-[#6B7280]">
          {description}
        </p>
      </div>
    </Reveal>
  );
}

// =============================================
// ABOUT SECTION
// =============================================

function AboutSection() {
  return (
    <section id="about" className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="About"
          title="Professional Summary"
          description="A concise overview for recruiters and hiring managers."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Positioning Card */}
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff]">
                  <Award className="text-[#1d4ed8]" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">
                    Positioning
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold leading-tight text-black">
                    {about.positioning}
                  </h3>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Description Card */}
          <Reveal>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8">
              <p className="text-base leading-relaxed text-[#374151]">
                {about.description}
              </p>
              <div className="mt-6 flex gap-6">
                <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <div className="size-2 rounded-full bg-[#1d4ed8]" />
                  <span>5 Years Learning</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <div className="size-2 rounded-full bg-[#1d4ed8]" />
                  <span>Frontend Focus</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// =============================================
// EDUCATION SECTION
// =============================================

function EducationSection() {
  return (
    <section id="education" className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="Education"
          title="Academic Background"
          description="A structured foundation for technical growth."
        />

        <div className="relative max-w-2xl">
          {/* Timeline Line */}
          <div className="absolute left-[11px] top-0 h-full w-px bg-gradient-to-b from-[#1d4ed8] via-[#e5e7eb] to-transparent" />

          {/* Timeline Items */}
          <Stagger className="space-y-0">
            {education.map((item, index) => (
              <Reveal key={item.title}>
                <div className="relative flex gap-8 pb-12 last:pb-0">
                  {/* Timeline Dot */}
                  <div className="relative z-10 flex size-6 shrink-0 items-center justify-center">
                    <div className="size-3 rounded-full bg-[#1d4ed8] ring-4 ring-[#fafafa]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1d4ed8]">{item.period}</p>
                    <h3 className="mt-1 text-xl font-extrabold text-black">{item.title}</h3>
                    <p className="mt-1 text-sm font-medium text-[#6b7280]">{item.institution}</p>
                    <p className="mt-3 text-base leading-relaxed text-[#374151]">{item.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

// =============================================
// EXPERIENCE SECTION
// =============================================

function ExperienceSection() {
  return (
    <section id="experience" className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="Experience"
          title="Practical Experience"
          description="Professional patterns, collaboration, and delivery."
        />

        <Stagger className="grid gap-6 md:grid-cols-2">
          {experience.map((item) => (
            <Reveal key={item.role}>
              <div className="group rounded-2xl border border-[#e5e7eb] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                {/* Period */}
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">{item.period}</p>
                
                {/* Role */}
                <h3 className="mt-2 text-xl font-extrabold text-black">{item.role}</h3>
                <p className="mt-1 text-sm font-medium text-[#1d4ed8]">{item.type}</p>
                
                {/* Description */}
                <p className="mt-4 text-base leading-relaxed text-[#374151]">{item.description}</p>
                
                {/* Technologies */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-xs font-medium text-[#6b7280]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                
                {/* Outcome */}
                {item.outcome && (
                  <div className="mt-5 flex items-center gap-2 border-t border-[#e5e7eb] pt-4">
                    <Award size={14} className="text-[#1d4ed8]" />
                    <p className="text-xs font-medium text-[#6b7280]">{item.outcome}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// =============================================
// SKILLS SECTION
// =============================================

function SkillsSection() {
  return (
    <section id="skills" className="relative">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Skills"
          title="Core Strengths"
          description="Minimal indicators for capabilities recruiters scan first."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Reveal key={skill.name}>
              <div className="group rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-[#1D4ED8]/5">
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

// =============================================
// PROJECTS SECTION
// =============================================

function ProjectsSection() {
  return (
    <section id="projects" className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="Projects"
          title="Featured Work"
          description="Clear project cards for quick recruiter evaluation."
        />

        <Stagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Reveal key={project.title}>
              <div className="group flex flex-col rounded-2xl border border-[#e5e7eb] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                {/* Preview area */}
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-12 rounded-xl bg-[#1d4ed8]/10" />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <ExternalLink className="text-white" size={20} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-extrabold text-black">{project.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#374151]">{project.description}</p>
                  
                  {/* Role */}
                  {project.role && (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.06em] text-[#1d4ed8]">{project.role}</p>
                  )}
                  
                  {/* Tech Stack */}
                  <p className="mt-2 text-xs font-medium text-[#6b7280]">{project.stack}</p>
                  
                  {/* Key Result */}
                  {project.result && (
                    <p className="mt-4 text-sm font-medium text-[#374151]">{project.result}</p>
                  )}

                  {/* View Case Study */}
                  <div className="mt-auto flex items-center justify-end pt-4">
                    <Link
                      href={project.link}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-black transition-colors hover:text-[#1d4ed8]"
                    >
                      View Case Study <ArrowRight size={12} />
                    </Link>
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

// =============================================
// ACHIEVEMENTS SECTION
// =============================================

function AchievementsSection() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="Achievements"
          title="Signals of Readiness"
          description="Concise proof points that support credibility."
        />

        <Stagger className="grid gap-5 md:grid-cols-3">
          {achievements.map((item, index) => (
            <Reveal key={item}>
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#eff6ff]">
                  <Award className="text-[#1d4ed8]" size={20} />
                </div>
                <p className="text-base font-bold leading-7 text-black">
                  {item}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-[#1d4ed8]" />
                  <span className="text-xs text-[#6b7280]">
                    Achievement {index + 1}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// =============================================
// CERTIFICATIONS SECTION
// =============================================

function CertificationsSection() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="Certifications"
          title="Continued Learning"
          description="Additional preparation aligned with modern frontend work."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {certifications.map((item) => (
            <Reveal key={item}>
              <div className="flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5]">
                  <CheckCircle2 className="text-[#059669]" size={20} />
                </div>
                <p className="text-sm font-bold leading-6 text-black">
                  {item}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================
// RECRUITER SNAPSHOT SECTION
// =============================================

function RecruiterSnapshot() {
  const snapshot = [
    { icon: Globe, label: "Availability", value: "Open to Opportunities" },
    { icon: MapPin, label: "Location", value: "Remote / Flexible" },
    { icon: Languages, label: "Languages", value: "English" },
    { icon: Briefcase, label: "Focus Area", value: "Frontend Engineering" },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeader
          eyebrow="Recruiter Snapshot"
          title="Quick Facts"
          description="Essential information at a glance for recruiters."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.map((item) => (
            <Reveal key={item.label}>
              <div className="flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f6]">
                  <item.icon size={18} className="text-[#1d4ed8]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-black">{item.value}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================
// CONTACT SECTION
// =============================================

function ContactSection() {
  return (
    <section id="contact" className="relative">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="rounded-3xl bg-black p-8 sm:p-12">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left Content */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6b7280]">
                  Contact
                </p>
                <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                  Let&apos;s talk about the next role.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#9ca3af]">
                  For recruiter conversations, project reviews, or collaboration opportunities.
                </p>

                <div className="mt-8 space-y-4">
                  <a 
                    href="mailto:tahmeed@example.com"
                    className="flex items-center gap-3 text-sm font-medium text-white hover:text-[#60a5fa] transition-colors"
                  >
                    <Mail size={16} className="text-[#60a5fa]" />
                    tahmeed@example.com
                  </a>
                  <div className="flex items-center gap-3 text-sm font-medium text-white">
                    <MapPin size={16} className="text-[#60a5fa]" />
                    Remote / Flexible Location
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <a href="#" className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280] hover:text-white transition-colors">LinkedIn</a>
                    <a href="#" className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280] hover:text-white transition-colors">GitHub</a>
                  </div>
                </div>
              </div>

              {/* Right Form */}
              <form className="grid gap-4">
                <input
                  className="rounded-xl bg-[#1f2937] px-4 py-3 text-sm font-medium text-white placeholder:text-[#6b7280] outline-none transition-all focus:ring-2 focus:ring-[#3b82f6]/30"
                  placeholder="Your name"
                />
                <input
                  className="rounded-xl bg-[#1f2937] px-4 py-3 text-sm font-medium text-white placeholder:text-[#6b7280] outline-none transition-all focus:ring-2 focus:ring-[#3b82f6]/30"
                  placeholder="Email address"
                />
                <textarea
                  className="min-h-24 rounded-xl bg-[#1f2937] px-4 py-3 text-sm font-medium text-white placeholder:text-[#6b7280] outline-none transition-all focus:ring-2 focus:ring-[#3b82f6]/30"
                  placeholder="Your message"
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[#60a5fa]"
                >
                  Send Message <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
        </Reveal>

        {/* Premium Footer */}
        <footer className="mt-16 flex flex-col items-center gap-6 text-center">
          <div>
            <p className="text-xl font-extrabold text-black">Tahmeed</p>
            <p className="mt-1 text-sm text-[#6b7280]">Building polished, reliable digital experiences.</p>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">
            <a href="mailto:tahmeed@example.com" className="hover:text-black transition-colors">Email</a>
            <span className="text-[#e5e7eb]">•</span>
            <a href="#" className="hover:text-black transition-colors">LinkedIn</a>
            <span className="text-[#e5e7eb]">•</span>
            <a href="#" className="hover:text-black transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-[#9ca3af]">© 2026 Tahmeed. All rights reserved.</p>
        </footer>
      </div>
    </section>
  );
}
