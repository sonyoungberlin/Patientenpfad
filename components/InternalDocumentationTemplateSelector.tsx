"use client";

import { useState } from "react";
import type { PracticeDocumentationTemplate } from "@/lib/practice/documentationTemplates";

export default function InternalDocumentationTemplateSelector({
  practiceTemplates,
  onSelect,
  disabled = false,
}: {
  practiceTemplates: PracticeDocumentationTemplate[];
  onSelect: (template: PracticeDocumentationTemplate | null) => void;
  disabled?: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  return (
    <label>
      Vorlage
      <select
        value={selectedId}
        disabled={disabled}
        onChange={(event) => {
          setSelectedId(event.target.value);
          onSelect(practiceTemplates.find((template) => template.id === event.target.value) ?? null);
        }}
        style={{ marginTop: "0.5rem" }}
      >
        <option value="">Keine Vorlage ausgewählt</option>
        {practiceTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
      </select>
    </label>
  );
}
