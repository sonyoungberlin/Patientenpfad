"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PracticeDocumentationBlockDefinition,
  PracticeDocumentationBlockType,
  PracticeDocumentationAdditionalFieldInput,
  PracticeDocumentationFieldOptionInput,
  PracticeDocumentationOptionInput,
  PracticeDocumentationSegmentInput,
} from "@/lib/practice/documentationBlocks";
import type { DocumentationSegment, RepeatableDocumentationSegment } from "@/lib/questionnaire/blockCatalog";

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
  sharedDocumentationText: string;
  options: PracticeDocumentationOptionInput[];
  additionalFields: PracticeDocumentationAdditionalFieldInput[];
};

const TYPE_LABELS: Record<PracticeDocumentationBlockType, string> = {
  text: "Text",
  paragraph: "Absatz",
  selection: "Auswahl",
  measurement: "Messwert",
  list: "Mehrfachauswahl",
  hint: "Hinweis",
  repeatable: "Wiederholbarer Baustein",
};

const emptyDraft = (): Draft => ({
  title: "",
  blockType: "text",
  text: "",
  unit: "",
  required: false,
  sharedDocumentationText: "",
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

function newFieldOption(): PracticeDocumentationFieldOptionInput {
  return { value: `option_${crypto.randomUUID()}`, label: "" };
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
    const rules = row.definition.block.conditionalRules ?? [];
    const fieldIdForQuestion = new Map(row.definition.questions.slice(1).map((candidate) => [candidate.id, candidate.id]));
    const mapDocumentationSegment = (segment: DocumentationSegment): PracticeDocumentationSegmentInput => {
      if (segment.kind === "text") return segment;
      if (segment.kind === "answerRef") return { kind: "answerRef", fieldId: fieldIdForQuestion.get(segment.questionId) ?? segment.questionId };
      return {
        kind: "conditional",
        fieldId: segment.questionId === question.id ? "__primary" : fieldIdForQuestion.get(segment.questionId) ?? segment.questionId,
        optionValue: segment.optionValue,
        segments: segment.segments.map(mapDocumentationSegment),
      };
    };
    const mapRepeatableDocumentationSegment = (segment: RepeatableDocumentationSegment): PracticeDocumentationSegmentInput => {
      if (segment.kind === "text") return segment;
      if (segment.kind === "fieldRef") return { kind: "answerRef", fieldId: segment.fieldKey };
      return {
        kind: "conditional",
        fieldId: segment.fieldKey,
        optionValue: segment.optionValue,
        segments: segment.segments.map(mapRepeatableDocumentationSegment),
      };
    };
    setEditingId(row.id);
    setDraft({
      title: row.title,
      blockType: row.definition.visibleType,
      text: question.documentationText ?? question.text,
      unit: question.unit ?? "",
      required: question.required,
      sharedDocumentationText: question.sharedDocumentationText ?? "",
      options: (question.options ?? []).map((option) => typeof option === "string"
        ? { label: option, documentationText: option }
        : { value: option.value, label: option.label, documentationText: option.documentationText ?? option.label, documentationSegments: option.documentationSegments?.map(mapDocumentationSegment) }),
      additionalFields: row.definition.visibleType === "repeatable"
        ? (question.groupSchema ?? []).map((field) => ({
          id: field.key,
          label: field.label,
          type: field.type,
          ...(field.options ? { options: field.options.filter((option): option is Exclude<typeof option, string> => typeof option !== "string").map((option) => ({ value: option.value, label: option.label })) } : {}),
          required: field.required,
          ...(field.conditionalOn ? { showForFieldId: field.conditionalOn } : {}),
          showForOptionValues: field.conditionalValues ?? (field.conditionalValue ? [field.conditionalValue] : []),
          ...(field.maxLength ? { maxLength: field.maxLength } : {}),
          ...(field.documentationText ? { documentationText: field.documentationText } : {}),
          ...(field.documentationSegments ? { documentationSegments: field.documentationSegments.map(mapRepeatableDocumentationSegment) } : {}),
        }))
        : row.definition.questions.slice(1).map((fieldQuestion) => {
        const rule = rules.find((candidate) => candidate.action === "showQuestion" && candidate.targetId === fieldQuestion.id && !("mode" in candidate.condition) && candidate.condition.target.kind === "question");
        const sourceQuestionId = rule && !("mode" in rule.condition) && rule.condition.target.kind === "question" ? rule.condition.target.questionId : question.id;
        return {
          id: fieldQuestion.id,
          label: fieldQuestion.text,
          type: fieldQuestion.type === "date" || fieldQuestion.type === "time" || fieldQuestion.type === "number" || fieldQuestion.type === "textarea" || fieldQuestion.type === "select" || fieldQuestion.type === "multi_select" ? fieldQuestion.type : "text",
          ...(fieldQuestion.type === "select" ? { options: (fieldQuestion.options ?? []).filter((option): option is Exclude<typeof option, string> => typeof option !== "string").map((option) => ({ value: option.value, label: option.label })) } : {}),
          required: fieldQuestion.required,
          showForOptionValues: rules.filter((candidate) => candidate.action === "showQuestion" && candidate.targetId === fieldQuestion.id && !("mode" in candidate.condition) && candidate.condition.target.kind === "question" && candidate.condition.target.questionId === sourceQuestionId && typeof candidate.condition.value === "string").map((candidate) => !("mode" in candidate.condition) ? String(candidate.condition.value) : ""),
          ...(sourceQuestionId !== question.id ? { showForFieldId: sourceQuestionId } : {}),
          ...(fieldQuestion.maxLength ? { maxLength: fieldQuestion.maxLength } : {}),
          ...(fieldQuestion.unit ? { unit: fieldQuestion.unit } : {}),
        };
      }),
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

  function updateConditionalSegment(optionIndex: number, segmentIndex: number, nestedIndex: number, update: Partial<PracticeDocumentationSegmentInput>) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, index) => {
        if (index !== optionIndex) return option;
        const segments = option.documentationSegments ?? [];
        return { ...option, documentationSegments: segments.map((segment, currentIndex) => currentIndex === segmentIndex && segment.kind === "conditional" ? { ...segment, segments: segment.segments.map((nested, currentNestedIndex) => currentNestedIndex === nestedIndex ? { ...nested, ...update } as PracticeDocumentationSegmentInput : nested) } : segment) };
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
        {(draft.blockType === "text" || draft.blockType === "paragraph" || draft.blockType === "hint") && (
          <label>{draft.blockType === "hint" ? "Hinweistext" : draft.blockType === "paragraph" ? "Inhalt" : "Feldbezeichnung"}<textarea value={draft.text} onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))} rows={draft.blockType === "paragraph" ? 10 : 4} required disabled={busy} /></label>
        )}
        {draft.blockType === "measurement" && (
          <label>Einheit<input value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} maxLength={40} disabled={busy} /></label>
        )}
        {(draft.blockType === "selection" || draft.blockType === "list") && (
          <fieldset style={{ display: "grid", gap: "0.75rem" }}>
            <legend>Optionen</legend>
            {draft.blockType === "list" && <label>Gemeinsamer Ausgabetext<textarea value={draft.sharedDocumentationText} onChange={(event) => setDraft((current) => ({ ...current, sharedDocumentationText: event.target.value }))} rows={3} disabled={busy} /></label>}
            {draft.options.map((option, index) => <div key={option.value ?? `new-${index}`} style={{ display: "grid", gap: "0.4rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}>
              <label>Option {index + 1}<input value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} required disabled={busy} /></label>
              <label>Ausgabetext<textarea value={option.documentationText} onChange={(event) => updateOption(index, { documentationText: event.target.value })} rows={3} required={(option.documentationSegments?.length ?? 0) === 0} disabled={busy} /></label>
              <fieldset>
                <legend>Zusammengesetzter Ausgabetext (optional)</legend>
                {(option.documentationSegments ?? []).map((segment, segmentIndex) => <div key={`${index}-${segmentIndex}`} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <select value={segment.kind} onChange={(event) => updateOptionSegment(index, segmentIndex, event.target.value === "text" ? { kind: "text", text: "" } : { kind: "answerRef", fieldId: draft.additionalFields[0]?.id ?? "" })} disabled={busy}>
                    <option value="text">Fester Text</option>
                    <option value="answerRef">Zusatzangabe</option>
                    <option value="conditional">Bedingte Variante</option>
                  </select>
                  {segment.kind === "text" ? <input value={segment.text} onChange={(event) => updateOptionSegment(index, segmentIndex, { text: event.target.value })} disabled={busy} /> : segment.kind === "answerRef" ? <select value={segment.fieldId} onChange={(event) => updateOptionSegment(index, segmentIndex, { fieldId: event.target.value })} disabled={busy}><option value="">Zusatzangabe wählen</option>{draft.additionalFields.map((field) => <option key={field.id} value={field.id}>{field.label || "Unbenannte Zusatzangabe"}</option>)}</select> : <>
                    <select value={segment.fieldId} onChange={(event) => updateOptionSegment(index, segmentIndex, { fieldId: event.target.value })} disabled={busy}>
                      <option value="__primary">Primäre Auswahl</option>
                      {draft.additionalFields.map((field) => <option key={field.id} value={field.id}>{field.label || "Unbenannte Zusatzangabe"}</option>)}
                    </select>
                    <select value={segment.optionValue} onChange={(event) => updateOptionSegment(index, segmentIndex, { optionValue: event.target.value })} disabled={busy}>
                      {(segment.fieldId === "__primary" ? draft.options : draft.additionalFields.find((field) => field.id === segment.fieldId)?.options ?? []).map((choice) => <option key={typeof choice === "string" ? choice : choice.value} value={typeof choice === "string" ? choice : choice.value}>{typeof choice === "string" ? choice : choice.label}</option>)}
                    </select>
                    <span>Variante:</span>
                    {segment.segments.map((nested, nestedIndex) => <span key={nestedIndex} style={{ display: "inline-flex", gap: "0.25rem" }}><select value={nested.kind} onChange={(event) => updateConditionalSegment(index, segmentIndex, nestedIndex, event.target.value === "text" ? { kind: "text", text: "" } : { kind: "answerRef", fieldId: draft.additionalFields[0]?.id ?? "" })} disabled={busy}><option value="text">Fester Text</option><option value="answerRef">Zusatzangabe</option></select>{nested.kind === "text" ? <input value={nested.text} onChange={(event) => updateConditionalSegment(index, segmentIndex, nestedIndex, { text: event.target.value })} disabled={busy} /> : <select value={nested.fieldId} onChange={(event) => updateConditionalSegment(index, segmentIndex, nestedIndex, { fieldId: event.target.value })} disabled={busy}><option value="">Zusatzangabe wählen</option>{draft.additionalFields.map((field) => <option key={field.id} value={field.id}>{field.label || "Unbenannte Zusatzangabe"}</option>)}</select>}<button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, documentationSegments: (candidate.documentationSegments ?? []).map((entry, entryIndex) => entryIndex === segmentIndex && entry.kind === "conditional" ? { ...entry, segments: entry.segments.filter((_, currentNestedIndex) => currentNestedIndex !== nestedIndex) } : entry) } : candidate) }))} disabled={busy}>Entfernen</button></span>)}
                    <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, documentationSegments: (candidate.documentationSegments ?? []).map((entry, entryIndex) => entryIndex === segmentIndex && entry.kind === "conditional" ? { ...entry, segments: [...entry.segments, { kind: "text", text: "" }] } : entry) } : candidate) }))} disabled={busy}>Variantensegment hinzufügen</button>
                  </>}
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, documentationSegments: (candidate.documentationSegments ?? []).filter((_, currentIndex) => currentIndex !== segmentIndex) } : candidate) }))} disabled={busy}>Entfernen</button>
                </div>)}
                <button type="button" onClick={() => updateOption(index, { documentationSegments: [...(option.documentationSegments ?? []), { kind: "text", text: "" }] })} disabled={busy}>Segment hinzufügen</button>
                <button type="button" onClick={() => updateOption(index, { documentationSegments: [...(option.documentationSegments ?? []), { kind: "conditional", fieldId: "__primary", optionValue: draft.options[0]?.value ?? draft.options[0]?.label ?? "", segments: [{ kind: "text", text: "" }] }] })} disabled={busy}>Bedingte Variante hinzufügen</button>
              </fieldset>
              {draft.options.length > 1 && <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.filter((_, optionIndex) => optionIndex !== index) }))} disabled={busy}>Option entfernen</button>}
            </div>)}
            <button type="button" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, { label: "", documentationText: "" }] }))} disabled={busy}>Option hinzufügen</button>
          </fieldset>
        )}
        {(draft.blockType === "selection" || draft.blockType === "list" || draft.blockType === "repeatable") && <fieldset style={{ display: "grid", gap: "0.75rem" }}>
          <legend>Optionale Zusatzangaben</legend>
          {draft.additionalFields.map((field, index) => <div key={field.id} style={{ display: "grid", gap: "0.4rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}>
            <label>Feldbezeichnung<input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} required disabled={busy} /></label>
            {draft.blockType === "repeatable" && <label>Instanz-Ausgabetext (optional)<textarea value={field.documentationText ?? ""} onChange={(event) => updateField(index, { documentationText: event.target.value })} rows={2} disabled={busy} /></label>}
            <label>Feldtyp<select value={field.type} onChange={(event) => updateField(index, { type: event.target.value as PracticeDocumentationAdditionalFieldInput["type"], options: event.target.value === "select" || event.target.value === "multi_select" ? (field.options ?? [newFieldOption()]) : undefined })} disabled={busy}><option value="text">Kurzer Text</option><option value="textarea">Längerer Text</option><option value="date">Datum</option><option value="time">Uhrzeit</option><option value="number">Zahl</option><option value="select">Auswahl</option><option value="multi_select">Mehrfachauswahl</option><option value="yes_no">Ja/Nein</option><option value="checkbox">Kontrollfeld</option></select></label>
            {(field.type === "select" || field.type === "multi_select") && <fieldset><legend>Auswahloptionen</legend>{(field.options ?? []).map((choice, choiceIndex) => <div key={choice.value} style={{ display: "flex", gap: "0.4rem" }}><input value={choice.label} placeholder="Bezeichnung" onChange={(event) => updateField(index, { options: (field.options ?? []).map((candidate, currentIndex) => currentIndex === choiceIndex ? { ...candidate, label: event.target.value } : candidate) })} disabled={busy} /><input value={choice.value} placeholder="Wert" onChange={(event) => updateField(index, { options: (field.options ?? []).map((candidate, currentIndex) => currentIndex === choiceIndex ? { ...candidate, value: event.target.value } : candidate) })} disabled={busy} /></div>)}<button type="button" onClick={() => updateField(index, { options: [...(field.options ?? []), newFieldOption()] })} disabled={busy}>Auswahloption hinzufügen</button></fieldset>}
            <fieldset><legend>Anzeigen wenn</legend><select value={field.showForFieldId ?? "__primary"} onChange={(event) => updateField(index, { showForFieldId: event.target.value === "__primary" ? undefined : event.target.value, showForOptionValues: [] })} disabled={busy}><option value="__primary">Primäre Auswahl</option>{draft.additionalFields.slice(0, index).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label || "Unbenannte Zusatzangabe"}</option>)}</select>{(field.showForFieldId ? draft.additionalFields.find((candidate) => candidate.id === field.showForFieldId)?.options ?? [] : draft.options).map((option) => { const value = typeof option === "string" ? option : (option.value ?? option.label); const label = typeof option === "string" ? option : option.label; const selectedValues = field.showForOptionValues ?? []; return <label key={value} style={{ display: "block" }}><input type="checkbox" checked={selectedValues.includes(value)} onChange={(event) => updateField(index, { showForOptionValues: event.target.checked ? [...selectedValues, value] : selectedValues.filter((candidate) => candidate !== value) })} disabled={busy} /> {label || "Unbenannte Option"}</label>; })}</fieldset>
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
