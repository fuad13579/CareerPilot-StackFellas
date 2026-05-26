import { JobsExperience } from "@/components/jobs-experience";
import { PageShell } from "@/components/motion-shell";

export default function JobsPage() {
  return (
    <PageShell
      title="Jobs"
      description="Browse matched roles and compare them against your current resume profile."
    >
      <JobsExperience />
    </PageShell>
  );
}
