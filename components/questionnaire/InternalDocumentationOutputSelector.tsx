"use client";

import { useState } from "react";
import type { SemanticDocument } from "@/lib/questionnaire/appTextXml";
import AppTextXmlDownloadButton from "./AppTextXmlDownloadButton";
import MedicalRecordNoteCopyButton from "./MedicalRecordNoteCopyButton";

export type InternalDocumentationOutput = {
  id: string;
  label: string;
  noteText: string;
  semanticDocument: SemanticDocument;
};

export default function InternalDocumentationOutputSelector({
  outputs,
  sessionId,
  filename,
}: {
  outputs: InternalDocumentationOutput[];
  sessionId: string;
  filename: string;
}) {
  const [selectedId, setSelectedId] = useState(outputs[0]?.id ?? "");
  const selected = outputs.find((output) => output.id === selectedId);
  if (outputs.length === 0) return null;

  return (
    <section data-q-output-variants={sessionId} style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
      <label>
        Dokumentausgabe
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} data-q-output-variant-select={sessionId}>
          {outputs.map((output) => <option key={output.id} value={output.id}>{output.label}</option>)}
        </select>
      </label>
      {selected && <>
        <pre data-q-output-preview={selected.id} style={{ whiteSpace: "pre-wrap", font: "inherit", margin: 0 }}>
          {selected.noteText}
        </pre>
        <MedicalRecordNoteCopyButton
          sessionId={`${sessionId}-${selected.id}`}
          noteText={selected.noteText}
          label={`${selected.label}-Text kopieren`}
        />
        <AppTextXmlDownloadButton
          noteText={selected.noteText}
          filename={filename.replace(/\.xml$/i, `-${selected.id}.xml`)}
          label={`${selected.label} als XML herunterladen`}
          sessionId={`${sessionId}-${selected.id}`}
          semanticDocument={selected.semanticDocument}
        />
      </>}
    </section>
  );
}