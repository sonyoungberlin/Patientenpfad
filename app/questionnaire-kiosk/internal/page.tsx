"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InternalDocumentationBlockSelector from "@/components/InternalDocumentationBlockSelector";

export default function InternalDocumentationStartPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (selectedBlockIds.size === 0) {
      setError("Bitte mindestens einen Abschnitt auswählen.");
      return;
    }
    setSaving(true); setError(null);
    const response = await fetch("/api/questionnaire-kiosk/internal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedBlockIds: Array.from(selectedBlockIds), patientReference: reference.trim() }) });
    const data = await response.json() as { link?: string; error?: string };
    if (!response.ok || !data.link) { setError(data.error ?? "Dokumentation konnte nicht gestartet werden."); setSaving(false); return; }
    router.push(new URL(data.link).pathname);
  }
  function toggleBlock(blockId: string) {
    setSelectedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }
  function toggleGroup(blockIds: string[]) {
    setSelectedBlockIds((current) => {
      const next = new Set(current);
      const select = blockIds.some((blockId) => !next.has(blockId));
      for (const blockId of blockIds) {
        if (select) next.add(blockId);
        else next.delete(blockId);
      }
      return next;
    });
  }
  return <main><h1>Interne Dokumentation</h1><form onSubmit={start} style={{ display: "grid", gap: "0.75rem", maxWidth: "32rem", width: "100%" }}><InternalDocumentationBlockSelector selectedBlockIds={selectedBlockIds} onToggleBlock={toggleBlock} onToggleGroup={toggleGroup} disabled={saving} /><label>Patientenreferenz<input autoFocus required value={reference} onChange={(event) => setReference(event.target.value)} disabled={saving} /></label>{error && <p className="text-error" role="alert">{error}</p>}<button type="submit" disabled={saving || selectedBlockIds.size === 0 || !reference.trim()}>{saving ? "Wird gestartet…" : "Dokumentation starten"}</button></form></main>;
}