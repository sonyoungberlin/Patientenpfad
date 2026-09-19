"use client";

import InternalDocumentationLauncherForm from "@/components/InternalDocumentationLauncherForm";
import type { PracticeDocumentationBlockSummary } from "@/lib/practice/documentationBlocks";
import type { PracticeDocumentationTemplate } from "@/lib/practice/documentationTemplates";

export default function InternalDocumentationLauncher({
  practiceTemplates = [],
  availableBlocks = [],
}: {
  practiceTemplates?: PracticeDocumentationTemplate[];
  availableBlocks?: PracticeDocumentationBlockSummary[];
}) {
  return (
    <InternalDocumentationLauncherForm
      endpoint="/api/internal-documentation"
      practiceTemplates={practiceTemplates}
      availableBlocks={availableBlocks}
      patientReferenceHint="Verwenden Sie nach Möglichkeit Ihre interne Praxisreferenz und keine unnötigen personenbezogenen Angaben."
      submitLabel="Starten"
    />
  );
}