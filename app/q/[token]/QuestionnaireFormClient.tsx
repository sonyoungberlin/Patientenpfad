"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuestionDefinition, QuestionType, RepeatableGroupFieldDef } from "@/lib/questionnaire/blockCatalog";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import { IdentityGate } from "@/components/IdentityGate";
import {
  ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN,
  answerCharactersErrorMessage,
  isAnswerTextAllowed,
  validateAnswerCharacters,
} from "@/lib/questionnaire/validateAnswerCharacters";
import {
  computeVisibleQuestionIds,
  computeVisibleBlockIds,
  type ConditionalRule,
} from "@/lib/questionnaire/conditionalLogic";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { computeAllDerivedValues } from "@/lib/questionnaire/derivedValues";
import { MAIN_GATE_QUESTION_IDS } from "@/components/questionnaire/QuestionField";

// ---------------------------------------------------------------------------
// FACHAERZTE Schema (lokaler Spezialfall)
// ---------------------------------------------------------------------------

type FacharztEntry = {
  erkrankung: string;
  bereich: string;
  name: string;
  adresse: string;
  _localId?: string; // Nur für React keys, wird nicht gespeichert
};

function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const FACHAERZTE_SCHEMA: Array<{
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

function QuestionField({
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

  // Spezialfall: FACHAERZTE repeatable group
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
                  const next = selected
                    ? current.filter((s) => s !== opt)
                    : [...current, opt];
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
          style={{ ...baseStyle }}
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
            <span
              style={{ fontSize: "0.9rem", color: "var(--muted-foreground, #6b7280)", whiteSpace: "nowrap" }}
              aria-label={question.unit}
            >
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

// ---------------------------------------------------------------------------
// Generische Repeatable-Group-Komponente
// ---------------------------------------------------------------------------

type RepeatableEntry = Record<string, string> & { _id?: string };

function RepeatableGroupField({
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
      // Werte von Feldern löschen, die durch diese Änderung verborgen werden
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
            // Bedingte Sichtbarkeit innerhalb eines Eintrags
            if (field.conditionalOn) {
              const cv = entry[field.conditionalOn] ?? "";
              const hidden = field.conditionalValues
                ? !field.conditionalValues.includes(cv)
                : cv !== field.conditionalValue;
              if (hidden) return null;
            }
            const fieldVal = entry[field.key] ?? "";

            // Checkbox: Inline-Darstellung mit Label rechts
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
              <label
                key={field.key}
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                <span
                  style={{
                    display: "block",
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {field.label}
                  {field.required && (
                    <span
                      style={{ color: "var(--destructive, #dc2626)", marginLeft: "0.25rem" }}
                    >
                      *
                    </span>
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
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
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
                  <div
                    style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}
                    data-rg-field={`${idx}:${field.key}`}
                  >
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
                          background:
                            fieldVal === val
                              ? "var(--primary, #2563eb)"
                              : "var(--background)",
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
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}
                    data-rg-field={`${idx}:${field.key}`}
                  >
                    {(field.options ?? []).map((opt) => {
                      const selected = fieldVal.split(",").map((s) => s.trim()).filter(Boolean).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            const current = fieldVal.split(",").map((s) => s.trim()).filter(Boolean);
                            const next = selected
                              ? current.filter((s) => s !== opt)
                              : [...current, opt];
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
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--muted-foreground, #6b7280)",
                      marginTop: "0.25rem",
                    }}
                  >
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
// FACHAERZTE Repeatable Field (lokaler Spezialfall)
// ---------------------------------------------------------------------------

function FachaerzeField({
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
  // Lokaler State für Einträge mit stabilen _localId für React keys
  // Initialisiert nur beim ersten Render aus value prop
  const [entries, setEntries] = useState<FacharztEntry[]>(() => {
    if (!value || value === "") return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      // Füge _localId hinzu beim initialen Laden
      return parsed.map((entry) => ({
        ...entry,
        _localId: generateLocalId(),
      }));
    } catch {
      return [];
    }
  });

  // Entfernt _localId vor dem Speichern (nur Datenfelder bleiben)
  const cleanEntries = (entries: FacharztEntry[]) => {
    return entries.map(({ erkrankung, bereich, name, adresse }) => ({
      erkrankung,
      bereich,
      name,
      adresse,
    }));
  };

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

  const getLabel = (field: typeof FACHAERZTE_SCHEMA[number]): string => {
    return language === "en" && field.label_en ? field.label_en : field.label;
  };

  const getPlaceholder = (field: typeof FACHAERZTE_SCHEMA[number]): string | undefined => {
    return language === "en" && field.placeholder_en ? field.placeholder_en : field.placeholder;
  };

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
            <label
              key={field.key}
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
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
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
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
          {language === "en"
            ? "+ Add another specialist"
            : "+ Weiteren Facharzt hinzufügen"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hilfsfunktion: einzelnes Frage-<li>-Element (gemeinsam für Legacy + Phase 4)
// ---------------------------------------------------------------------------

function renderQuestionLi(
  q: QuestionDefinition,
  values: Record<string, string>,
  fieldHasCharError: Record<string, boolean>,
  handleChange: (id: string, val: string) => void,
  saving: boolean,
  language: QuestionnaireLanguage,
  charErrorMessage: string,
  t: { requiredAriaSuffix: string },
  isGate: boolean,
  hasMissingRequired: boolean,
) {
  const gateStyle: React.CSSProperties = isGate
    ? {
        marginTop: "1.5rem",
        background: "#f5f5f5",
        borderColor: "#c8cdd4",
      }
    : {};
  const requiredErrStyle: React.CSSProperties = hasMissingRequired
    ? { borderColor: "var(--destructive, #dc2626)" }
    : {};

  return (
    <li
      key={q.id}
      data-q-question={q.id}
      data-q-gate={isGate || undefined}
      className="card"
      style={{ marginBottom: "0.75rem", ...gateStyle, ...requiredErrStyle }}
    >
      <label
        htmlFor={q.id}
        style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
      >
        {q.text}
        {q.required && (
          <>
            <span aria-hidden="true" style={{ color: "var(--destructive)", marginLeft: "0.25rem" }}>
              *
            </span>
            <span className="sr-only">{t.requiredAriaSuffix}</span>
          </>
        )}
      </label>
      <QuestionField
        question={q}
        value={values[q.id] ?? ""}
        onChange={handleChange}
        disabled={saving}
        language={language}
        hasError={fieldHasCharError[q.id] === true}
      />
      {hasMissingRequired && (
        <p
          data-q-requirederror={q.id}
          className="text-error"
          role="alert"
          aria-live="polite"
          style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}
        >
          {language === "de" ? "Dieses Feld ist erforderlich." : "This field is required."}
        </p>
      )}
      {fieldHasCharError[q.id] && (
        <p
          id={`${q.id}-charerror`}
          data-q-charerror={q.id}
          className="text-error"
          role="alert"
          aria-live="polite"
          style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}
        >
          {charErrorMessage}
        </p>
      )}
      {q.helperText && (
        <p
          style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--muted-foreground, #6b7280)" }}
          data-q-helper={q.id}
        >
          {q.helperText}
        </p>
      )}
    </li>
  );
}

/**
 * Client-Komponente für /q/[token].
 *
 * Wichtig: Patient-Intro und Praxis-Signatur werden bewusst innerhalb
 * dieser Client-Komponente gerendert (und nicht von der Server-Page),
 * damit sie nach erfolgreichem Absenden gemeinsam mit dem Formular
 * verschwinden. Im `submitted`-Branch gibt die Komponente ausschließlich
 * die Bestätigungsnachricht zurück. Status `completed`/`expired` werden
 * bereits in der Server-Page abgefangen und rendern diese Komponente
 * gar nicht erst.
 */
// Lokalisierte UI-Strings für die Patientensicht (außerhalb des Frage-Katalogs).
// Bewusst inline statt i18n-Library, um den minimalen Scope zu wahren.
const UI_STRINGS = {
  de: {
    requiredAriaSuffix: " (Pflichtfeld)",
    noQuestions: "Keine Fragen vorhanden.",
    submit: "Absenden",
    submitting: "Wird übermittelt…",
    submitted: "Vielen Dank, Ihre Angaben wurden übermittelt.",
    submitError:
      "Angaben konnten nicht übermittelt werden. Bitte versuchen Sie es erneut.",
  },
  en: {
    requiredAriaSuffix: " (required)",
    noQuestions: "No questions available.",
    submit: "Submit",
    submitting: "Submitting…",
    submitted: "Thank you, your information has been submitted.",
    submitError:
      "Your information could not be submitted. Please try again.",
  },
} as const;

export function QuestionnaireFormClient({
  token,
  questions,
  conditionalRules,
  frozenBlocks,
  introText,
  practiceSignature,
  language = "de",
}: {
  token: string;
  questions: QuestionDefinition[];
  conditionalRules?: ConditionalRule[] | null;
  /** Phase 4: eingefrorene Blockstruktur für blockbewusstes Rendering. */
  frozenBlocks?: FrozenBlock[] | null;
  introText?: string | null;
  practiceSignature?: string | null;
  language?: QuestionnaireLanguage;
}) {
  const t = UI_STRINGS[language];
  const charErrorMessage = answerCharactersErrorMessage(language);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const q of questions) {
      init[q.id] = "";
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [missingRequiredIds, setMissingRequiredIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Phase 5: Derived Values aus aktuellem Antwort-State live berechnen
  const derivedValues = useMemo(
    () => computeAllDerivedValues(values),
    [values],
  );

  // Gate-Fragen: explizite Hauptpfad-Fragen aus zentraler Konstante
  const gateQuestionIds = MAIN_GATE_QUESTION_IDS;

  // Sichtbare Blöcke (Phase 4: nur bei frozen_blocks-Sessions)
  const visibleBlockIds = useMemo(() => {
    if (!frozenBlocks) return null;
    return computeVisibleBlockIds(
      conditionalRules ?? [],
      frozenBlocks,
      values,
      derivedValues,
    );
  }, [frozenBlocks, conditionalRules, values, derivedValues]);

  // Sichtbare Fragen: Conditional-Logic-Engine filtert anhand aktueller Antworten.
  // Wenn keine Regeln vorhanden sind, sind alle Fragen sichtbar (Rückwärtskompatibilität).
  const visibleQuestions = useMemo(() => {
    if (frozenBlocks && visibleBlockIds) {
      // Phase 4: Nur Fragen aus sichtbaren Blöcken, zusätzlich durch showQuestion gefiltert
      const result: QuestionDefinition[] = [];
      for (const block of frozenBlocks) {
        if (!visibleBlockIds.has(block.id)) continue;
        const blockQIds = block.questions.map((q) => q.id);
        const visibleQIds = computeVisibleQuestionIds(
          conditionalRules ?? [],
          blockQIds,
          values,
          derivedValues,
        );
        result.push(...block.questions.filter((q) => visibleQIds.has(q.id)));
      }
      return result;
    }
    // Legacy-Pfad
    if (!conditionalRules || conditionalRules.length === 0) return questions;
    const visibleIds = computeVisibleQuestionIds(
      conditionalRules,
      questions.map((q) => q.id),
      values,
      derivedValues,
    );
    return questions.filter((q) => visibleIds.has(q.id));
  }, [frozenBlocks, visibleBlockIds, conditionalRules, questions, values, derivedValues]);

  // Per-Frage Live-Charactervalidierung. Gibt true zurück, wenn der aktuelle
  // Wert ungültige (nicht-lateinische) Zeichen enthält. Auswahl-/Datums-/
  // Yes-No-Felder liefern immer false (siehe `isAnswerTextAllowed`).
  const fieldHasCharError = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const q of visibleQuestions) {
      const v = values[q.id] ?? "";
      map[q.id] = !isAnswerTextAllowed(v, q.type as QuestionType, q.id);
    }
    return map;
  }, [values, visibleQuestions]);

  const hasAnyCharError = Object.values(fieldHasCharError).some(Boolean);

  function handleChange(id: string, val: string) {
    setValues((prev) => ({ ...prev, [id]: val }));
    if (missingRequiredIds.has(id)) {
      setMissingRequiredIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleSubmit() {
    setError(null);

    // Beim Absenden nur Antworten sichtbarer Fragen mitsenden.
    // Antworten unsichtbarer Fragen (wegen Conditional Logic) werden nicht übermittelt.
    const visibleIds = new Set(visibleQuestions.map((q) => q.id));
    const answersToSend = Object.fromEntries(
      Object.entries(values).filter(([id]) => visibleIds.has(id)),
    );

    // Required-Validierung: nur sichtbare Pflichtfelder prüfen
    const missing = visibleQuestions.filter(
      (q) => q.required && (answersToSend[q.id] ?? "").trim() === "",
    );
    if (missing.length > 0) {
      setMissingRequiredIds(new Set(missing.map((q) => q.id)));
      setError(
        language === "de"
          ? "Bitte alle markierten Pflichtfelder ausfüllen (*)."
          : "Please fill in all required fields (*).",
      );
      return;
    }
    setMissingRequiredIds(new Set());

    // Clientseitige Validierung der Freitext-Antworten gegen erlaubte Zeichen.
    // Block submit, falls verletzt — Server validiert zusätzlich (Bypass-Schutz).
    const charCheck = validateAnswerCharacters(answersToSend, visibleQuestions);
    if (!charCheck.ok) {
      setError(charErrorMessage);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/q/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToSend }),
      });

      if (!response.ok) {
        // Fehlermeldungen vom Server sind aktuell deutsch; wir verwenden
        // sie nur, wenn die Patient:in deutsch ausgewählt hat. Sonst
        // einheitlich englischer Fallback.
        const data = await response.json().catch(() => null);
        const serverError =
          (data as { error?: string } | null)?.error ?? null;
        setError(language === "de" && serverError ? serverError : t.submitError);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t.submitError);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <p data-q-submitted style={{ marginTop: "1.5rem" }}>
        {t.submitted}
      </p>
    );
  }

  return (
    <>
      {introText ? (
        <p data-patient-intro style={{ marginBottom: "0.5rem" }}>
          {introText}
        </p>
      ) : null}
      {practiceSignature ? (
        <p
          data-practice-signature
          style={{ whiteSpace: "pre-wrap", marginBottom: "1rem" }}
        >
          {practiceSignature}
        </p>
      ) : null}
      <IdentityGate language={language}>
        <div>
        {visibleQuestions.length === 0 ? (
        <p>{t.noQuestions}</p>
      ) : frozenBlocks && visibleBlockIds ? (
        // Phase 4: blockbewusstes Rendering mit <section data-q-block> je Block
        <>
          {frozenBlocks
            .filter((block) => visibleBlockIds.has(block.id))
            .map((block) => {
              const blockQSet = new Set(block.questions.map((q) => q.id));
              const blockVisible = visibleQuestions.filter((q) => blockQSet.has(q.id));
              if (blockVisible.length === 0) return null;
              return (
                <section key={block.id} data-q-block={block.id}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {blockVisible.map((q) => renderQuestionLi(q, values, fieldHasCharError, handleChange, saving, language, charErrorMessage, t, gateQuestionIds.has(q.id), missingRequiredIds.has(q.id)))}
                  </ul>
                </section>
              );
            })}
        </>
      ) : (
        // Legacy-Pfad: flache Liste
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {visibleQuestions.map((q) => renderQuestionLi(q, values, fieldHasCharError, handleChange, saving, language, charErrorMessage, t, gateQuestionIds.has(q.id), missingRequiredIds.has(q.id)))}
        </ul>
      )}
      {error ? (
        <p className="text-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary"
        data-q-submit
        onClick={() => void handleSubmit()}
        disabled={saving || hasAnyCharError}
        style={{ marginTop: "1rem" }}
      >
        {saving ? t.submitting : t.submit}
      </button>
    </div>
    </IdentityGate>
    </>
  );
}
