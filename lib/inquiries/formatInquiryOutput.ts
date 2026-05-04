import type { InquiryResponseV2Output } from "./types";

/**
 * Wandelt einen `InquiryResponseV2Output` in einen Klartext um, der die
 * Patienten-Nachricht in derselben Reihenfolge wiedergibt, wie sie in der
 * M3-Vorschau (`OutputView` in `InquiryM3Client.tsx`) gerendert wird:
 *
 *   1. output.intro
 *   2. pro Section: mainDecision, dann attachedParagraphs
 *   3. output.sharedBottom
 *
 * Leere/`null`/whitespace-only Werte werden übersprungen. Absätze werden
 * mit einer Leerzeile ("\n\n") getrennt. Reine Funktion – keine Seiten-
 * effekte, kein I/O.
 */
export function inquiryOutputToPlainText(output: InquiryResponseV2Output): string {
  const paragraphs: string[] = [];

  const push = (value: string | null | undefined): void => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    paragraphs.push(trimmed);
  };

  push(output.intro);

  for (const section of output.sections) {
    push(section.mainDecision);
    for (const p of section.attachedParagraphs) {
      push(p);
    }
  }

  for (const p of output.sharedBottom) {
    push(p);
  }

  return paragraphs.join("\n\n");
}

/**
 * Wandelt eine Liste von M5-Dokumentationszeilen in einen Klartext um,
 * mit "\n" verbunden. Leere/whitespace-only Zeilen werden übersprungen.
 * Eine leere Eingabe (oder rein leere Zeilen) ergibt einen leeren String.
 */
export function inquiryDocumentationToPlainText(lines: string[]): string {
  return lines
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter((line) => line.length > 0)
    .join("\n");
}
