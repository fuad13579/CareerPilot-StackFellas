import { CoverLetterSection } from "@/components/cover-letter-section";

export default function CoverLetterPage() {
  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Cover Letter Generator</h1>
        <p className="mt-2 text-sm text-gray-600">
          Pick a saved application from your tracker and generate a personalized cover letter.
        </p>
      </div>
      <CoverLetterSection />
    </div>
  );
}
