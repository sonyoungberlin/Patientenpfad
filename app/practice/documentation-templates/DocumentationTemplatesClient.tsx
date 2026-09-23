"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InternalDocumentationBlockOrganizer from "@/components/InternalDocumentationBlockOrganizer";
import {
  appendInternalBlockPlacements,
  compactInternalBlockPlacements,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";
import { INTERNAL_DOCUMENT_TITLE_OPTIONS } from "@/lib/questionnaire/internalDocumentTitle";

type PracticeTemplateRow = {
  id: string;
  name: string;
  isActive: boolean;
  blockLayout: unknown;
  outputFormat?: string | null;
  documentTitleOption?: string | null;
  patientSignatureRequired?: boolean;
};

type AvailableBlock = { id: string; title: string };

export default function DocumentationTemplatesClient({
  initialTemplates,
  availableBlocks,
}: {
  initialTemplates: PracticeTemplateRow[];
  availableBlocks: AvailableBlock[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [outputFormat, setOutputFormat] = useState<"informell" | "formell">("informell");
  const [documentTitleOption, setDocumentTitleOption] = useState("bericht");
  const [blockLayout, setBlockLayout] = useState<InternalBlockPlacement[]>([]);
  const [patientSignatureRequired, setPatientSignatureRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorFormRef = useRef<HTMLFormElement>(null);
  const blockLabels = Object.fromEntries(availableBlocks.map((block) => [block.id, block.title]));

  useEffect(() => {
    if (!editingId || !editorFormRef.current) return;
    editorFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstInput = editorFormRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="checkbox"]), textarea',
    );
    firstInput?.focus({ preventScroll: true });
  }, [editingId]);

  function reset() {
    setEditingId(null);
    setName("");
    setOutputFormat("informell");
    setDocumentTitleOption("bericht");
    setBlockLayout([]);
    setPatientSignatureRequired(false);
    setError(null);
  }

  function startEdit(template: PracticeTemplateRow) {
    setEditingId(template.id);
    setName(template.name);
    setOutputFormat(template.outputFormat === "formell" ? "formell" : "informell");
    setDocumentTitleOption(template.documentTitleOption ?? "bericht");
    setBlockLayout(Array.isArray(template.blockLayout)
      ? structuredClone(template.blockLayout) as InternalBlockPlacement[] : []);
    setPatientSignatureRequired(template.patientSignatureRequired === true);
    setError(null);
  }

  function toggleBlock(blockId: string) {
    if (blockLayout.some((item) => item.blockId === blockId)) {
      setBlockLayout(compactInternalBlockPlacements(blockLayout.filter((item) => item.blockId !== blockId)));
    } else {
      setBlockLayout(appendInternalBlockPlacements(blockLayout, [blockId]));
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch(
      editingId ? `/api/practice/documentation-templates/${editingId}` : "/api/practice/documentation-templates",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, outputFormat, documentTitleOption, blockLayout, patientSignatureRequired }),
      },
    );
    const result = await response.json() as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !result.ok) {
      setError(result.error ?? "Dokumentationsvorlage konnte nicht gespeichert werden.");
      return;
    }
    reset();
    router.refresh();
  }

  async function deactivate(id: string) {
    setBusy(true);
    const response = await fetch(`/api/practice/documentation-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    const result = await response.json() as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !result.ok) {
      setError(result.error ?? "Dokumentationsvorlage konnte nicht deaktiviert werden.");
      return;
    }
    if (editingId === id) reset();
    router.refresh();
  }

  async function duplicate(id: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/practice/documentation-templates/${id}`, { method: "POST" });
    const result = await response.json() as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !result.ok) {
      setError(result.error ?? "Dokumentationsvorlage konnte nicht dupliziert werden.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <section>
        <h2>Eigene Vorlagen</h2>
        {initialTemplates.length === 0 ? <p className="text-muted">Noch keine Vorlagen angelegt.</p> : (
          <table><thead><tr><th>Name</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>
            {initialTemplates.map((template) => <tr key={template.id}>
              <td>{template.name}</td><td>{template.isActive ? "Aktiv" : "Inaktiv"}</td>
              <td><div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" onClick={() => startEdit(template)} disabled={busy}>Bearbeiten</button>
                <button type="button" onClick={() => void duplicate(template.id)} disabled={busy}>Duplizieren</button>
                {template.isActive && <button type="button" onClick={() => void deactivate(template.id)} disabled={busy}>Deaktivieren</button>}
              </div></td>
            </tr>)}
          </tbody></table>
        )}
      </section>
      <form ref={editorFormRef} onSubmit={(event) => void save(event)} style={{ display: "grid", gap: "1rem" }}>
        <h2>{editingId ? "Vorlage bearbeiten" : "Vorlage anlegen"}</h2>
        <label>Vorlagenname<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required disabled={busy} /></label>
        <label>Ausgabeform<select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as "informell" | "formell")} disabled={busy}>
          <option value="informell">Informell</option><option value="formell">Formell</option>
        </select></label>
        <label style={{ display: "flex", gap: "0.5rem" }}><input type="checkbox" checked={patientSignatureRequired} onChange={(event) => setPatientSignatureRequired(event.target.checked)} disabled={busy} />Patientenunterschrift erforderlich</label>
        <label>Dokumenttitel<select value={documentTitleOption} onChange={(event) => setDocumentTitleOption(event.target.value)} disabled={busy}>
          {INTERNAL_DOCUMENT_TITLE_OPTIONS.filter((option) => option.value !== "andere").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <fieldset style={{ display: "grid", gap: "0.5rem" }}>
          <legend>Bausteine</legend>
          {availableBlocks.length === 0 ? <p className="text-muted">Bitte zuerst Bausteine in der Dokumentationsbibliothek anlegen.</p> : availableBlocks.map((block) => (
            <label key={block.id} style={{ display: "flex", gap: "0.5rem" }}>
              <input type="checkbox" checked={blockLayout.some((item) => item.blockId === block.id)} onChange={() => toggleBlock(block.id)} disabled={busy} />
              {block.title}
            </label>
          ))}
        </fieldset>
        {blockLayout.length > 0 && <InternalDocumentationBlockOrganizer placements={blockLayout} blockLabels={blockLabels} onChange={setBlockLayout} disabled={busy} />}
        {error && <p role="alert" className="text-error">{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" disabled={busy || !name.trim() || blockLayout.length === 0}>Speichern</button>
          {editingId && <button type="button" onClick={reset} disabled={busy}>Abbrechen</button>}
        </div>
      </form>
    </>
  );
}
