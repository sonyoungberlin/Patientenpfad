"use client";

import { useState } from "react";
import { evaluateOfficeWriteModules, renderOfficeWriteTemplate } from "@/lib/office/writeRenderer";
import { OFFICE_WRITE_TEMPLATES } from "@/lib/office/writeModules";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import type { OfficeCheckpointSnapshot } from "@/lib/office/types";

type Props = {
  topicId: string | null;
  checkpoints: OfficeCheckpointSnapshot[];
};

export default function OfficeWritePanel({ topicId, checkpoints }: Props) {
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});

  if (!topicId) return null;

  const allModules = evaluateOfficeWriteModules({ topicId, checkpoints });

  // Panel nur für Topics anzeigen, für die überhaupt Templates registriert sind
  const relevantModules = allModules.filter((m) => {
    const tpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === m.templateId);
    return (
      tpl &&
      (tpl.trigger.topicIds.length === 0 ||
        tpl.trigger.topicIds.includes(topicId))
    );
  });

  if (relevantModules.length === 0) return null;

  const available = relevantModules.filter((m) => m.isAvailable);
  const unavailable = relevantModules.filter((m) => !m.isAvailable);

  const activeTemplate = activeTemplateId
    ? OFFICE_WRITE_TEMPLATES.find((t) => t.id === activeTemplateId) ?? null
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
    const previewText = renderOfficeWriteTemplate(activeTemplate, formInputs);
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
              ) : field.kind === "select" && field.options ? (
                <select
                  id={`write-${field.key}`}
                  value={formInputs[field.key] ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  <option value="">– Bitte wählen –</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
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
      <h2 style={{ marginTop: 0 }}>Jetzt weiterarbeiten</h2>

      {available.length > 0 && (
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
      )}

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
