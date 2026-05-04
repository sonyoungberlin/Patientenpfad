"use client";

import { useState } from "react";

type Props = {
  /** Klartext, der in die Zwischenablage geschrieben wird. */
  text: string;
  /** Beschriftung des Buttons im Ruhezustand (z. B. "Nachricht kopieren"). */
  label: string;
  /** Optionales `data-testid` für stabile Test-Selektoren. */
  "data-testid"?: string;
};

/**
 * Generischer Copy-Button: schreibt `text` via `navigator.clipboard.writeText`
 * in die Zwischenablage und zeigt für ~2 s "Kopiert ✓" an. Rendert kein
 * eigenes Preview-Markup (Vorschau bleibt Sache des aufrufenden Codes).
 *
 * Der Button ist deaktiviert, wenn `text` leer ist.
 */
export default function CopyTextButton({
  text,
  label,
  "data-testid": dataTestId,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    if (!text) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich.");
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!text}
        data-testid={dataTestId}
        style={{ fontSize: "0.875rem" }}
      >
        {copied ? "Kopiert ✓" : label}
      </button>
      {error && (
        <span className="text-muted" style={{ fontSize: "0.875rem" }}>
          {error}
        </span>
      )}
    </span>
  );
}
