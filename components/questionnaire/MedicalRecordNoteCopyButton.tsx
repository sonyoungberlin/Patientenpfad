"use client";

import { useEffect, useState } from "react";

type Props = {
  noteText: string;
  sessionId: string;
  label?: string;
};

export default function MedicalRecordNoteCopyButton({
  noteText,
  sessionId,
  label = "Krankenblatt-Text kopieren",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [noteText]);

  async function handleCopy() {
    setCopyError(false);
    if (!noteText.trim()) return;
    try {
      await navigator.clipboard.writeText(noteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text content from a hidden textarea.
      const el = document.querySelector(
        `[data-q-note="${sessionId}"]`,
      ) as HTMLTextAreaElement | null;
      try {
        if (!el) throw new Error("Kopierfeld fehlt.");
        el.focus();
        el.select();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const successful = document.execCommand("copy");
        el.blur();
        if (!successful) throw new Error("Kopieren fehlgeschlagen.");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopyError(true);
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
        disabled={!noteText.trim()}
        style={{ display: "inline-block", width: "fit-content" }}
      >
        {copied ? "Kopiert" : label}
      </button>
      {copyError && <p role="alert" className="text-error text-small" style={{ margin: 0 }}>
        Kopieren fehlgeschlagen. Bitte den Text markieren und manuell kopieren.
      </p>}
      <textarea
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        data-q-note={sessionId}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
        value={noteText}
      />
    </div>
  );
}
