"use client";

import { PageShell } from "@/components/motion-shell";
import { UploadExperience } from "@/components/upload-experience";
import { CoverLetterSection } from "@/components/cover-letter-section";

export default function UploadPage() {
  return (
    <PageShell
      eyebrow="CareerPilot"
      title="Upload & Analyze"
      description="Upload your resume to extract skills, experience, and get personalized job recommendations."
    >
      <UploadExperience />
      <CoverLetterSection />
    </PageShell>
  );
}
