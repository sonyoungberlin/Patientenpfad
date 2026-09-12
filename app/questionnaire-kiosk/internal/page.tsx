"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InternalDocumentationBlockSelector from "@/components/InternalDocumentationBlockSelector";
import InternalDocumentTitleField from "@/components/InternalDocumentTitleField";
import { INTERNAL_BLOCK_UI_ORDER } from "@/lib/questionnaire/internalBlockPresentation";
import { reconcileInternalBlockPlacements, type InternalBlockPlacement } from "@/lib/questionnaire/internalBlockLayout";
import { resolveInternalDocumentTitle, type InternalDocumentTitleOption } from "@/lib/questionnaire/internalDocumentTitle";

export default function InternalDocumentationStartPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [documentTitleOption, setDocumentTitleOption] = useState<InternalDocumentTitleOption | "">("");
  const [customDocumentTitle, setCustomDocumentTitle] = useState("");
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [blockLayout, setBlockLayout] = useState<InternalBlockPlacement[]>([]);
  const [layoutManuallyArranged, setLayoutManuallyArranged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (selectedBlockIds.size === 0) {
      setError("Bitte mindestens einen Abschnitt auswählen.");
      return;
    }
    try {
      resolveInternalDocumentTitle(documentTitleOption, customDocumentTitle);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bitte einen gültigen Dokumenttitel auswählen.");
      return;
    }
    setSaving(true); setError(null);
    const response = await fetch("/api/questionnaire-kiosk/internal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedBlockIds: Array.from(selectedBlockIds), blockLayout, patientReference: reference.trim(), documentTitleOption, ...(documentTitleOption === "andere" ? { customDocumentTitle } : {}) }) });
    const data = await response.json() as { link?: string; error?: string };
    if (!response.ok || !data.link) { setError(data.error ?? "Dokumentation konnte nicht gestartet werden."); setSaving(false); return; }
    router.push(new URL(data.link).pathname);
  }
  function toggleBlock(blockId: string) {
    const next = new Set(selectedBlockIds);
    const select = !next.has(blockId);
    if (select) next.add(blockId);
    else next.delete(blockId);
    setSelectedBlockIds(next);
    setBlockLayout(reconcileInternalBlockPlacements(blockLayout, next, INTERNAL_BLOCK_UI_ORDER, layoutManuallyArranged));
  }
  function toggleGroup(blockIds: string[]) {
    const next = new Set(selectedBlockIds);
    const select = blockIds.some((blockId) => !next.has(blockId));
    for (const blockId of blockIds) {
      if (select) next.add(blockId);
      else next.delete(blockId);
    }
    setSelectedBlockIds(next);
    setBlockLayout(reconcileInternalBlockPlacements(blockLayout, next, INTERNAL_BLOCK_UI_ORDER, layoutManuallyArranged));
  }
  return <main><h1>Interne Dokumentation</h1><form onSubmit={start} style={{ display: "grid", gap: "0.75rem", maxWidth: "48rem", width: "100%" }}><label>Patientenreferenz<input autoFocus required value={reference} onChange={(event) => setReference(event.target.value)} disabled={saving} /></label><InternalDocumentTitleField option={documentTitleOption} customTitle={customDocumentTitle} onOptionChange={setDocumentTitleOption} onCustomTitleChange={setCustomDocumentTitle} disabled={saving} /><InternalDocumentationBlockSelector selectedBlockIds={selectedBlockIds} onToggleBlock={toggleBlock} onToggleGroup={toggleGroup} blockLayout={blockLayout} onBlockLayoutChange={(layout) => { setLayoutManuallyArranged(true); setBlockLayout(layout); }} disabled={saving} />{error && <p className="text-error" role="alert">{error}</p>}<button type="submit" disabled={saving || selectedBlockIds.size === 0 || !reference.trim() || !documentTitleOption || (documentTitleOption === "andere" && !customDocumentTitle.trim())}>{saving ? "Wird gestartet…" : "Dokumentation starten"}</button></form></main>;
}