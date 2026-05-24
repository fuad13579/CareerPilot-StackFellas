import { PageShell } from "@/components/page-shell";

export default function AssistantPage() {
  return (
    <PageShell
      title="Assistant"
      description="Ask for resume improvements, job-fit analysis, interview prep, or next-step guidance."
    >
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="max-w-2xl rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-700">
            What role are you targeting next?
          </div>
          <div className="ml-auto max-w-2xl rounded-lg bg-cyan-600 p-4 text-sm leading-6 text-white">
            I want to improve my resume for frontend engineering roles.
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="Ask CareerPilot..."
          />
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            Send
          </button>
        </div>
      </div>
    </PageShell>
  );
}
