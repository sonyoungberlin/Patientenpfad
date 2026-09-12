"use client";

import {
  INTERNAL_DOCUMENT_TITLE_MAX_LENGTH,
  INTERNAL_DOCUMENT_TITLE_OPTIONS,
  type InternalDocumentTitleOption,
} from "@/lib/questionnaire/internalDocumentTitle";

type Props = {
  option: InternalDocumentTitleOption | "";
  customTitle: string;
  onOptionChange: (option: InternalDocumentTitleOption | "") => void;
  onCustomTitleChange: (title: string) => void;
  disabled?: boolean;
};

const fieldStyle = {
  display: "block",
  width: "100%",
  maxWidth: "22rem",
  font: "inherit",
  color: "var(--foreground)",
  background: "var(--input-background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "0.5rem 0.75rem",
};

export default function InternalDocumentTitleField({
  option,
  customTitle,
  onOptionChange,
  onCustomTitleChange,
  disabled = false,
}: Props) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
      <label>
        Dokumenttitel
        <select
          required
          value={option}
          disabled={disabled}
          onChange={(event) => {
            const nextOption = event.target.value as InternalDocumentTitleOption | "";
            onOptionChange(nextOption);
            if (nextOption !== "andere") onCustomTitleChange("");
          }}
          style={{ ...fieldStyle, marginTop: "0.5rem" }}
        >
          <option value="">Bitte auswählen</option>
          {INTERNAL_DOCUMENT_TITLE_OPTIONS.map((titleOption) => (
            <option key={titleOption.value} value={titleOption.value}>
              {titleOption.label}
            </option>
          ))}
        </select>
      </label>
      {option === "andere" ? (
        <label>
          Individueller Dokumenttitel
          <input
            type="text"
            required
            maxLength={INTERNAL_DOCUMENT_TITLE_MAX_LENGTH}
            value={customTitle}
            disabled={disabled}
            onChange={(event) => onCustomTitleChange(event.target.value)}
            style={{ marginTop: "0.5rem" }}
          />
        </label>
      ) : null}
    </fieldset>
  );
}