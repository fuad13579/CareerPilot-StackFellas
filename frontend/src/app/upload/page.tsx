"use client";

import { PageShell } from "@/components/motion-shell";
import { UploadExperience } from "@/components/upload-experience";

export default function UploadPage() {
  return (
    <PageShell
      eyebrow="CareerPilot"
      title="Upload Your CV"
      description="CareerPilot analyzes your CV and uses it as the source of truth for job matching, AI assistant answers, cover letters, and skill gap analysis."
    >
      <UploadExperience />
    </PageShell>
  );
}
