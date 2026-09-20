"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PracticeDocumentationBlockDefinition,
  PracticeDocumentationBlockType,
  PracticeDocumentationAdditionalFieldInput,
  PracticeDocumentationOptionInput,
  PracticeDocumentationSegmentInput,
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
  additionalFields: PracticeDocumentationAdditionalFieldInput[];
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
  additionalFields: [],
});

function newAdditionalField(): PracticeDocumentationAdditionalFieldInput {
  return {
    id: `field_${crypto.randomUUID()}`,
    label: "",
    type: "text",
    required: false,
    showForOptionValues: [],
  };
}

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
        : { value: option.value, label: option.label, documentationText: option.documentationText ?? option.label, documentationSegments: option.documentationSegments?.map((segment) => segment.kind === "text" ? segment : { kind: "answerRef", fieldId: row.definition.questions.find((candidate) => candidate.id === segment.questionId)?.id ?? segment.questionId }) }),
      additionalFields: row.definition.questions.slice(1).map((question) => ({
        id: question.id,
        label: question.text,
        type: question.type === "date" || question.type === "number" || question.type === "textarea" ? question.type : "text",
        required: question.required,
        showForOptionValues: (row.definition.block.conditionalRules ?? [])
          .filter((rule) => {
            const condition = rule.condition;
            return rule.action === "showQuestion" && rule.targetId === question.id &&
              !("mode" in condition) && condition.target.kind === "question" &&
              condition.target.questionId === row.definition.questions[0].id &&
              condition.operator === "equals" && typeof condition.value === "string";
          })
          .map((rule) => !("mode" in rule.condition) ? rule.condition.value as string : ""),
        ...(question.maxLength ? { maxLength: question.maxLength } : {}),
        ...(question.unit ? { unit: question.unit } : {}),
      })),
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

  function updateField(index: number, update: Partial<PracticeDocumentationAdditionalFieldInput>) {
    setDraft((current) => ({
      ...current,
      additionalFields: current.additionalFields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...update } : field),
    }));
  }

  function updateOptionSegment(optionIndex: number, segmentIndex: number, update: Partial<PracticeDocumentationSegmentInput>) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, index) => {
        if (index !== optionIndex) return option;
        const segments = option.documentationSegments ?? [];
        return { ...option, documentationSegments: segments.map((segment, currentIndex) => currentIndex === segmentIndex ? { ...segment, ...update } as PracticeDocumentationSegmentInput : segment) };
      }),
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
              <fieldset>
                <legend>Zusammengesetzter Ausgabetext (optional)</legend>
                {(option.documentationSegments ?? []).map((segment, segmentIndex) => <div key={`${index}-${segmentIndex}`} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <select value={segment.kind} onChange={(event) => updateOptionSegment(index, segmentIndex, event.target.value === "text" ? { kind: "text", text: "" } : { kind: "answerRef", fieldId: draft.additionalFields[0]?.id ?? "" })} disabled={busy}>
                    <option value="text">Fester Text</option>
                    <option value="answerRef">Zusatzangabe</option>
                  </select>
                  {segment.kind === "text" ? <input value={segment.text} onChange={(event) => updateOptionSegment(index, segmentIndex, { text: event.target.value })} disabled={busy} /> : <select value={segment.fieldId} onChange={(event) => updateOptionSegment(index, segmentIndex, { fieldId: event.target.value })} disabled={busy}><option value="">Zusatzangabe wählen</option>{draft.additionalFields.map((field) => <option key={field.id} value={field.id}>{field.label || "Unbenannte Zusatzangabe"}</option>)}</select>}
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, documentationSegments: (candidate.documentationSegments ?? []).filter((_, currentIndex) => currentIndex !== segmentIndex) } : candidate) }))} disabled={busy}>Entfernen</button>
                </div>)}
                <button type="button" onClick={() => updateOption(index, { documentationSegments: [...(option.documentationSegments ?? []), { kind: "text", text: "" }] })} disabled={busy}>Segment hinzufügen</button>
              </fieldset>
              {draft.options.length > 2 && <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.filter((_, optionIndex) => optionIndex !== index) }))} disabled={busy}>Option entfernen</button>}
            </div>)}
            <button type="button" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, { label: "", documentationText: "" }] }))} disabled={busy}>Option hinzufügen</button>
          </fieldset>
        )}
        {(draft.blockType === "selection" || draft.blockType === "list") && <fieldset style={{ display: "grid", gap: "0.75rem" }}>
          <legend>Optionale Zusatzangaben</legend>
          {draft.additionalFields.map((field, index) => <div key={field.id} style={{ display: "grid", gap: "0.4rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}>
            <label>Feldbezeichnung<input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} required disabled={busy} /></label>
            <label>Feldtyp<select value={field.type} onChange={(event) => updateField(index, { type: event.target.value as PracticeDocumentationAdditionalFieldInput["type"] })} disabled={busy}><option value="text">Kurzer Text oder Monat/Jahr</option><option value="textarea">Längerer Text</option><option value="date">Datum</option><option value="number">Zahl</option></select></label>
            <fieldset><legend>Anzeigen bei Auswahl</legend>{draft.options.map((option) => { const value = option.value ?? option.label; return <label key={value} style={{ display: "block" }}><input type="checkbox" checked={field.showForOptionValues.includes(value)} onChange={(event) => updateField(index, { showForOptionValues: event.target.checked ? [...field.showForOptionValues, value] : field.showForOptionValues.filter((candidate) => candidate !== value) })} disabled={busy} /> {option.label || "Unbenannte Option"}</label>; })}</fieldset>
            <label style={{ display: "flex", gap: "0.5rem" }}><input type="checkbox" checked={field.required === true} onChange={(event) => updateField(index, { required: event.target.checked })} disabled={busy} />Pflichtangabe, wenn sichtbar</label>
            <button type="button" onClick={() => setDraft((current) => ({ ...current, additionalFields: current.additionalFields.filter((_, fieldIndex) => fieldIndex !== index) }))} disabled={busy}>Zusatzangabe entfernen</button>
          </div>)}
          <button type="button" onClick={() => setDraft((current) => ({ ...current, additionalFields: [...current.additionalFields, newAdditionalField()] }))} disabled={busy}>Zusatzangabe hinzufügen</button>
        </fieldset>}
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
