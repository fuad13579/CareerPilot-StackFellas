import { TrackerExperience } from "@/components/tracker-experience";

export default function TrackerPage() {
  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#111827]">Tracker</h1>
        <p className="mt-1 text-sm font-medium text-[#6B7280]">
          Monitor application status, follow-up timing, interview stages, and outcomes.
        </p>
      </div>
      <TrackerExperience />
    </div>
  );
}
