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
      // Fallback: select text content from a hidden textarea.
      const el = document.querySelector(
        `[data-q-note="${sessionId}"]`,
      ) as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.select();
        // Legacy fallback for browsers without Clipboard API support
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand("copy");
        el.blur();
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
