"use client";

import { useState } from "react";
import {
  evaluatePatientWriteModules,
  renderPatientWriteTemplate,
} from "@/lib/patientWrite/writeRenderer";
import { PATIENT_WRITE_TEMPLATES } from "@/lib/patientWrite/writeModules";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import type { ActiveCheckpoint } from "@/lib/types";

type Props = {
  checkpoints: ActiveCheckpoint[];
};

export default function PatientWritePanel({ checkpoints }: Props) {
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});

  const allModules = evaluatePatientWriteModules({ checkpoints });
  const available = allModules.filter((m) => m.isAvailable);
  const unavailable = allModules.filter((m) => !m.isAvailable);

  // Panel nur anzeigen wenn mindestens ein Template verfügbar ist.
  if (available.length === 0) return null;

  const activeTemplate = activeTemplateId
    ? PATIENT_WRITE_TEMPLATES.find((t) => t.id === activeTemplateId) ?? null
    : null;

  function handleOpen(templateId: string) {
    setActiveTemplateId(templateId);
    setFormInputs({});
  }

  function handleBack() {
    setActiveTemplateId(null);
    setFormInputs({});
  }

  function handleFieldChange(key: string, value: string) {
    setFormInputs((prev) => ({ ...prev, [key]: value }));
  }

  // ── Formular + Preview ──────────────────────────────────────────────────
  if (activeTemplate) {
    const previewText = renderPatientWriteTemplate(activeTemplate, formInputs);
    return (
      <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleBack}
            aria-label="Zurück zur Liste"
          >
            ← Zurück
          </button>
          <h2 style={{ margin: 0 }}>{activeTemplate.label}</h2>
        </div>

        <div style={{ display: "grid", gap: "0.6rem" }}>
          {activeTemplate.inputSchema.map((field) => (
            <div key={field.key} style={{ display: "grid", gap: "0.2rem" }}>
              <label
                className="text-small"
                htmlFor={`write-${field.key}`}
                style={{ fontWeight: 600 }}
              >
                {field.label}
                {!field.required && (
                  <span className="text-muted" style={{ fontWeight: 400 }}>
                    {" "}
                    (optional)
                  </span>
                )}
              </label>
              {field.kind === "multiline" ? (
                <textarea
                  id={`write-${field.key}`}
                  value={formInputs[field.key] ?? ""}
                  placeholder={field.placeholder}
                  rows={4}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              ) : (
                <input
                  id={`write-${field.key}`}
                  type="text"
                  value={formInputs[field.key] ?? ""}
                  placeholder={
                    field.kind === "date" ? "TT.MM.JJJJ" : field.placeholder
                  }
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid #e3e8ef",
            paddingTop: "0.75rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <div
            className="text-small text-muted"
            style={{ fontWeight: 600 }}
          >
            Vorschau
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontSize: "0.85em",
              backgroundColor: "#f5f7fa",
              padding: "0.75rem",
              borderRadius: "0.35rem",
            }}
          >
            {previewText}
          </pre>
          <CopyTextButton label="Text kopieren" text={previewText} />
        </div>
      </section>
    );
  }

  // ── Listenansicht ───────────────────────────────────────────────────────
  return (
    <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
      <h2 style={{ marginTop: 0 }}>Jetzt vorbereiten</h2>

      <div style={{ display: "grid", gap: "0.4rem" }}>
        <div
          className="text-small text-muted"
          style={{ fontWeight: 600 }}
        >
          Jetzt möglich
        </div>
        {available.map((module) => (
          <div
            key={module.templateId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              padding: "0.5rem 0.6rem",
              border: "1px solid #d8e0ea",
              borderRadius: "0.35rem",
            }}
          >
            <span className="text-small" style={{ fontWeight: 500 }}>
              {module.label}
            </span>
            <button
              type="button"
              onClick={() => handleOpen(module.templateId)}
            >
              Vorbereiten
            </button>
          </div>
        ))}
      </div>

      {unavailable.length > 0 && (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <div
            className="text-small text-muted"
            style={{ fontWeight: 600 }}
          >
            Noch nicht möglich
          </div>
          {unavailable.map((module) => (
            <div
              key={module.templateId}
              style={{
                display: "grid",
                gap: "0.15rem",
                padding: "0.5rem 0.6rem",
                border: "1px solid #e3e8ef",
                borderRadius: "0.35rem",
                opacity: 0.7,
              }}
            >
              <span className="text-small" style={{ fontWeight: 500 }}>
                {module.label}
              </span>
              {module.unavailableReason && (
                <span className="text-small text-muted">
                  {module.unavailableReason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
