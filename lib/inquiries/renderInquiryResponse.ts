import {
  InquiryCheckpointStatus,
  type ConfirmedInquiryCheckpoint,
  type InquiryOutput,
  type InquiryProfile,
} from "@/lib/inquiries/types";

/**
 * Erzeugt deterministisch den Antworttext und die Dokumentation
 * aus einem bestätigten Satz von Klärpunkten.
 *
 * Invarianten:
 * - Akzeptiert ausschließlich ConfirmedInquiryCheckpoints (kein UNGEKLAERT möglich).
 * - Wirft einen Fehler, wenn ein Checkpoint den Status UNGEKLAERT trägt
 *   (defensiv gegen fehlerhafte Aufrufe mit falschem Typ).
 * - Keine LLM-Logik, kein Netzwerk, keine Seiteneffekte.
 * - Bausteine erscheinen in der Reihenfolge der übergebenen Checkpoints.
 *
 * @param profile  - Statisches Anfrageprofil (Kernantwort + Checkpoint-Reihenfolge).
 * @param confirmed - Bestätigte Klärpunkte (nur GEKLAERT oder HINWEIS).
 * @returns InquiryOutput mit coreAnswer, hints und documentation.
 */
export function renderInquiryResponse(
  profile: InquiryProfile,
  confirmed: ConfirmedInquiryCheckpoint[],
): InquiryOutput {
  // Defensiv-Guard: ConfirmedInquiryCheckpoint schließt UNGEKLAERT typseitig aus,
  // aber wir validieren zur Laufzeit, um Fehler bei unsicheren Casts früh zu fangen.
  for (const cp of confirmed) {
    if ((cp.status as InquiryCheckpointStatus) === InquiryCheckpointStatus.UNGEKLAERT) {
      throw new Error(
        `renderInquiryResponse: Checkpoint "${cp.id}" hat Status UNGEKLAERT. ` +
          `Nur bestätigte Checkpoints (GEKLAERT oder HINWEIS) sind zulässig.`,
      );
    }
  }

  const hints: string[] = confirmed
    .filter((cp) => cp.status === InquiryCheckpointStatus.HINWEIS)
    .map((cp) => cp.hintText);

  const documentation: string[] = [
    `${profile.label} angefragt.`,
    ...confirmed.map((cp) => cp.docText[cp.status]),
  ];

  return {
    coreAnswer: profile.coreAnswer,
    hints,
    documentation,
  };
}
