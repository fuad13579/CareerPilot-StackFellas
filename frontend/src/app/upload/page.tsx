import { PageShell } from "@/components/motion-shell";
import { UploadExperience } from "@/components/upload-experience";

export default function UploadPage() {
  return (
    <PageShell
      title="Upload"
      description="Upload a resume or job description so CareerPilot can extract skills, experience, and role requirements."
    >
      <UploadExperience />
    </PageShell>
  );
}
