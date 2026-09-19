"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PracticeDocumentationBlockDefinition,
  PracticeDocumentationBlockType,
  PracticeDocumentationOptionInput,
} from "@/lib/practice/documentationBlocks";

type BlockRow = {
  id: string;
  title: string;
  definition: PracticeDocumentationBlockDefinition;
  isActive: boolean;
};

type Draft = {
  title: string;
  blockType: PracticeDocumentationBlockType;
  text: string;
  unit: string;
  required: boolean;
  options: PracticeDocumentationOptionInput[];
};

const TYPE_LABELS: Record<PracticeDocumentationBlockType, string> = {
  text: "Text",
  selection: "Auswahl",
  measurement: "Messwert",
  list: "Aufzählung",
  hint: "Hinweis",
};

const emptyDraft = (): Draft => ({
  title: "",
  blockType: "text",
  text: "",
  unit: "",
  required: false,
  options: [
    { label: "", documentationText: "" },
    { label: "", documentationText: "" },
  ],
});

export default function DocumentationLibraryClient({ initialBlocks }: { initialBlocks: BlockRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditingId(null);
    setDraft(emptyDraft());
    setError(null);
  }

  function startEdit(row: BlockRow) {
    const question = row.definition.questions[0];
    setEditingId(row.id);
    setDraft({
      title: row.title,
      blockType: row.definition.visibleType,
      text: question.text,
      unit: question.unit ?? "",
      required: question.required,
      options: (question.options ?? []).map((option) => typeof option === "string"
        ? { label: option, documentationText: option }
        : { value: option.value, label: option.label, documentationText: option.documentationText ?? option.label }),
    });
    setError(null);
  }

  function changeType(blockType: PracticeDocumentationBlockType) {
    setDraft((current) => ({ ...emptyDraft(), title: current.title, blockType, required: blockType === "hint" }));
  }

  function updateOption(index: number, update: Partial<PracticeDocumentationOptionInput>) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => optionIndex === index ? { ...option, ...update } : option),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch(
      editingId ? `/api/practice/documentation-library/${editingId}` : "/api/practice/documentation-library",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    const result = await response.json() as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !result.ok) {
      setError(result.error ?? "Dokumentationsbaustein konnte nicht gespeichert werden.");
      return;
    }
    reset();
    router.refresh();
  }

  async function deactivate(id: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/practice/documentation-library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    const result = await response.json() as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !result.ok) {
      setError(result.error ?? "Dokumentationsbaustein konnte nicht deaktiviert werden.");
      return;
    }
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <>
      <section>
        <h2>Bausteine</h2>
        {initialBlocks.length === 0 ? <p className="text-muted">Noch keine Bausteine angelegt.</p> : (
          <table><thead><tr><th>Titel</th><th>Art</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>
            {initialBlocks.map((block) => <tr key={block.id}>
              <td>{block.title}</td>
              <td>{TYPE_LABELS[block.definition.visibleType]}</td>
              <td>{block.isActive ? "Aktiv" : "Inaktiv"}</td>
              <td><div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => startEdit(block)} disabled={busy}>Bearbeiten</button>
                {block.isActive && <button type="button" onClick={() => void deactivate(block.id)} disabled={busy}>Deaktivieren</button>}
              </div></td>
            </tr>)}
          </tbody></table>
        )}
      </section>

      <form onSubmit={(event) => void save(event)} style={{ display: "grid", gap: "0.75rem" }}>
        <h2>{editingId ? "Baustein bearbeiten" : "Baustein anlegen"}</h2>
        <label>Bausteinart<select value={draft.blockType} onChange={(event) => changeType(event.target.value as PracticeDocumentationBlockType)} disabled={busy || Boolean(editingId)}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Titel<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={120} required disabled={busy} /></label>
        {(draft.blockType === "text" || draft.blockType === "hint") && (
          <label>{draft.blockType === "hint" ? "Hinweistext" : "Feldbezeichnung"}<textarea value={draft.text} onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))} rows={4} required disabled={busy} /></label>
        )}
        {draft.blockType === "measurement" && (
          <label>Einheit<input value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} maxLength={40} disabled={busy} /></label>
        )}
        {(draft.blockType === "selection" || draft.blockType === "list") && (
          <fieldset style={{ display: "grid", gap: "0.75rem" }}>
            <legend>Optionen</legend>
            {draft.options.map((option, index) => <div key={option.value ?? `new-${index}`} style={{ display: "grid", gap: "0.4rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}>
              <label>Option {index + 1}<input value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} required disabled={busy} /></label>
              <label>Ausgabetext<textarea value={option.documentationText} onChange={(event) => updateOption(index, { documentationText: event.target.value })} rows={3} required disabled={busy} /></label>
              {draft.options.length > 2 && <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.filter((_, optionIndex) => optionIndex !== index) }))} disabled={busy}>Option entfernen</button>}
            </div>)}
            <button type="button" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, { label: "", documentationText: "" }] }))} disabled={busy}>Option hinzufügen</button>
          </fieldset>
        )}
        {draft.blockType !== "hint" && <label style={{ display: "flex", gap: "0.5rem" }}><input type="checkbox" checked={draft.required} onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))} disabled={busy} />Pflichtfeld</label>}
        {error && <p role="alert" className="text-error">{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" disabled={busy || !draft.title.trim()}>Speichern</button>
          {editingId && <button type="button" onClick={reset} disabled={busy}>Abbrechen</button>}
        </div>
      </form>
    </>
  );
}
