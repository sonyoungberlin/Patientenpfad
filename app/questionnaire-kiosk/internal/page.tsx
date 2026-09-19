"use client";

import { useEffect, useState } from "react";
import InternalDocumentationLauncherForm from "@/components/InternalDocumentationLauncherForm";
import type { PracticeDocumentationBlockSummary } from "@/lib/practice/documentationBlocks";
import type { PracticeDocumentationTemplate } from "@/lib/practice/documentationTemplates";

export default function InternalDocumentationStartPage() {
  const [practiceTemplates, setPracticeTemplates] = useState<PracticeDocumentationTemplate[]>([]);
  const [availableBlocks, setAvailableBlocks] = useState<PracticeDocumentationBlockSummary[]>([]);
  useEffect(() => {
    if (typeof fetch !== "function") return;
    let cancelled = false;
    fetch("/api/questionnaire-kiosk/internal/templates")
      .then((response) => response.json())
      .then((result: {
        ok?: boolean;
        templates?: PracticeDocumentationTemplate[];
        blocks?: PracticeDocumentationBlockSummary[];
      }) => {
        if (!cancelled && result.ok && Array.isArray(result.templates)) {
          setPracticeTemplates(result.templates);
          setAvailableBlocks(result.blocks ?? []);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return (
    <main>
      <h1>Interne Dokumentation</h1>
      <InternalDocumentationLauncherForm
        endpoint="/api/questionnaire-kiosk/internal"
        practiceTemplates={practiceTemplates}
        availableBlocks={availableBlocks}
      />
    </main>
  );
}