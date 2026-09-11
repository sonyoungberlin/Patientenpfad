"use client";

import {
  buildAppTextXml,
  buildStructuredAppXml,
  buildStructuredXmlFilename,
  type SemanticDocument,
} from "@/lib/questionnaire/appTextXml";

type Props = {
  noteText: string;
  filename: string;
  label?: string;
  sessionId?: string;
  semanticDocument?: SemanticDocument | null;
};

export default function AppTextXmlDownloadButton({
  noteText,
  filename,
  label = "XML herunterladen",
  sessionId,
  semanticDocument = null,
}: Props) {
  function downloadXml(content: string, downloadFilename: string) {
    const blob = new Blob([content], {
      type: "application/xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = downloadFilename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => downloadXml(buildAppTextXml(noteText), filename)}
        className="btn-secondary text-small"
        data-q-download-xml={sessionId ?? "true"}
        style={{ display: "inline-block", width: "fit-content" }}
      >
        {label}
      </button>
      {semanticDocument ? (
        <button
          type="button"
          onClick={() => downloadXml(
            buildStructuredAppXml(semanticDocument),
            buildStructuredXmlFilename(filename),
          )}
          className="btn-secondary text-small"
          data-q-download-xml-v2={sessionId ?? "true"}
          style={{ display: "inline-block", width: "fit-content" }}
        >
          Strukturiertes XML v2 herunterladen
        </button>
      ) : null}
    </>
  );
}