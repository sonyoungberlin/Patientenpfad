"use client";

import { useEffect, useState } from "react";

const MAX_LENGTH = 300;

const INFO_LABELS: Record<number, string> = {
  0: "Info 1",
  1: "Info 2",
  2: "Info 3",
};

type InfoTexts = [string, string, string];

/**
 * Formular zum Bearbeiten der 3 praxisbezogenen Info-Texte für M3.
 *
 * Lädt und speichert über `/api/practice/inquiry-info`.
 * Zeilenumbrüche und einfache Listen mit "-" sind erlaubt.
 * Kein Richtext-Editor – reines Textarea.
 */
export default function InquiryInfoForm({
  initialInfoTexts,
}: {
  initialInfoTexts: InfoTexts;
}) {
  const [values, setValues] = useState<InfoTexts>(initialInfoTexts);
  const [saved, setSaved] = useState<InfoTexts>(initialInfoTexts);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setValues(initialInfoTexts);
    setSaved(initialInfoTexts);
  }, [initialInfoTexts]);

  const dirty = values.some((v, i) => v !== saved[i]);

  function handleChange(index: number, newValue: string) {
    if (newValue.length <= MAX_LENGTH) {
      setValues((prev) => {
        const next: InfoTexts = [...prev] as InfoTexts;
        next[index] = newValue;
        return next;
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    setIsError(false);
    try {
      const res = await fetch("/api/practice/inquiry-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          infoText1: values[0],
          infoText2: values[1],
          infoText3: values[2],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Gespeicherten Zustand auf getrimmt spiegeln (wie Server)
        const trimmed: InfoTexts = values.map((v) => v.trim()) as InfoTexts;
        setSaved(trimmed);
        setValues(trimmed);
        setFeedback("Gespeichert");
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setIsError(true);
        setFeedback(
          typeof data.error === "string" ? data.error : "Fehler beim Speichern.",
        );
      }
    } catch {
      setIsError(true);
      setFeedback("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1.5rem", maxWidth: "42rem" }}>
      {values.map((value, i) => {
        const remaining = MAX_LENGTH - value.length;
        return (
          <div key={i} style={{ display: "grid", gap: "0.4rem" }}>
            <label
              htmlFor={`info-text-${i}`}
              style={{ fontWeight: 600 }}
            >
              {INFO_LABELS[i]}
            </label>
            <textarea
              id={`info-text-${i}`}
              value={value}
              onChange={(e) => handleChange(i, e.target.value)}
              maxLength={MAX_LENGTH}
              rows={4}
              placeholder={`Optionaler Hinweis ${INFO_LABELS[i]} – erscheint in M3 als zuschaltbarer Baustein.\nZeilenumbrüche und Listen mit "-" sind erlaubt.`}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            />
            <p
              className="text-muted"
              style={{ fontSize: "0.8rem", margin: 0, textAlign: "right" }}
            >
              {remaining} / {MAX_LENGTH} Zeichen verbleibend
            </p>
          </div>
        );
      })}

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="btn-primary"
        >
          {saving ? "Speichern …" : "Speichern"}
        </button>

        {feedback && (
          <p
            role={isError ? "alert" : "status"}
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: isError ? "var(--error, #a00)" : "var(--success, #0a6)",
            }}
          >
            {feedback}
          </p>
        )}
      </div>
    </section>
  );
}
