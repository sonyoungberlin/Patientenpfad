"use client";

import { useEffect, useState } from "react";

const MAX_LENGTH = 300;

/**
 * Praxis-Signatur-Formular (verschoben aus `app/cases/SignatureSection.tsx`).
 *
 * Lädt und speichert die Signatur über `/api/practice/signature` (siehe
 * `app/api/practice/signature/route.ts`). UX/Verhalten entsprechen der
 * bisherigen Account-Signatur-Sektion: Textarea mit 300-Zeichen-Limit,
 * Save-Button (disabled wenn unverändert), Lade- und Save-Feedback.
 *
 * Berechtigung wird vom umgebenden Server-Component-Page geprüft (nur
 * OWNER/ADMIN). Der API-Endpunkt prüft sie zusätzlich serverseitig.
 */
export default function SignatureForm({
  initialSignature,
}: {
  initialSignature: string;
}) {
  const [value, setValue] = useState(initialSignature);
  const [saved, setSaved] = useState(initialSignature);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Falls die Seite mit aktualisierten Server-Daten neu rendert
  // (Router-Refresh), nehmen wir den neuen Initialwert als Quelle der
  // Wahrheit für „Speichern" disabled.
  useEffect(() => {
    setValue(initialSignature);
    setSaved(initialSignature);
  }, [initialSignature]);

  const dirty = value !== saved;

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/practice/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: value }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(data.signature ?? "");
        setValue(data.signature ?? "");
        setFeedback("Gespeichert");
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback(
          typeof data.error === "string"
            ? data.error
            : "Fehler beim Speichern.",
        );
      }
    } catch {
      setFeedback("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_LENGTH) {
            setValue(e.target.value);
          }
        }}
        maxLength={MAX_LENGTH}
        rows={4}
        placeholder={"Mit freundlichen Grüßen\nIhre Hausarztpraxis Mustermann"}
        style={{ maxWidth: "100%", resize: "vertical", width: "100%" }}
      />
      <div
        className="text-muted text-small"
        style={{ marginTop: "0.25rem", marginBottom: "0.5rem" }}
      >
        {value.length}/{MAX_LENGTH} Zeichen
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-primary"
        >
          {saving ? "Speichern …" : "Speichern"}
        </button>
        {feedback && (
          <span
            className="text-small"
            style={{ color: "var(--muted-foreground)" }}
            role="status"
          >
            {feedback}
          </span>
        )}
      </div>
      <p
        className="text-muted text-small"
        style={{ marginTop: "0.5rem", marginBottom: 0 }}
      >
        Wird automatisch bei „Nachricht kopieren" in den Fall-Flows verwendet.
      </p>
    </section>
  );
}
