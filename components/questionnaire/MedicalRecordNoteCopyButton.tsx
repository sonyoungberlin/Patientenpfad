"use client";

import { useState } from "react";
import { buildAppTextXml } from "@/lib/questionnaire/appTextXml";

type Props = {
  noteText: string;
  sessionId: string;
  xmlFilename?: string | null;
};

export default function MedicalRecordNoteCopyButton({
  noteText,
  sessionId,
  xmlFilename = null,
}: Props) {
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

  function handleXmlDownload() {
    if (!xmlFilename) return;

    const blob = new Blob([buildAppTextXml(noteText)], {
      type: "application/xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = xmlFilename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
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
      {xmlFilename && (
        <button
          type="button"
          onClick={handleXmlDownload}
          className="btn-secondary text-small"
          data-q-download-xml={sessionId}
          style={{ display: "inline-block", width: "fit-content" }}
        >
          XML herunterladen
        </button>
      )}
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
