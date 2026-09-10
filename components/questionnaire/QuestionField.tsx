"use client";

/**
 * Gemeinsame Render-Primitive für Fragebogen-Fragen.
 *
 * Exportiert von beiden Questionnaire-Flows genutzte Bausteine:
 *   - QuestionField      (alle Fragetypen inkl. repeatable_group)
 *   - collectConditionQuestionIds (Gate-Fragen ermitteln)
 *
 * Enthält bewusst KEINE Conditional-Logic-Engine – diese bleibt in
 * conditionalLogic.ts. Nur Render-Komponenten und deren Hilfsdaten.
 */

import { useState } from "react";
import type {
  QuestionDefinition,
  QuestionType,
  RepeatableGroupFieldDef,
} from "@/lib/questionnaire/blockCatalog";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import { ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN } from "@/lib/questionnaire/validateAnswerCharacters";
import type { ConditionGroup } from "@/lib/questionnaire/conditionalLogic";
import { parseMultiSelectValue, toggleMultiSelectValue } from "@/lib/questionnaire/multiSelect";
import { getQuestionOptionLabel, getQuestionOptionValue } from "@/lib/questionnaire/questionOptions";

// ---------------------------------------------------------------------------
// Hilfsfunktion
// ---------------------------------------------------------------------------

export function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function TextLengthCounter({ value, maxLength }: { value: string; maxLength?: number }) {
  if (maxLength === undefined) return null;
  return (
    <span
      data-text-length-counter
      style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--muted-foreground, #6b7280)", textAlign: "right" }}
    >
      {value.length} / {maxLength}
    </span>
  );
}

export function limitTextLength(value: string, maxLength?: number): string {
  return maxLength === undefined ? value : value.slice(0, maxLength);
}

function answerChoiceStyle(selected: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: "0.25rem 0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: selected ? "var(--primary, #2563eb)" : "var(--background)",
    color: selected ? "#fff" : "var(--foreground)",
    fontWeight: selected ? 600 : 400,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontSize: "0.9rem",
  };
}

/** Alle questionIds, die als Bedingungsziel in einer ConditionGroup auftreten. */
export function collectConditionQuestionIds(condition: ConditionGroup): Set<string> {
  const ids = new Set<string>();
  if ("mode" in condition) {
    for (const c of condition.conditions) {
      for (const id of collectConditionQuestionIds(c)) ids.add(id);
    }
  } else if (condition.target.kind === "question") {
    ids.add(condition.target.questionId);
  }
  return ids;
}

/**
 * Echte Haupt-Pfadfragen, die Gate-Styling erhalten.
 * Explizit pflegen statt automatisch aus conditionalRules ableiten,
 * damit reine Detail-Folge-Fragen (z.B. VOLLST_GENDER → Freitext) nicht
 * fälschlich hervorgehoben werden.
 */
export const MAIN_GATE_QUESTION_IDS: ReadonlySet<string> = new Set([
  "ANAMNESE_GP",
  "ANAMNESE_CHRONIC_GATE",
  "ANAMNESE_ALLERGIES_GATE",
  "ANAMNESE_MEDICATIONS_GATE",
  "VOLLST_ERKR_GATE",
  "VOLLST_ALLERG_GATE",
  "VOLLST_INFEKT_GATE",
  "VOLLST_FAMIL_GATE",
  "VOLLST_IMPF_BEKANNT",
  "VOLLST_VERS_PFLEGEGRAD",
  "VOLLST_VERS_GDB",
  "VOLLST_VERS_PROTHESEN",
  "NIKOTIN_GATE",
  "ALKOHOL_GATE",
  "SUBST_GATE",
  "VOLLST_GEWICHT_VERAENDERN",
  // Adipositas / Gewichtsreduktion – Sektionsöffner
  "ADIP_DAUER",
  "ADIP_REDUKTION_VERSUCH",
  "ADIP_BEWEGUNG",
  "ADIP_MEDI_INTERESSE",
  "ADIP_SICHERHEIT_PANKREATITIS",
  "ADIP_BERATUNGSWUNSCH",
]);

// ---------------------------------------------------------------------------
// FACHAERZTE-Spezialfall (Schema + Typen)
// ---------------------------------------------------------------------------

export type FacharztEntry = {
  erkrankung: string;
  bereich: string;
  name: string;
  adresse: string;
  _localId?: string;
};

