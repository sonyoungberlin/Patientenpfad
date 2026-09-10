"use client";

import { buildAppTextXml } from "@/lib/questionnaire/appTextXml";

type Props = {
  noteText: string;
  filename: string;
  label?: string;
  sessionId?: string;
};

export default function AppTextXmlDownloadButton({
  noteText,
  filename,
  label = "XML herunterladen",
  sessionId,
}: Props) {
  function handleDownload() {
    const blob = new Blob([buildAppTextXml(noteText)], {
      type: "application/xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="btn-secondary text-small"
      data-q-download-xml={sessionId ?? "true"}
      style={{ display: "inline-block", width: "fit-content" }}
    >
      {label}
    </button>
  );
}