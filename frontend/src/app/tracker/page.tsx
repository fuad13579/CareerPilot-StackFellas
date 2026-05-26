import { PageShell } from "@/components/motion-shell";
import { TrackerExperience } from "@/components/tracker-experience";

export default function TrackerPage() {
  return (
    <PageShell
      title="Tracker"
      description="Monitor application status, follow-up timing, interview stages, and outcomes."
    >
      <TrackerExperience />
    </PageShell>
  );
}