export const FACHAERZTE_SCHEMA: Array<{
  key: keyof FacharztEntry;
  label: string;
  label_en: string;
  type: "text" | "select" | "textarea";
  required: boolean;
  options?: string[];
  placeholder?: string;
  placeholder_en?: string;
  helperText?: string;
  helperText_en?: string;
}> = [
  {
    key: "erkrankung",
    label: "Erkrankung / Grund der fachärztlichen Behandlung",
    label_en: "Condition / Reason for specialist treatment",
    type: "textarea",
    required: true,
    placeholder: "z.B. Herz-Kreislauf-Probleme, Diabetes",
    placeholder_en: "e.g. Cardiovascular problems, Diabetes",
  },
  {
    key: "bereich",
    label: "Facharztbereich",
    label_en: "Medical specialty",
    type: "select",
    required: true,
    options: [
      "Allgemeinmedizin",
      "Augenheilkunde",
      "Chirurgie",
      "Dermatologie",
      "Gynäkologie",
      "HNO",
      "Innere Medizin",
      "Kardiologie",
      "Neurologie",
      "Orthopädie",
      "Pädiatrie",
      "Psychiatrie / Psychotherapie",
      "Radiologie",
      "Urologie",
      "Sonstiges",
    ],
  },
  {
    key: "name",
    label: "Name des Facharztes oder der Praxis",
    label_en: "Name of the specialist or practice",
    type: "text",
    required: true,
    placeholder: "Dr. Müller / Praxis am Markt",
    placeholder_en: "Dr. Smith / Market Practice",
  },
  {
    key: "adresse",
    label: "Adresse der Praxis",
    label_en: "Address of the practice",
    type: "textarea",
    required: false,
    placeholder: "Straße, PLZ, Ort",
    placeholder_en: "Street, Postcode, City",
    helperText: "Falls bekannt",
    helperText_en: "If known",
  },
];

// ---------------------------------------------------------------------------
// RepeatableGroupField
// ---------------------------------------------------------------------------

export type RepeatableEntry = Record<string, string> & { _id?: string };

