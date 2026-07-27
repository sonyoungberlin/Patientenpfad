/**
 * Utility: Gespeicherten Antwortwert in ein lesbares Label auflösen.
 *
 * Wird von InternalProtocolEditorClient (M2-Eingabe und Output-Tab) genutzt
 * und ist als separate Funktion exportiert, damit sie in Tests direkt
 * verifiziert werden kann.
 *
 * Kein Import von React oder Browser-APIs.
 */

import type { ProtocolQuestion } from "./questions";
import type { ProtocolWorkflowAnswerValue } from "./workflowAdapter";

/**
 * Prüft ob ein String wie eine technische Option-ID aussieht:
 * ausschließlich Großbuchstaben, Ziffern und Bindestriche, mit mindestens
 * einem Bindestrich und Mindestlänge 4.
 *
 * Normale Freitextantworten enthalten immer Leerzeichen oder Kleinbuchstaben.
 *
 * Beispiele die als technisch erkannt werden:
 *   "POT-Q-C02-01-A", "PC-C01", "PROC-OPT-A"
 * Beispiele die NICHT als technisch erkannt werden:
 *   "Freitext mit Inhalt", "ja nein", "Patient verwiesen"
 */
function looksLikeTechnicalId(s: string): boolean {
  return s.length >= 4 && /^[A-Z0-9][A-Z0-9-]+$/.test(s) && s.includes("-");
}

/**
 * Löst einen gespeicherten Antwortwert zu einem lesbaren Label auf.
 *
 * Regeln:
 * - null / undefined                           → "—"
 * - "YES"                                      → "Ja"
 * - "NO"                                       → "Nein"
 * - "UNCLEAR"                                  → "Unklar"
 * - Array + MULTI_SELECT                       → option.label pro ID, join mit ", "
 * - Array ohne passendes Kontext               → defensiv: technisch aussehende IDs → "Unbekannte Auswahl"
 * - String + SINGLE_SELECT, bekannte ID        → option.label
 * - String + SINGLE_SELECT, unbekannte ID      → "Unbekannte Auswahl"
 * - String + FREE_TEXT                         → Rohwert (Freitext bleibt unverändert)
 * - technisch aussehende ID, fehlender Kontext → "Unbekannte Auswahl"
 * - normaler Freitext ohne Kontext             → Rohwert
 */
export function resolveAnswerLabel(
  question: ProtocolQuestion | undefined,
  value: ProtocolWorkflowAnswerValue,
): string {
  if (value === null || value === undefined) return "—";
  if (value === "YES") return "Ja";
  if (value === "NO") return "Nein";
  if (value === "UNCLEAR") return "Unklar";

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (question?.kind === "MULTI_SELECT") {
      return value
        .map((id) => {
          const opt = question.options.find((o) => o.id === id);
          return opt?.label ?? "Unbekannte Auswahl";
        })
        .join(", ");
    }
    // Kein passender Typ-Kontext: technisch aussehende IDs defensiv abfangen
    return value
      .map((id) => (looksLikeTechnicalId(id) ? "Unbekannte Auswahl" : id))
      .join(", ");
  }

  if (question?.kind === "SINGLE_SELECT") {
    const opt = question.options.find((o) => o.id === value);
    return opt?.label ?? "Unbekannte Auswahl";
  }

  // FREE_TEXT mit Kontext: Rohwert immer zurückgeben
  if (question?.kind === "FREE_TEXT") return value;

  // Kein Kontext oder unpassender Fragetyp:
  // technisch aussehende IDs (nur Großbuchstaben/Ziffern/Bindestriche) abfangen
  if (looksLikeTechnicalId(value)) return "Unbekannte Auswahl";

  // Normale Freitextantwort ohne Kontext
  return value;
}
