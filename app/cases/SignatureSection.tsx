"use client";

import { useEffect, useState } from "react";

const MAX_LENGTH = 300;

export default function SignatureSection() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/signature")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setValue(data.signature ?? "");
          setSaved(data.signature ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dirty = value !== saved;

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/account/signature", {
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
        setFeedback("Fehler beim Speichern.");
      }
    } catch {
      setFeedback("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section
      className="section-divider"
      style={{ marginTop: "2rem", paddingTop: "1.5rem" }}
    >
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
        Nachrichtensignatur
      </h2>
      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_LENGTH) {
            setValue(e.target.value);
          }
        }}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder={"Mit freundlichen Grüßen\nIhre Hausarztpraxis Mustermann"}
        style={{ maxWidth: "100%", resize: "vertical" }}
      />
      <div
        className="text-muted text-small"
        style={{ marginTop: "0.25rem", marginBottom: "0.5rem" }}
      >
        {value.length}/{MAX_LENGTH} Zeichen
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-primary"
        >
          {saving ? "Speichern …" : "Speichern"}
        </button>
        {feedback && (
          <span className="text-small" style={{ color: "var(--muted-foreground)" }}>
            {feedback}
          </span>
        )}
      </div>
      <p
        className="text-muted text-small"
        style={{ marginTop: "0.5rem", marginBottom: 0 }}
      >
        Wird automatisch bei „Nachricht kopieren" verwendet.
      </p>
    </section>
  );
}
