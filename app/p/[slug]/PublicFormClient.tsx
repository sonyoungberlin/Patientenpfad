/**
 * Client-Component für repeatable group "FACHAERZTE".
 *
 * Diese Komponente ermöglicht es Patient:innen, mehrere Facharzt-Einträge
 * dynamisch hinzuzufügen und zu entfernen. Der Wert wird als JSON-Array
 * serialisiert und in einem hidden field gespeichert, damit das umgebende
 * Server-Form-Submit funktioniert.
 *
 * Architektur-Hinweis:
 * Dies ist eine lokale Lösung nur für FACHAERZTE (Pilot-Phase).
 * Falls weitere repeatable groups benötigt werden, sollte dies zu einem
 * generischen System mit globalem Feldtyp refactored werden.
 */

"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Schema für FACHAERZTE
// ---------------------------------------------------------------------------

export type FacharztFieldDefinition = {
  key: string;
  label: string;
  label_en?: string;
  type: "text" | "select" | "textarea";
  required: boolean;
  options?: string[];
  placeholder?: string;
  placeholder_en?: string;
  helperText?: string;
  helperText_en?: string;
};

export const FACHAERZTE_SCHEMA: FacharztFieldDefinition[] = [
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
// Component
// ---------------------------------------------------------------------------

type FacharztEntry = Record<string, string> & {
  _localId: string;
};

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--input-background)",
  fontSize: "1rem",
  fontFamily: "inherit",
  color: "var(--foreground)",
};

function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function RepeatableGroupField({
  questionId,
  language = "de",
  maxEntries = 10,
}: {
  questionId: string;
  language?: "de" | "en";
  maxEntries?: number;
}) {
  const [entries, setEntries] = useState<FacharztEntry[]>([]);

  const addEntry = () => {
    if (entries.length >= maxEntries) return;
    const emptyEntry: FacharztEntry = {
      _localId: generateLocalId(),
    };
    FACHAERZTE_SCHEMA.forEach((field) => {
      emptyEntry[field.key] = "";
    });
    setEntries([...entries, emptyEntry]);
  };

  const removeEntry = (localId: string) => {
    setEntries(entries.filter((entry) => entry._localId !== localId));
  };

  const updateEntry = (localId: string, key: string, value: string) => {
    setEntries(
      entries.map((entry) =>
        entry._localId === localId ? { ...entry, [key]: value } : entry
      )
    );
  };

  const getLabel = (field: FacharztFieldDefinition): string => {
    return language === "en" && field.label_en ? field.label_en : field.label;
  };

  const getPlaceholder = (field: FacharztFieldDefinition): string | undefined => {
    return language === "en" && field.placeholder_en ? field.placeholder_en : field.placeholder;
  };

  const getHelperText = (field: FacharztFieldDefinition): string | undefined => {
    return language === "en" && field.helperText_en ? field.helperText_en : field.helperText;
  };

  const selectPlaceholder = language === "en" ? "— please choose —" : "— bitte wählen —";
  const addButtonLabel =
    language === "en" ? "Add another specialist" : "Weiteren Facharzt hinzufügen";
  const removeButtonLabel = language === "en" ? "Remove" : "Entfernen";
  const entryLabel = language === "en" ? "Entry" : "Eintrag";

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {entries.map((entry, idx) => (
        <div
          key={entry._localId}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            marginBottom: "1rem",
            background: "var(--card)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <strong style={{ fontSize: "1rem" }}>
              {entryLabel} {idx + 1}
            </strong>
            <button
              type="button"
              onClick={() => removeEntry(entry._localId)}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--background)",
                cursor: "pointer",
                color: "var(--destructive)",
              }}
              aria-label={`${removeButtonLabel} ${entryLabel} ${idx + 1}`}
            >
              {removeButtonLabel}
            </button>
          </div>

          {FACHAERZTE_SCHEMA.map((field) => (
            <div key={field.key} style={{ marginBottom: "0.75rem" }}>
              <label
                htmlFor={`${questionId}_${entry._localId}_${field.key}`}
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.95rem",
                  fontWeight: field.required ? "500" : "normal",
                }}
              >
                {getLabel(field)}
                {field.required && (
                  <span style={{ color: "var(--destructive)", marginLeft: "0.2rem" }}>*</span>
                )}
              </label>

              {field.type === "select" ? (
                <select
                  id={`${questionId}_${entry._localId}_${field.key}`}
                  value={entry[field.key] || ""}
                  onChange={(e) => updateEntry(entry._localId, field.key, e.target.value)}
                  required={field.required}
                  style={baseInputStyle}
                >
                  <option value="">{selectPlaceholder}</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={`${questionId}_${entry._localId}_${field.key}`}
                  value={entry[field.key] || ""}
                  onChange={(e) => updateEntry(entry._localId, field.key, e.target.value)}
                  required={field.required}
                  rows={2}
                  placeholder={getPlaceholder(field)}
                  style={{ ...baseInputStyle, resize: "vertical" }}
                />
              ) : (
                <input
                  type="text"
                  id={`${questionId}_${entry._localId}_${field.key}`}
                  value={entry[field.key] || ""}
                  onChange={(e) => updateEntry(entry._localId, field.key, e.target.value)}
                  required={field.required}
                  placeholder={getPlaceholder(field)}
                  style={baseInputStyle}
                />
              )}

              {getHelperText(field) && (
                <small
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    fontSize: "0.85rem",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {getHelperText(field)}
                </small>
              )}
            </div>
          ))}
        </div>
      ))}

      {entries.length < maxEntries && (
        <button
          type="button"
          onClick={addEntry}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          {addButtonLabel}
        </button>
      )}

      {/* Hidden field für Form-Submit */}
      <input
        type="hidden"
        name={questionId}
        value={JSON.stringify(entries.map(({ _localId, ...rest }) => rest))}
      />
    </div>
  );
}
