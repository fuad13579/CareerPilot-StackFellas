import { PageShell } from "@/components/page-shell";

const jobs = [
  ["Frontend Developer", "Remote", "92% match"],
  ["Product Engineer", "New York, NY", "87% match"],
  ["Full Stack Intern", "Hybrid", "81% match"],
];

export default function JobsPage() {
  return (
    <PageShell
      title="Jobs"
      description="Browse matched roles and compare them against your current resume profile."
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {jobs.map(([role, location, match]) => (
          <article
            key={role}
            className="grid gap-3 border-b border-slate-100 p-5 last:border-b-0 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <h2 className="font-semibold text-slate-950">{role}</h2>
              <p className="mt-1 text-sm text-slate-600">{location}</p>
            </div>
            <span className="h-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              {match}
            </span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
