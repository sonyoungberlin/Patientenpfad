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

// ---------------------------------------------------------------------------
// Hilfsfunktion
// ---------------------------------------------------------------------------

export function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
                ) : field.type === "textarea" ? (
                  <textarea
                    value={fieldVal}
                    onChange={(e) => updateField(idx, field.key, e.target.value)}
                    disabled={disabled}
                    rows={2}
                    style={{ ...baseFieldStyle, resize: "vertical" }}
                    data-rg-field={`${idx}:${field.key}`}
                  />
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
                      const selected = fieldVal.split(",").map((s) => s.trim()).filter(Boolean).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            const current = fieldVal.split(",").map((s) => s.trim()).filter(Boolean);
                            const next = selected ? current.filter((s) => s !== opt) : [...current, opt];
                            updateField(idx, field.key, next.join(", "));
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
                  <input
                    type="text"
                    value={fieldVal}
                    onChange={(e) => updateField(idx, field.key, e.target.value)}
                    disabled={disabled}
                    pattern={ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN}
                    style={baseFieldStyle}
                    data-rg-field={`${idx}:${field.key}`}
                  />
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
            const selected = value.split(",").map((s) => s.trim()).filter(Boolean).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const current = value.split(",").map((s) => s.trim()).filter(Boolean);
                  const next = selected ? current.filter((s) => s !== opt) : [...current, opt];
                  onChange(question.id, next.join(", "));
                }}
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
                data-q-multiselect={`${question.id}:${opt}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    case "select":
      return (
        <select
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          style={baseStyle}
        >
          <option value="">
            {language === "en" ? "— please choose —" : "— bitte wählen —"}
          </option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <textarea
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          rows={3}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${question.id}-charerror` : undefined}
          style={{ ...baseStyle, resize: "vertical" }}
        />
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
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: value === val ? "var(--primary, #2563eb)" : "var(--background)",
                  color: value === val ? "#fff" : "var(--foreground)",
                  fontWeight: value === val ? 600 : 400,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  fontSize: "0.9rem",
                }}
                data-q-yesno={`${question.id}:${val}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    case "repeatable_group":
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
        <input
          type="text"
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          pattern={ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${question.id}-charerror` : undefined}
          style={baseStyle}
        />
      );
  }
}
