const INVALID_XML_1_0_CHARACTERS = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

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