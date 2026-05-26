import { AssistantExperience } from "@/components/assistant-experience";
import { PageShell } from "@/components/motion-shell";

export default function AssistantPage() {
  return (
    <PageShell
      title="Assistant"
      description="Ask for resume improvements, job-fit analysis, interview prep, or next-step guidance."
    >
      <AssistantExperience />
    </PageShell>
  );
}
