import type { DocumentationItemType } from "./blockCatalog";

const INVALID_XML_1_0_CHARACTERS = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

export type SemanticDocumentItem = {
  type: DocumentationItemType;
  text: string;
  legacyText?: string;
  includeInStructuredExport?: boolean;
};

export type SemanticDocumentSection = {
  slot: 1 | 2 | 3;
  items: SemanticDocumentItem[];
};

export type SemanticDocument = {
  sections: [SemanticDocumentSection, SemanticDocumentSection, SemanticDocumentSection];
};

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildAppTextXml(noteText: string): string {
  const normalizedText = noteText
    .replace(/\r\n?/g, "\n")
    .replace(INVALID_XML_1_0_CHARACTERS, "");
  const escapedText = escapeXmlText(normalizedText);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<appExport version="1.0"><section id="APP_TEXT">${escapedText}</section></appExport>`;
}

export function buildStructuredAppXml(document: SemanticDocument): string {
  const sections = document.sections.map((section) => {
    const items = section.items
      .filter((item) => item.includeInStructuredExport !== false)
      .map((item) => {
        const text = item.text
          .replace(/\r\n?/g, "\n")
          .replace(INVALID_XML_1_0_CHARACTERS, "");
        return `    <item type="${item.type}">${escapeXmlText(text)}</item>`;
      })
      .join("\n");
    return items.length > 0
      ? `  <section slot="${section.slot}">\n${items}\n  </section>`
      : `  <section slot="${section.slot}"></section>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<appExport version="2.0">\n${sections}\n</appExport>`;
}

export function buildStructuredXmlFilename(filename: string): string {
  return filename.toLowerCase().endsWith(".xml")
    ? `${filename.slice(0, -4)}-v2.xml`
    : `${filename}-v2.xml`;
}