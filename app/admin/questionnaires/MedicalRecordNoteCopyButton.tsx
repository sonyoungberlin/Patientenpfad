"use client";

import { useState } from "react";

type Props = {
  noteText: string;
  sessionId: string;
};

export default function MedicalRecordNoteCopyButton({ noteText, sessionId }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(noteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in textarea
      const el = document.querySelector<HTMLTextAreaElement>(
        `[data-q-note="${sessionId}"]`,
      );
      if (el) {
        el.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  return (
    <div
      style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}
      data-q-record-note-section={sessionId}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="btn-secondary text-small"
        data-q-copy-note={sessionId}
        style={{ display: "inline-block", width: "fit-content" }}
      >
        {copied ? "Kopiert ✓" : "Krankenblatt-Text kopieren"}
      </button>
      <pre
        data-q-note={sessionId}
        style={{
          margin: 0,
          padding: "0.5rem",
          background: "var(--muted, #f1f5f9)",
          borderRadius: "var(--radius)",
          fontSize: "0.78rem",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          userSelect: "all",
        }}
      >
        {noteText}
      </pre>
    </div>
  );
}
