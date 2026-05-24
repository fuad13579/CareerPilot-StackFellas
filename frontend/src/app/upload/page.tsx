import { PageShell } from "@/components/page-shell";

export default function UploadPage() {
  return (
    <PageShell
      title="Upload"
      description="Upload a resume or job description so CareerPilot can extract skills, experience, and role requirements."
    >
      <div className="rounded-lg border border-dashed border-cyan-300 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Resume intake</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Drag-and-drop support and parsing will connect here. For now, this page
          establishes the upload workflow surface.
        </p>
        <button className="mt-6 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700">
          Select file
        </button>
      </div>
    </PageShell>
  );
}