function LegacyVaccinationMatrixField({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuestionDefinition;
  value: string;
  onChange: (jsonValue: string) => void;
  disabled: boolean;
}) {
  const items = question.vaccinationItems ?? [];
  const [entries, setEntries] = useState<RepeatableEntry[]>(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const entryById = new Map(entries.map((entry) => [entry.vaccination_id, entry]));
  const activeIds = new Set(entries.map((entry) => entry.vaccination_id));
  const coreItems = items.filter((item) => !item.optional);
  const optionalItems = items.filter((item) => item.optional);
  const update = (id: string, key: string, fieldValue: string) => {
    const current = entryById.get(id) ?? { vaccination_id: id };
    const nextEntry = { ...current, [key]: fieldValue };
    const next = entries.some((entry) => entry.vaccination_id === id)
      ? entries.map((entry) => entry.vaccination_id === id ? nextEntry : entry)
      : [...entries, nextEntry];
    setEntries(next);
    onChange(JSON.stringify(next));
  };
  const toggleOptional = (id: string) => {
    const next = activeIds.has(id)
      ? entries.filter((entry) => entry.vaccination_id !== id)
      : [...entries, { vaccination_id: id }];
    setEntries(next);
    onChange(JSON.stringify(next));
  };
  const remove = (id: string) => {
    const next = entries.filter((entry) => entry.vaccination_id !== id);
    setEntries(next);
    onChange(JSON.stringify(next));
  };
  const renderRow = (item: NonNullable<QuestionDefinition["vaccinationItems"]>[number]) => {
    const entry = entryById.get(item.id) ?? { vaccination_id: item.id };
    const status = entry.documented_status ?? "";
    const planning = status && status !== "Vollständig vorhanden";
    return (
      <div key={item.id} style={{ display: "grid", gap: "0.5rem", padding: "0.75rem 0", borderTop: "1px solid var(--border)" }} data-vaccination-row={item.id}>
        <strong>{item.label}</strong>
        {item.id === "other" && (
          <input value={entry.custom_label ?? ""} placeholder="Bezeichnung" disabled={disabled} onChange={(event) => update(item.id, "custom_label", event.target.value)} />
        )}
        <select value={status} disabled={disabled} onChange={(event) => update(item.id, "documented_status", event.target.value)}>
          <option value="">— bitte wählen —</option>
          <option>Vollständig vorhanden</option><option>Teilweise vorhanden</option><option>Nicht vorhanden</option><option>Unklar</option>
        </select>
        {status === "Teilweise vorhanden" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {(item.doseOptions ?? []).map((dose) => {
              const selected = parseMultiSelectValue(entry.documented_doses ?? "", item.doseOptions ?? []).includes(dose);
              return <button key={dose} type="button" disabled={disabled} onClick={() => update(item.id, "documented_doses", toggleMultiSelectValue(entry.documented_doses ?? "", dose, item.doseOptions ?? []))} style={{ padding: "0.2rem 0.5rem", border: "1px solid var(--border)", background: selected ? "var(--primary, #2563eb)" : "var(--background)", color: selected ? "#fff" : "var(--foreground)" }}>{dose}</button>;
            })}
          </div>
        )}
        {planning && <select value={entry.further_action ?? ""} disabled={disabled} onChange={(event) => update(item.id, "further_action", event.target.value)}><option value="">Weiteres Vorgehen</option><option>Impfung ärztlich empfohlen</option><option>Durchführung geplant / vereinbart</option><option>Derzeit kein weiteres Vorgehen</option></select>}
        {planning && (entry.further_action === "Impfung ärztlich empfohlen" || entry.further_action === "Durchführung geplant / vereinbart") && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", gap: "0.5rem" }}><input type="date" value={entry.reference_date ?? ""} disabled={disabled} onChange={(event) => update(item.id, "reference_date", event.target.value)} /><input inputMode="numeric" value={entry.interval_value ?? ""} placeholder="Intervall" disabled={disabled} onChange={(event) => update(item.id, "interval_value", event.target.value)} /><select value={entry.interval_unit ?? ""} disabled={disabled} onChange={(event) => update(item.id, "interval_unit", event.target.value)}><option value="">Einheit</option><option>Tage</option><option>Wochen</option><option>Monate</option></select></div>}
        {activeIds.has(item.id) && <button type="button" disabled={disabled} onClick={() => remove(item.id)} style={{ justifySelf: "start" }}>Zeile entfernen</button>}
      </div>
    );
  };
  return <div style={{ display: "grid", gap: "0.25rem" }}><div>{coreItems.map(renderRow)}</div><details><summary>Weitere Impfungen</summary>{optionalItems.map((item) => <label key={item.id} style={{ display: "block", margin: "0.5rem 0" }}><input type="checkbox" checked={activeIds.has(item.id)} disabled={disabled} onChange={() => toggleOptional(item.id)} /> {item.label}</label>)}{optionalItems.filter((item) => activeIds.has(item.id)).map(renderRow)}</details></div>;
}

function VaccinationMatrixV2Field({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuestionDefinition;
  value: string;
  onChange: (jsonValue: string) => void;
  disabled: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [entries, setEntries] = useState<RepeatableEntry[]>(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const items = question.vaccinationItems ?? [];
  const schema = question.groupSchema ?? [];
  const statusOptions = schema.find((field) => field.key === "documented_status")?.options ?? [];
  const furtherActionField = schema.find((field) => field.key === "further_action");
  const noteField = schema.find((field) => field.key === "note");
  const referenceDateField = schema.find((field) => field.key === "reference_date");
  const intervalValueField = schema.find((field) => field.key === "interval_value");
  const intervalUnitField = schema.find((field) => field.key === "interval_unit");
  const actionOptions = furtherActionField?.options ?? [];
  const intervalUnits = intervalUnitField?.options ?? [];
  const entryById = new Map(entries.map((entry) => [entry.vaccination_id, entry]));
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    minHeight: "2.75rem",
    padding: "0.5rem 0.75rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--input-background)",
    color: "var(--foreground)",
    fontFamily: "inherit",
    fontSize: "1rem",
  };

  const fieldIsVisible = (field: RepeatableGroupFieldDef | undefined, entry: RepeatableEntry) => {
    if (!field) return false;
    if (!field.conditionalOn) return true;
    const controllingValue = entry[field.conditionalOn] ?? "";
    return field.conditionalValues
      ? field.conditionalValues.includes(controllingValue)
      : controllingValue === field.conditionalValue;
  };

  const commit = (next: RepeatableEntry[]) => {
    setEntries(next);
    onChange(next.length > 0 ? JSON.stringify(next) : "");
  };
  const replaceEntry = (id: string, nextEntry: RepeatableEntry) => {
    commit(entries.some((entry) => entry.vaccination_id === id)
      ? entries.map((entry) => entry.vaccination_id === id ? nextEntry : entry)
      : [...entries, nextEntry]);
  };
  const update = (id: string, key: string, fieldValue: string) => {
    const current = entryById.get(id) ?? { vaccination_id: id };
    replaceEntry(id, { ...current, [key]: fieldValue });
  };
  const setStatus = (id: string, status: string) => {
    const current = entryById.get(id);
    replaceEntry(id, {
      vaccination_id: id,
      documented_status: status,
      ...(id === "other" && current?.custom_label ? { custom_label: current.custom_label } : {}),
    });
  };
  const reset = (id: string) => commit(entries.filter((entry) => entry.vaccination_id !== id));
  const updateSelection = (id: string, key: string, option: string, options: string[]) => {
    const current = entryById.get(id)?.[key] ?? "";
    const unclear = options.find((candidate) => candidate === "unklar" || candidate === "Serogruppe unklar");
    const withoutUnclear = unclear && option !== unclear
      ? parseMultiSelectValue(current, options).filter((candidate) => candidate !== unclear).join(", ")
      : current;
    update(id, key, option === unclear ? option : toggleMultiSelectValue(withoutUnclear, option, options));
  };
  const choiceButtons = (id: string, key: string, options: string[]) => {
    const selected = parseMultiSelectValue(entryById.get(id)?.[key] ?? "", options);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))", gap: "0.5rem" }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={selected.includes(option)}
            onClick={() => updateSelection(id, key, option, options)}
            style={{ ...answerChoiceStyle(selected.includes(option), disabled), minWidth: 0, minHeight: "2.75rem", padding: "0.55rem 0.65rem", whiteSpace: "normal", overflowWrap: "anywhere" }}
          >
            {option}
          </button>
        ))}
      </div>
    );
  };
  const summary = (entry?: RepeatableEntry) => {
    if (!entry?.documented_status) return "Nicht bearbeitet";
    const details = [
      entry.documented_doses,
      entry.documented_subtypes,
      entry.documented_season,
      entry.documented_date,
      entry.tetanus_doses,
      entry.diphtheria_doses,
      entry.pertussis_doses,
      entry.polio_doses,
    ].filter(Boolean);
    return [entry.documented_status, ...details].join(" · ");
  };
  const renderDetails = (item: NonNullable<QuestionDefinition["vaccinationItems"]>[number], entry: RepeatableEntry) => {
    if (entry.documented_status !== "Teilweise vorhanden") return null;
    if (item.documentationMode === "component_group") {
      return <div style={{ display: "grid", gap: "0.8rem" }}>{(item.componentFields ?? []).map((component) => <div key={component.key} style={{ display: "grid", gap: "0.4rem" }}><strong>{component.label}</strong>{choiceButtons(item.id, component.key, component.options)}</div>)}</div>;
    }
    if (item.documentationMode === "season") {
      const seasonField = schema.find((field) => field.key === "documented_season");
      const season = entry.documented_season ?? "";
      return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))", gap: "0.5rem", minWidth: 0 }}><div><input value={season} maxLength={seasonField?.maxLength} placeholder="Saison, z. B. 2025/26" disabled={disabled} onChange={(event) => update(item.id, "documented_season", limitTextLength(event.target.value, seasonField?.maxLength))} style={fieldStyle} /><TextLengthCounter value={season} maxLength={seasonField?.maxLength} /></div><input type="date" aria-label={`${item.label} Impfdatum`} value={entry.documented_date ?? ""} disabled={disabled} onChange={(event) => update(item.id, "documented_date", event.target.value)} style={fieldStyle} /></div>;
    }
    if (item.documentationMode === "subtype") return choiceButtons(item.id, "documented_subtypes", item.subtypeOptions ?? []);
    if (item.documentationMode === "free_text") return null;
    return choiceButtons(item.id, "documented_doses", item.doseOptions ?? []);
  };
  const renderRow = (item: NonNullable<QuestionDefinition["vaccinationItems"]>[number]) => {
    const entry = entryById.get(item.id) ?? { vaccination_id: item.id };
    const isOpen = openId === item.id;
    const planning = fieldIsVisible(furtherActionField, entry);
    const showNote = planning && fieldIsVisible(noteField, entry);
    const showReferenceDate = planning && fieldIsVisible(referenceDateField, entry);
    const showIntervalValue = planning && fieldIsVisible(intervalValueField, entry);
    const showIntervalUnit = planning && fieldIsVisible(intervalUnitField, entry);
    return (
      <div key={item.id} data-vaccination-row={item.id} style={{ borderTop: "1px solid var(--border)" }}>
        <button type="button" aria-expanded={isOpen} disabled={disabled} onClick={() => setOpenId(isOpen ? null : item.id)} style={{ width: "100%", minWidth: 0, minHeight: "3.5rem", padding: "0.7rem 0", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 1.5rem", gap: "0.75rem", alignItems: "center", textAlign: "left", border: 0, background: "transparent", color: "inherit" }}>
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><strong style={{ display: "block" }}>{item.label}</strong><span style={{ display: "block", marginTop: "0.15rem", color: "var(--muted-foreground, #6b7280)", fontSize: "0.82rem", overflowWrap: "anywhere" }}>{summary(entryById.get(item.id))}</span></span>
          <span aria-hidden="true" style={{ width: "1.5rem", textAlign: "center", fontSize: "1.25rem" }}>{isOpen ? "−" : "+"}</span>
        </button>
        {isOpen && <div style={{ display: "grid", gap: "0.85rem", padding: "0.25rem 0 1rem" }}>
          {item.id === "other" && (() => { const field = schema.find((candidate) => candidate.key === "custom_label"); const fieldValue = entry.custom_label ?? ""; return <div><input value={fieldValue} maxLength={field?.maxLength} placeholder="Bezeichnung" disabled={disabled} onChange={(event) => update(item.id, "custom_label", limitTextLength(event.target.value, field?.maxLength))} style={fieldStyle} /><TextLengthCounter value={fieldValue} maxLength={field?.maxLength} /></div>; })()}
          <div data-vaccination-status-gates style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))", gap: "0.5rem" }}>
            {statusOptions.map((status) => <button key={status} type="button" disabled={disabled} aria-pressed={entry.documented_status === status} onClick={() => setStatus(item.id, status)} style={{ ...answerChoiceStyle(entry.documented_status === status, disabled), minWidth: 0, minHeight: "3rem", padding: "0.65rem", whiteSpace: "normal", overflowWrap: "anywhere" }}>{status}</button>)}
          </div>
          {renderDetails(item, entry)}
          {planning && <fieldset style={{ minWidth: 0, margin: 0, padding: 0, border: 0 }}><legend style={{ marginBottom: "0.4rem", fontWeight: 500 }}>{furtherActionField?.label ?? "Weiteres Vorgehen"}</legend><div data-vaccination-further-action style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))", gap: "0.5rem" }}>{actionOptions.map((option) => <button key={option} type="button" disabled={disabled} aria-pressed={entry.further_action === option} onClick={() => update(item.id, "further_action", option)} style={{ ...answerChoiceStyle(entry.further_action === option, disabled), minWidth: 0, minHeight: "3rem", padding: "0.65rem", whiteSpace: "normal", overflowWrap: "anywhere" }}>{option}</button>)}</div></fieldset>}
          {showNote && <label style={{ display: "grid", gap: "0.4rem", minWidth: 0 }}><strong>{noteField?.label}</strong><textarea aria-label={`${item.label} ${noteField?.label}`} value={entry.note ?? ""} maxLength={noteField?.maxLength} disabled={disabled} onChange={(event) => update(item.id, "note", limitTextLength(event.target.value, noteField?.maxLength))} style={{ ...fieldStyle, minHeight: "5.5rem", resize: "vertical" }} /><TextLengthCounter value={entry.note ?? ""} maxLength={noteField?.maxLength} /></label>}
          {(showReferenceDate || showIntervalValue || showIntervalUnit) && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))", gap: "0.5rem", minWidth: 0 }}>{showReferenceDate && <input type="date" aria-label={`${item.label} ${referenceDateField?.label}`} value={entry.reference_date ?? ""} disabled={disabled} onChange={(event) => update(item.id, "reference_date", event.target.value)} style={fieldStyle} />}{showIntervalValue && <div><input inputMode="numeric" aria-label={`${item.label} ${intervalValueField?.label}`} value={entry.interval_value ?? ""} maxLength={intervalValueField?.maxLength} placeholder={intervalValueField?.label ?? "Intervall"} disabled={disabled} onChange={(event) => update(item.id, "interval_value", limitTextLength(event.target.value, intervalValueField?.maxLength))} style={fieldStyle} /><TextLengthCounter value={entry.interval_value ?? ""} maxLength={intervalValueField?.maxLength} /></div>}{showIntervalUnit && <select aria-label={`${item.label} ${intervalUnitField?.label}`} value={entry.interval_unit ?? ""} disabled={disabled} onChange={(event) => update(item.id, "interval_unit", event.target.value)} style={fieldStyle}><option value="">{intervalUnitField?.label ?? "Einheit"}</option>{intervalUnits.map((unit) => <option key={unit}>{unit}</option>)}</select>}</div>}
          {entryById.has(item.id) && <button type="button" disabled={disabled} onClick={() => reset(item.id)} style={{ justifySelf: "start", minHeight: "2.75rem", padding: "0.55rem 0.8rem" }}>Zurücksetzen</button>}
        </div>}
      </div>
    );
  };

  return <div style={{ display: "grid", gap: "1.25rem", minWidth: 0 }}>{(question.vaccinationCategories ?? []).map((category) => <section key={category.id} data-vaccination-category={category.id} style={{ minWidth: 0 }}><h3 style={{ margin: "0 0 0.35rem", fontSize: "1rem" }}>{category.label}</h3>{items.filter((item) => item.categoryId === category.id).map(renderRow)}</section>)}</div>;
}

