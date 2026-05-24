import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";

const nextActions = [
  { href: "/upload", label: "Upload resume", detail: "Add or refresh your candidate profile." },
  { href: "/jobs", label: "Review matches", detail: "Scan recommended roles for fit." },
  { href: "/tracker", label: "Update tracker", detail: "Keep applications moving forward." },
];

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Track your job search activity, resume readiness, and application momentum from one place."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active applications" value="12" helper="4 need follow-up this week" />
        <StatCard label="Saved jobs" value="28" helper="New matches added today" />
        <StatCard label="Resume score" value="82%" helper="Strong match for product roles" />
        <StatCard label="Interviews" value="3" helper="Upcoming across two companies" />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {nextActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-950">{action.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.detail}</p>
          </Link>
        ))}
      </section>
    </PageShell>
  );
}
