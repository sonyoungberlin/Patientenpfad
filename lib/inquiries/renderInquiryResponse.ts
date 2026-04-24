import {
  InquiryCheckpointStatus,
  ResponseKind,
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

  // Grouped hints: each hint is placed into the bucket matching its responseKind.
  // For HINWEIS_OPTIONAL, responseKindOptional takes precedence if defined.
  const groupedHints: InquiryOutput["groupedHints"] = {
    voraussetzungen: [],
    aktionen: [],
    vorbereitungen: [],
    infos: [],
    ablehnungen: [],
  };

  confirmed
    .filter(
      (cp) =>
        cp.status === InquiryCheckpointStatus.HINWEIS ||
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL,
    )
    .forEach((cp) => {
      const hintText =
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL
          ? (cp.hintTextOptional ?? cp.hintText)
          : cp.hintText;
      const kind =
        cp.status === InquiryCheckpointStatus.HINWEIS_OPTIONAL
          ? (cp.responseKindOptional ?? cp.responseKind)
          : cp.responseKind;

      switch (kind) {
        case ResponseKind.VORAUSSETZUNG:
          groupedHints.voraussetzungen.push(hintText);
          break;
        case ResponseKind.AKTION:
          groupedHints.aktionen.push(hintText);
          break;
        case ResponseKind.VORBEREITUNG:
          groupedHints.vorbereitungen.push(hintText);
          break;
        case ResponseKind.ABLEHNUNG_ALTERNATIVE:
          groupedHints.ablehnungen.push(hintText);
          break;
        case ResponseKind.INFO:
        case ResponseKind.AKTENNOTIZ:
        default:
          groupedHints.infos.push(hintText);
          break;
      }
    });

  // paragraphs: flat sorted list – Voraussetzungen → Aktionen → Vorbereitungen → Infos → Ablehnungen.
  const paragraphs: string[] = [
    ...groupedHints.voraussetzungen,
    ...groupedHints.aktionen,
    ...groupedHints.vorbereitungen,
    ...groupedHints.infos,
    ...groupedHints.ablehnungen,
  ];

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
    groupedHints,
    paragraphs,
    documentation,
  };
}
