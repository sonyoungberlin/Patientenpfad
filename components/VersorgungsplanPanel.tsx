"use client";

/**
 * VersorgungsplanPanel
 *
 * Internes Formular für den „Persönlichen Versorgungsplan V1".
 *
 * Scope-Grenzen:
 *   - Kein API-Aufruf, kein Prisma, keine Persistenz
 *   - Keine Kopplung an Checkpoints, Questionnaires oder CaseSession
 *   - Nur Copy/Paste-Output
 *   - Ausschließlich für die interne Arzt/Praxis-Seite (M3-Page)
 */

import { useMemo, useState, Fragment } from "react";
import {
  CARE_PLAN_SECTIONS,
  getAllCarePlanFields,
  type CarePlanField,
} from "@/lib/carePlan/carePlanCatalog";
import {
  buildCarePlanText,
  type CarePlanAnswers,
} from "@/lib/carePlan/buildCarePlanText";
import CopyTextButton from "@/components/inquiries/CopyTextButton";

// ---------------------------------------------------------------------------
// State-Initialisierung
// ---------------------------------------------------------------------------

function buildInitialAnswers(): CarePlanAnswers {
  const initial: CarePlanAnswers = {};
  for (const field of getAllCarePlanFields()) {
    if (field.kind === "checkbox") {
      initial[field.id] = false;
    } else {
      initial[field.id] = "";
    }
  }
  return initial;
}

// ---------------------------------------------------------------------------
// Teilkomponenten
// ---------------------------------------------------------------------------

type FieldProps = {
  field: CarePlanField;
  value: string | boolean;
  onChange: (id: string, value: string | boolean) => void;
};

function CarePlanFieldInput({ field, value, onChange }: FieldProps) {
  const id = `care-plan-${field.id}`;

  if (field.kind === "checkbox") {
    return (
      <label
        htmlFor={id}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          cursor: "pointer",
          marginBottom: "0.25rem",
          lineHeight: 1.4,
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(field.id, e.target.checked)}
          style={{ marginTop: "0.15rem", flexShrink: 0 }}
        />
        <span style={{ fontSize: "0.875rem" }}>{field.label}</span>
      </label>
    );
  }

  if (field.kind === "textarea") {
    return (
      <div style={{ marginBottom: "0.5rem" }}>
        <label
          htmlFor={id}
          style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}
        >
          {field.label}
        </label>
        <textarea
          id={id}
          rows={3}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder ?? ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        />
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <div style={{ marginBottom: "0.5rem" }}>
        <label
          htmlFor={id}
          style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}
        >
          {field.label}
        </label>
        <select
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="">– bitte wählen –</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // text | date
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}
      >
        {field.label}
      </label>
      <input
        id={id}
        type={field.kind === "date" ? "date" : "text"}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder ?? ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function VersorgungsplanPanel() {
  const [answers, setAnswers] = useState<CarePlanAnswers>(buildInitialAnswers);

  function handleChange(id: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleReset() {
    setAnswers(buildInitialAnswers());
  }

  const previewText = useMemo(() => buildCarePlanText(answers), [answers]);
  const isEmpty = previewText === "Persönlicher Versorgungsplan";

  return (
    <section className="card" style={{ marginTop: "2rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>Persönlicher Versorgungsplan</h2>
      <p
        className="text-muted"
        style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}
      >
        Interne Dokumentation für Arzt / Praxis – kein PDF, keine Speicherung.
        Ausgefüllten Plan über den Copy-Button in die Zwischenablage kopieren.
      </p>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {CARE_PLAN_SECTIONS.map((section) => (
          <fieldset
            key={section.id}
            style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "1rem" }}
          >
            <legend style={{ fontWeight: 600, padding: "0 0.25rem" }}>
              {section.title}
            </legend>
            <div style={{ marginTop: "0.5rem" }}>
              {section.fields.map((field) => (
                <Fragment key={field.id}>
                  {field.rowGroupLabel && (
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        margin: "0.75rem 0 0.25rem",
                        color: "#555",
                      }}
                    >
                      {field.rowGroupLabel}
                    </p>
                  )}
                  <CarePlanFieldInput
                    field={field}
                    value={answers[field.id] ?? (field.kind === "checkbox" ? false : "")}
                    onChange={handleChange}
                  />
                </Fragment>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Vorschau */}
      {!isEmpty && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Vorschau</h3>
          <pre
            style={{
              background: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "0.75rem",
              fontSize: "0.8125rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {previewText}
          </pre>
        </div>
      )}

      {/* Aktions-Leiste */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginTop: "1rem",
          flexWrap: "wrap",
        }}
      >
        <CopyTextButton
          label="Versorgungsplan kopieren"
          text={isEmpty ? "" : previewText}
          data-testid="copy-versorgungsplan"
        />
        <button
          type="button"
          onClick={handleReset}
          style={{ fontSize: "0.875rem", background: "none", border: "1px solid #ccc", borderRadius: "4px", padding: "0.25rem 0.75rem", cursor: "pointer" }}
        >
          Zurücksetzen
        </button>
      </div>
    </section>
  );
}
