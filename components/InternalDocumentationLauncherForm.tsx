"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InternalDocumentationLauncherBlocks from "@/components/InternalDocumentationLauncherBlocks";
import InternalDocumentationTemplateSelector from "@/components/InternalDocumentationTemplateSelector";
import InternalDocumentTitleField from "@/components/InternalDocumentTitleField";
import {
  appendInternalBlockPlacements,
  compactInternalBlockPlacements,
  normalizeInternalBlockPlacements,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";
import { resolveInternalDocumentTitle, type InternalDocumentTitleOption } from "@/lib/questionnaire/internalDocumentTitle";
import type { PracticeDocumentationBlockSummary } from "@/lib/practice/documentationBlocks";
import type { PracticeDocumentationTemplate } from "@/lib/practice/documentationTemplates";

export default function InternalDocumentationLauncherForm({
  availableBlocks = [],
  practiceTemplates = [],
  endpoint,
  patientReferenceHint,
  submitLabel = "Dokumentation starten",
}: {
  availableBlocks?: PracticeDocumentationBlockSummary[];
  practiceTemplates?: PracticeDocumentationTemplate[];
  endpoint: string;
  patientReferenceHint?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [patientReference, setPatientReference] = useState("");
  const [outputFormat, setOutputFormat] = useState<"informell" | "formell">("informell");
  const [documentTitleOption, setDocumentTitleOption] = useState<InternalDocumentTitleOption | "">("");
  const [customDocumentTitle, setCustomDocumentTitle] = useState("");
  const [blockLayout, setBlockLayout] = useState<InternalBlockPlacement[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(template: PracticeDocumentationTemplate | null) {
    if (!template) {
      setBlockLayout([]);
      return;
    }
    setBlockLayout(template.blockLayout.map((placement) => ({ ...placement })));
    setOutputFormat(template.outputFormat);
    setDocumentTitleOption(template.documentTitleOption as InternalDocumentTitleOption);
    setCustomDocumentTitle("");
  }

  function toggleBlock(blockId: string) {
    if (blockLayout.some((placement) => placement.blockId === blockId)) {
      setBlockLayout(compactInternalBlockPlacements(blockLayout.filter((placement) => placement.blockId !== blockId)));
    } else {
      setBlockLayout(appendInternalBlockPlacements(blockLayout, [blockId]));
    }
  }

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (!patientReference.trim()) {
      setError("Bitte Patientenreferenz angeben.");
      return;
    }
    if (!documentTitleOption) {
      setError("Bitte Dokumenttitel angeben.");
      return;
    }
    try {
      resolveInternalDocumentTitle(documentTitleOption, customDocumentTitle);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bitte Dokumenttitel angeben.");
      return;
    }
    if (blockLayout.length === 0) {
      setError("Bitte mindestens einen Dokumentationsbaustein auswählen.");
      return;
    }
    let normalizedLayout: InternalBlockPlacement[];
    try {
      normalizedLayout = normalizeInternalBlockPlacements(blockLayout.map(({ blockId }) => blockId), blockLayout);
    } catch {
      setError("Dokumentationsbausteine konnten nicht verarbeitet werden.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBlockIds: normalizedLayout.map(({ blockId }) => blockId),
          blockLayout: normalizedLayout,
          patientReference: patientReference.trim(),
          outputFormat,
          documentTitleOption,
          ...(documentTitleOption === "andere" ? { customDocumentTitle } : {}),
        }),
      });
      const data = await response.json() as { link?: string; error?: string };
      if (!response.ok || !data.link) {
        setError(data.error ?? "Dokumentation konnte nicht gestartet werden.");
        return;
      }
      router.push(new URL(data.link).pathname);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={start} style={{ display: "grid", gap: "0.75rem", maxWidth: "32rem", width: "100%" }}>
      <label>Patientenreferenz<input autoFocus required autoComplete="off" value={patientReference} onChange={(event) => setPatientReference(event.target.value)} disabled={saving} style={{ marginTop: "0.5rem" }} /></label>
      {patientReferenceHint ? <p className="text-muted text-small" style={{ margin: 0 }}>{patientReferenceHint}</p> : null}
      <label>Ausgabeform<select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as "informell" | "formell")} disabled={saving}>
        <option value="informell">Informell</option><option value="formell">Formell</option>
      </select></label>
      <InternalDocumentTitleField option={documentTitleOption} customTitle={customDocumentTitle} onOptionChange={setDocumentTitleOption} onCustomTitleChange={setCustomDocumentTitle} disabled={saving} />
      <InternalDocumentationTemplateSelector practiceTemplates={practiceTemplates} onSelect={applyTemplate} disabled={saving} />
      <InternalDocumentationLauncherBlocks availableBlocks={availableBlocks} blockLayout={blockLayout} onToggleBlock={toggleBlock} onBlockLayoutChange={setBlockLayout} disabled={saving} />
      {error && <p className="text-error" role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? "Wird gestartet…" : submitLabel}</button>
    </form>
  );
}
