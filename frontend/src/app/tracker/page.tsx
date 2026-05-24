import { PageShell } from "@/components/page-shell";

const stages = [
  ["Applied", "6 roles"],
  ["Screening", "3 roles"],
  ["Interview", "3 roles"],
  ["Offer", "1 role"],
];

export default function TrackerPage() {
  return (
    <PageShell
      title="Tracker"
      description="Monitor application status, follow-up timing, interview stages, and outcomes."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map(([stage, count]) => (
          <article
            key={stage}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-950">{stage}</h2>
            <p className="mt-3 text-sm text-slate-600">{count}</p>
            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div className="h-2 w-2/3 rounded-full bg-cyan-600" />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