export function VaccinationMatrixField(props: {
  question: QuestionDefinition;
  value: string;
  onChange: (jsonValue: string) => void;
  disabled: boolean;
}) {
  return props.question.vaccinationSchemaVersion === 2
    ? <VaccinationMatrixV2Field {...props} />
    : <LegacyVaccinationMatrixField {...props} />;
}

export function RepeatableGroupField({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuestionDefinition;
  value: string;
  onChange: (jsonValue: string) => void;
  disabled: boolean;
}) {
  const schema: RepeatableGroupFieldDef[] = question.groupSchema ?? [];
  const maxEntries = question.maxEntries ?? 20;

  const [entries, setEntries] = useState<RepeatableEntry[]>(() => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((e) => ({
        ...(typeof e === "object" && e !== null ? (e as Record<string, string>) : {}),
        _id: generateLocalId(),
      }));
    } catch {
      return [];
    }
  });

  const serialize = (list: RepeatableEntry[]) =>
    list.map(({ _id: _, ...rest }) => rest);

  const addEntry = () => {
    if (entries.length >= maxEntries) return;
    const blank: RepeatableEntry = { _id: generateLocalId() };
    for (const f of schema) blank[f.key] = "";
    const next = [...entries, blank];
    setEntries(next);
    onChange(JSON.stringify(serialize(next)));
  };

  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    onChange(JSON.stringify(serialize(next)));
  };

  const updateField = (idx: number, key: string, val: string) => {
    const next = entries.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [key]: val };
      for (const f of schema) {
        if (f.conditionalOn === key) {
          const hidden = f.conditionalValues
            ? !f.conditionalValues.includes(updated[key])
            : updated[key] !== f.conditionalValue;
          if (hidden) updated[f.key] = "";
        }
      }
      return updated;
    });
    setEntries(next);
    onChange(JSON.stringify(serialize(next)));
  };

  const baseFieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--input-background)",
    fontSize: "1rem",
    fontFamily: "inherit",
    color: "var(--foreground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {entries.map((entry, idx) => (
        <div
          key={entry._id ?? `entry-${idx}`}
          data-rg-entry={idx}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            background: "var(--card-background, #fafafa)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>
              {`Eintrag ${idx + 1}`}
            </strong>
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              disabled={disabled}
              data-rg-remove={idx}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.85rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--destructive, #dc2626)",
                color: "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              Entfernen
            </button>
          </div>
          {schema.map((field) => {
            if (field.conditionalOn) {
              const cv = entry[field.conditionalOn] ?? "";
              const hidden = field.conditionalValues
                ? !field.conditionalValues.includes(cv)
                : cv !== field.conditionalValue;
              if (hidden) return null;
            }
            const fieldVal = entry[field.key] ?? "";

            if (field.type === "checkbox") {
              return (
                <div
                  key={field.key}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
                >
                  <input
                    type="checkbox"
                    id={`${question.id}-${idx}-${field.key}`}
                    checked={fieldVal === "ja"}
                    onChange={(e) => updateField(idx, field.key, e.target.checked ? "ja" : "")}
                    disabled={disabled}
                    data-rg-field={`${idx}:${field.key}`}
                  />
                  <label
                    htmlFor={`${question.id}-${idx}-${field.key}`}
                    style={{ fontSize: "0.9rem", cursor: disabled ? "not-allowed" : "pointer" }}
                  >
                    {field.label}
                  </label>
                </div>
              );
            }

            return (
              <label key={field.key} style={{ display: "block", marginBottom: "0.5rem" }}>
                <span style={{ display: "block", fontWeight: 500, marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                  {field.label}
                  {field.required && (
                    <span style={{ color: "var(--destructive, #dc2626)", marginLeft: "0.25rem" }}>*</span>
                  )}
                </span>
                {field.type === "select" ? (
                  <select
                    value={fieldVal}
                    onChange={(e) => updateField(idx, field.key, e.target.value)}
                    disabled={disabled}
                    style={baseFieldStyle}
                    data-rg-field={`${idx}:${field.key}`}
                  >
                    <option value="">— bitte wählen —</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === "date" ? (
                  <input
                    type="date"
                    value={fieldVal}
                    onChange={(e) => updateField(idx, field.key, e.target.value)}
                    disabled={disabled}
                    style={baseFieldStyle}
                    data-rg-field={`${idx}:${field.key}`}
                  />
                ) : field.type === "textarea" ? (
                  <><textarea
                    value={fieldVal}
                    maxLength={field.maxLength}
                    onChange={(e) => updateField(idx, field.key, limitTextLength(e.target.value, field.maxLength))}
                    disabled={disabled}
                    rows={2}
                    style={{ ...baseFieldStyle, resize: "vertical" }}
                    data-rg-field={`${idx}:${field.key}`}
                  /><TextLengthCounter value={fieldVal} maxLength={field.maxLength} /></>
                ) : field.type === "yes_no" ? (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }} data-rg-field={`${idx}:${field.key}`}>
                    {(["ja", "nein"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={disabled}
                        onClick={() => updateField(idx, field.key, val)}
                        data-rg-yesno={`${idx}:${field.key}:${val}`}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--border)",
                          background: fieldVal === val ? "var(--primary, #2563eb)" : "var(--background)",
                          color: fieldVal === val ? "#fff" : "var(--foreground)",
                          fontWeight: fieldVal === val ? 600 : 400,
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.6 : 1,
                          fontSize: "0.9rem",
                        }}
                      >
                        {val === "ja" ? "Ja" : "Nein"}
                      </button>
                    ))}
                  </div>
                ) : field.type === "multi_select" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }} data-rg-field={`${idx}:${field.key}`}>
                    {(field.options ?? []).map((opt) => {
                      const options = field.options ?? [];
                      const selected = parseMultiSelectValue(fieldVal, options).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            updateField(idx, field.key, toggleMultiSelectValue(fieldVal, opt, options));
                          }}
                          data-rg-multiselect={`${idx}:${field.key}:${opt}`}
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "var(--radius)",
                            border: "1px solid var(--border)",
                            background: selected ? "var(--primary, #2563eb)" : "var(--background)",
                            color: selected ? "#fff" : "var(--foreground)",
                            fontWeight: selected ? 600 : 400,
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.6 : 1,
                            fontSize: "0.9rem",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <><input
                    type="text"
                    value={fieldVal}
                    maxLength={field.maxLength}
                    onChange={(e) => updateField(idx, field.key, limitTextLength(e.target.value, field.maxLength))}
                    disabled={disabled}
                    pattern={ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN}
                    style={baseFieldStyle}
                    data-rg-field={`${idx}:${field.key}`}
                  /><TextLengthCounter value={fieldVal} maxLength={field.maxLength} /></>
                )}
                {field.helperText && (
                  <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted-foreground, #6b7280)", marginTop: "0.25rem" }}>
                    {field.helperText}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      ))}
      {entries.length < maxEntries && (
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          data-rg-add={question.id}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--secondary, #f1f5f9)",
            color: "var(--foreground)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {question.addEntryLabel ?? "+ Weiteren Eintrag hinzufügen"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FachaerzeField
// ---------------------------------------------------------------------------

export function FachaerzeField({
  value,
  onChange,
  disabled,
  language,
}: {
  value: string;
  onChange: (jsonValue: string) => void;
  disabled: boolean;
  language: QuestionnaireLanguage;
}) {
  const [entries, setEntries] = useState<FacharztEntry[]>(() => {
    if (!value || value === "") return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry) => ({ ...entry, _localId: generateLocalId() }));
    } catch {
      return [];
    }
  });

  const cleanEntries = (es: FacharztEntry[]) =>
    es.map(({ erkrankung, bereich, name, adresse }) => ({
      erkrankung,
      bereich,
      name,
      adresse,
    }));

  const addEntry = () => {
    if (entries.length >= 10) return;
    const newEntries = [
      ...entries,
      { erkrankung: "", bereich: "", name: "", adresse: "", _localId: generateLocalId() },
    ];
    setEntries(newEntries);
    onChange(JSON.stringify(cleanEntries(newEntries)));
  };

  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
    onChange(JSON.stringify(cleanEntries(newEntries)));
  };

  const updateEntry = (index: number, key: keyof FacharztEntry, val: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [key]: val };
    setEntries(newEntries);
    onChange(JSON.stringify(cleanEntries(newEntries)));
  };

  const getLabel = (field: (typeof FACHAERZTE_SCHEMA)[number]) =>
    language === "en" && field.label_en ? field.label_en : field.label;

  const getPlaceholder = (field: (typeof FACHAERZTE_SCHEMA)[number]) =>
    language === "en" && field.placeholder_en ? field.placeholder_en : field.placeholder;

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--input-background)",
    fontSize: "1rem",
    fontFamily: "inherit",
    color: "var(--foreground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {entries.map((entry, idx) => (
        <div
          key={entry._localId || `fachaerzte-${idx}`}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            background: "var(--card-background, #fafafa)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>
              {language === "en" ? `Specialist ${idx + 1}` : `Eintrag ${idx + 1}`}
            </strong>
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              disabled={disabled}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.85rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--destructive, #dc2626)",
                color: "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {language === "en" ? "Remove" : "Entfernen"}
            </button>
          </div>
          {FACHAERZTE_SCHEMA.map((field) => (
            <label key={field.key} style={{ display: "block", marginBottom: "0.5rem" }}>
              <span style={{ display: "block", fontWeight: 500, marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                {getLabel(field)}
                {field.required && (
                  <span style={{ color: "var(--destructive, #dc2626)", marginLeft: "0.25rem" }}>*</span>
                )}
              </span>
              {field.type === "select" ? (
                <select
                  value={entry[field.key]}
                  onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                  disabled={disabled}
                  style={baseStyle}
                >
                  <option value="">
                    {language === "en" ? "— please choose —" : "— bitte wählen —"}
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={entry[field.key]}
                  onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  placeholder={getPlaceholder(field)}
                  style={{ ...baseStyle, resize: "vertical" }}
                />
              ) : (
                <input
                  type="text"
                  value={entry[field.key]}
                  onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                  disabled={disabled}
                  placeholder={getPlaceholder(field)}
                  style={baseStyle}
                />
              )}
              {field.helperText && (
                <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted-foreground, #6b7280)", marginTop: "0.25rem" }}>
                  {language === "en" && field.helperText_en ? field.helperText_en : field.helperText}
                </span>
              )}
            </label>
          ))}
        </div>
      ))}
      {entries.length < 10 && (
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--secondary, #f1f5f9)",
            color: "var(--foreground)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {language === "en" ? "+ Add another specialist" : "+ Weiteren Facharzt hinzufügen"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionField (Haupt-Render-Komponente, alle Typen)
// ---------------------------------------------------------------------------

export function QuestionField({
  question,
  value,
  onChange,
  disabled,
  language,
  hasError,
}: {
  question: QuestionDefinition;
  value: string;
  onChange: (id: string, val: string) => void;
  disabled: boolean;
  language: QuestionnaireLanguage;
  hasError: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--input-background)",
    fontSize: "1rem",
    fontFamily: "inherit",
    color: "var(--foreground)",
  };

  if (question.id === "FACHAERZTE") {
    return (
      <FachaerzeField
        value={value}
        onChange={(jsonValue) => onChange(question.id, jsonValue)}
        disabled={disabled}
        language={language}
      />
    );
  }

  switch (question.type as QuestionType) {
    case "multi_select":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
          {(question.options ?? []).map((opt) => {
            const options = question.options ?? [];
            const optionValue = getQuestionOptionValue(opt);
            const selected = parseMultiSelectValue(value, options).includes(optionValue);
            return (
              <button
                key={optionValue}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(question.id, toggleMultiSelectValue(value, optionValue, options));
                }}
                style={answerChoiceStyle(selected, disabled)}
                data-q-multiselect={`${question.id}:${optionValue}`}
              >
                {getQuestionOptionLabel(opt)}
              </button>
            );
          })}
        </div>
      );
    case "select":
      return (
        <div
          id={question.id}
          role="radiogroup"
          aria-label={question.text}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))", gap: "0.5rem", marginTop: "0.25rem" }}
        >
          {(question.options ?? []).map((opt) => (
            <button
              key={getQuestionOptionValue(opt)}
              type="button"
              role="radio"
              aria-checked={value === getQuestionOptionValue(opt)}
              disabled={disabled}
              onClick={() => onChange(question.id, getQuestionOptionValue(opt))}
              style={{ ...answerChoiceStyle(value === getQuestionOptionValue(opt), disabled), minHeight: "2.75rem", textAlign: "left" }}
              data-q-select={`${question.id}:${getQuestionOptionValue(opt)}`}
            >
              {getQuestionOptionLabel(opt)}
            </button>
          ))}
        </div>
      );
    case "textarea":
      return (
        <><textarea
          id={question.id}
          value={value}
          maxLength={question.maxLength}
          onChange={(e) => onChange(question.id, limitTextLength(e.target.value, question.maxLength))}
          disabled={disabled}
          required={question.required}
          rows={3}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${question.id}-charerror` : undefined}
          style={{ ...baseStyle, resize: "vertical" }}
        /><TextLengthCounter value={value} maxLength={question.maxLength} /></>
      );
    case "date":
      return (
        <input
          type="date"
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          style={baseStyle}
        />
      );
    case "yes_no":
      return (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          {([
            { val: "ja", labelDe: "Ja", labelEn: "Yes" },
            { val: "nein", labelDe: "Nein", labelEn: "No" },
          ] as const).map(({ val, labelDe, labelEn }) => {
            const label = language === "en" ? labelEn : labelDe;
            return (
              <button
                key={val}
                type="button"
                disabled={disabled}
                onClick={() => onChange(question.id, val)}
                style={answerChoiceStyle(value === val, disabled)}
                data-q-yesno={`${question.id}:${val}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    case "confirmation":
      return (
        <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
          <input
            type="checkbox"
            id={question.id}
            checked={value === "true"}
            onChange={(event) =>
              onChange(question.id, event.target.checked ? "true" : "")
            }
            disabled={disabled}
            required={question.required}
            aria-invalid={hasError || undefined}
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            {question.text}
            {question.required && (
              <span
                aria-hidden="true"
                style={{ color: "var(--destructive)", marginLeft: "0.25rem" }}
              >
                *
              </span>
            )}
          </span>
        </label>
      );
    case "repeatable_group":
      if (question.presentation === "vaccination_matrix") {
        return <VaccinationMatrixField question={question} value={value} onChange={(jsonValue) => onChange(question.id, jsonValue)} disabled={disabled} />;
      }
      return (
        <RepeatableGroupField
          question={question}
          value={value}
          onChange={(jsonValue) => onChange(question.id, jsonValue)}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="number"
            id={question.id}
            value={value}
            onChange={(e) => onChange(question.id, e.target.value)}
            disabled={disabled}
            required={question.required}
            step={question.step ?? "any"}
            min={0}
            style={baseStyle}
          />
          {question.unit && (
            <span style={{ fontSize: "0.9rem", color: "var(--muted-foreground, #6b7280)", whiteSpace: "nowrap" }}>
              {question.unit}
            </span>
          )}
        </div>
      );
    default:
      return (
        <><input
          type="text"
          id={question.id}
          value={value}
          maxLength={question.maxLength}
          onChange={(e) => onChange(question.id, limitTextLength(e.target.value, question.maxLength))}
          disabled={disabled}
          required={question.required}
          pattern={ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${question.id}-charerror` : undefined}
          style={baseStyle}
        /><TextLengthCounter value={value} maxLength={question.maxLength} /></>
      );
  }
}
