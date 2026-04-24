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
 * Hinweis-Auflösung:
 * - HINWEIS         → hintText (notwendig)
 * - HINWEIS_OPTIONAL → hintTextOptional ?? hintText (empfohlen, weicher Hinweis)
 * - GEKLAERT         → kein Hinweis
 *
 * Dokumentations-Auflösung:
 * - HINWEIS_OPTIONAL ohne eigenen docText-Eintrag fällt auf docText.HINWEIS zurück.
 *
 * @param profile   - Statisches Anfrageprofil (Kernantwort + Checkpoint-Reihenfolge).
 * @param confirmed - Bestätigte Klärpunkte (GEKLAERT, HINWEIS oder HINWEIS_OPTIONAL).
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
          `Nur bestätigte Checkpoints (GEKLAERT, HINWEIS oder HINWEIS_OPTIONAL) sind zulässig.`,
      );
    }
  }

  const hints: string[] = confirmed
    .filter(
      (cp) =>
        cp.status === InquiryCheckpointStatus.HINWEIS ||
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL,
    )
    .map((cp) => {
      if (cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL) {
        return cp.hintTextOptional ?? cp.hintText;
      }
      return cp.hintText;
    });

  const documentation: string[] = [
    `${profile.label} angefragt.`,
    ...confirmed.map((cp) => {
      // HINWEIS_OPTIONAL may not have its own docText entry – fall back to HINWEIS.
      return (
        cp.docText[cp.status] ??
        cp.docText[InquiryCheckpointStatus.HINWEIS]
      );
    }),
  ];

  return {
    coreAnswer: profile.coreAnswer,
    hints,
    documentation,
  };
}
