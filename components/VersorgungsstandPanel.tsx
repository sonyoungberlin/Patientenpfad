"use client";

import { Fragment, useMemo, useState } from "react";
import {
  VERSORGUNGSSTAND_SECTIONS,
  getAllVersorgungsstandFields,
} from "@/lib/versorgungsstand/versorgungsstandCatalog";
import type { CarePlanField } from "@/lib/carePlan/carePlanCatalog";
import {
  buildVersorgungsstandText,
  type VersorgungsstandAnswers,
} from "@/lib/versorgungsstand/buildVersorgungsstandText";
import CopyTextButton from "@/components/inquiries/CopyTextButton";

const MAX_THEMA = 6;
const MAX_FACHARZT = 6;

function buildInitialAnswers(): VersorgungsstandAnswers {
  const initial: VersorgungsstandAnswers = {};
  for (const field of getAllVersorgungsstandFields()) {
    initial[field.id] = field.kind === "checkbox" ? false : "";
  }
  return initial;
}

// ---------------------------------------------------------------------------
// Felddarstellung (analog VersorgungsplanPanel, bewusst nicht shared)
// ---------------------------------------------------------------------------

type FieldProps = {
  field: CarePlanField;
  value: string | boolean;
  onChange: (id: string, value: string | boolean) => void;
};

function VersorgungsstandFieldInput({ field, value, onChange }: FieldProps) {
  const id = `vs-${field.id}`;

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
        <label htmlFor={id} style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
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
        <label htmlFor={id} style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
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
      <label htmlFor={id} style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
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
// Hilfskomponente: rowGroup-Block
// ---------------------------------------------------------------------------

type GroupBlockProps = {
  groupId: string;
  groupLabel: string;
  fields: readonly CarePlanField[];
  answers: VersorgungsstandAnswers;
  onChange: (id: string, value: string | boolean) => void;
};

function GroupBlock({ groupLabel, fields, answers, onChange }: GroupBlockProps) {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "6px",
        padding: "0.75rem",
        marginBottom: "0.75rem",
        background: "#fafafa",
      }}
    >
      <p style={{ fontWeight: 600, fontSize: "0.8125rem", margin: "0 0 0.5rem", color: "#444" }}>
        {groupLabel}
      </p>
      {fields.map((field) => (
        <VersorgungsstandFieldInput
          key={field.id}
          field={field}
          value={answers[field.id] ?? (field.kind === "checkbox" ? false : "")}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function VersorgungsstandPanel() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<VersorgungsstandAnswers>(buildInitialAnswers);
  const [visibleThemaCount, setVisibleThemaCount] = useState(2);
  const [visibleFacharztCount, setVisibleFacharztCount] = useState(2);

  function handleChange(id: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleReset() {
    setAnswers(buildInitialAnswers());
    setVisibleThemaCount(2);
    setVisibleFacharztCount(2);
  }

  const previewText = useMemo(() => buildVersorgungsstandText(answers), [answers]);
  const isEmpty = previewText === "Versorgungsstand" || previewText.trim() === "";

  return (
    <section className="card" style={{ marginTop: "2rem" }}>
      <h2 style={{ marginBottom: open ? "1rem" : 0 }}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="versorgungsstand-content"
          onClick={() => setOpen((v) => !v)}
          style={{
            all: "unset",
            outline: "revert",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            width: "100%",
          }}
        >
          Versorgungsstand
          <span aria-hidden="true">{open ? "▲" : "▼"}</span>
        </button>
      </h2>

      {open && (
        <div id="versorgungsstand-content">
          <p className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Datierter Ist-Stand des aktuellen Kenntnis- und Klärungsstands – kein PDF, keine
            Speicherung. Ausgefüllten Stand über den Copy-Button in die Zwischenablage kopieren.
          </p>

          <div style={{ display: "grid", gap: "1.5rem" }}>
            {VERSORGUNGSSTAND_SECTIONS.map((section) => {
              const processedGroups = new Set<string>();

              return (
                <fieldset
                  key={section.id}
                  style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "1rem" }}
                >
                  <legend style={{ fontWeight: 600, padding: "0 0.25rem" }}>
                    {section.title}
                  </legend>
                  <div style={{ marginTop: "0.5rem" }}>
                    {section.fields.map((field) => {
                      // Sichtbarkeitsfilter: Thema-Slots
                      if (field.rowGroup?.startsWith("thema_")) {
                        const n = parseInt(field.rowGroup.replace("thema_", ""), 10);
                        if (n > visibleThemaCount) return null;
                      }
                      // Sichtbarkeitsfilter: Facharzt-Slots
                      if (field.rowGroup?.startsWith("fa_")) {
                        const n = parseInt(field.rowGroup.replace("fa_", ""), 10);
                        if (n > visibleFacharztCount) return null;
                      }

                      // rowGroup: nur beim ersten Feld rendern
                      if (field.rowGroup) {
                        if (processedGroups.has(field.rowGroup)) return null;
                        processedGroups.add(field.rowGroup);
                        const groupFields = section.fields.filter(
                          (f) => f.rowGroup === field.rowGroup,
                        );
                        const groupLabel = field.rowGroupLabel ?? field.rowGroup;
                        return (
                          <Fragment key={field.rowGroup}>
                            <GroupBlock
                              groupId={field.rowGroup}
                              groupLabel={groupLabel}
                              fields={groupFields}
                              answers={answers}
                              onChange={handleChange}
                            />
                            {/* "Weiteres hinzufügen"-Buttons nach dem letzten sichtbaren Slot */}
                            {field.rowGroup === `thema_${visibleThemaCount}` &&
                              visibleThemaCount < MAX_THEMA && (
                                <button
                                  type="button"
                                  onClick={() => setVisibleThemaCount((v) => Math.min(v + 1, MAX_THEMA))}
                                  style={{
                                    fontSize: "0.875rem",
                                    background: "none",
                                    border: "1px dashed #aaa",
                                    borderRadius: "4px",
                                    padding: "0.3rem 0.75rem",
                                    cursor: "pointer",
                                    marginBottom: "0.75rem",
                                    color: "#555",
                                  }}
                                >
                                  + weiteres medizinisches Thema
                                </button>
                              )}
                            {field.rowGroup === `fa_${visibleFacharztCount}` &&
                              visibleFacharztCount < MAX_FACHARZT && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisibleFacharztCount((v) => Math.min(v + 1, MAX_FACHARZT))
                                  }
                                  style={{
                                    fontSize: "0.875rem",
                                    background: "none",
                                    border: "1px dashed #aaa",
                                    borderRadius: "4px",
                                    padding: "0.3rem 0.75rem",
                                    cursor: "pointer",
                                    marginBottom: "0.75rem",
                                    color: "#555",
                                  }}
                                >
                                  + weiteren Facharzt hinzufügen
                                </button>
                              )}
                          </Fragment>
                        );
                      }

                      return (
                        <VersorgungsstandFieldInput
                          key={field.id}
                          field={field}
                          value={answers[field.id] ?? (field.kind === "checkbox" ? false : "")}
                          onChange={handleChange}
                        />
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
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

          {/* Aktionsleiste */}
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
              label="Versorgungsstand kopieren"
              text={isEmpty ? "" : previewText}
              data-testid="copy-versorgungsstand"
            />
            <button
              type="button"
              onClick={handleReset}
              style={{
                fontSize: "0.875rem",
                background: "none",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "0.25rem 0.75rem",
                cursor: "pointer",
              }}
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
