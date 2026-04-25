import {
  InquiryCheckpointStatus,
  InquiryCheckpointPlacement,
  ActionStatus,
  ResponseKind,
  type ConfirmedInquiryCheckpoint,
  type InquiryOutput,
  type InquiryProfile,
  type InquirySection,
  type InquirySectionOutput,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

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

// ---------------------------------------------------------------------------
// Neue Architektur – renderInquiryResponseFromSections
// ---------------------------------------------------------------------------

/**
 * Erzeugt deterministisch den strukturierten Antworttext und die Dokumentation
 * aus einem oder mehreren Anliegen-Abschnitten (Sections) nach der neuen Architektur.
 *
 * Regeln:
 * - ATTACHED-Checkpoints werden pro Abschnitt ausgegeben.
 * - SHARED_BOTTOM-Checkpoints werden gesammelt und einmal dedupliziert unten ausgegeben.
 * - Ein Checkpoint-Text erscheint nur, wenn der Status einen Text in textByStatus hat.
 * - ACTION-Checkpoints mit Status INACTIVE werden übersprungen.
 * - Globale Checkpoints werden über mehrere Sections hinweg nur einmal in sharedBottom aufgeführt.
 * - Keine LLM-Logik, kein Netzwerk, keine Seiteneffekte.
 *
 * @param sections – Eine Section pro Anliegen mit Entscheidungsstatus und Checkpoint-Statuses.
 * @returns InquiryResponseV2Output mit sections, sharedBottom und documentation.
 */
export function renderInquiryResponseFromSections(
  sections: InquirySection[],
): InquiryResponseV2Output {
  const sectionOutputs: InquirySectionOutput[] = [];
  const sharedBottomTexts: string[] = [];
  const sharedBottomSeen = new Set<string>();
  const allDocumentation: string[] = [];

  for (const section of sections) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[section.inquiryId];
    if (!profile) {
      throw new Error(
        `renderInquiryResponseFromSections: Kein Profil für Anliegen "${section.inquiryId}" gefunden.`,
      );
    }

    const attachedParagraphs: string[] = [];
    const sectionDocumentation: string[] = [];

    // Geordnete Checkpoint-IDs: decision → specific → boundGlobals
    const orderedIds = [
      profile.decisionCheckpointId,
      ...profile.specificCheckpointIds,
      ...profile.boundGlobalCheckpointIds,
    ];

    for (const checkpointId of orderedIds) {
      const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId];
      if (!checkpoint) continue;

      const status =
        checkpointId === profile.decisionCheckpointId
          ? section.decisionStatus
          : section.checkpointStatuses[checkpointId];

      if (status === undefined) continue;

      // ACTION INACTIVE → überspringen
      if (status === ActionStatus.INACTIVE) continue;

      const text = checkpoint.textByStatus[status];
      if (!text) continue;

      const docText =
        (checkpoint.docByStatus?.[status]) ?? text;

      if (checkpoint.placement === InquiryCheckpointPlacement.ATTACHED) {
        attachedParagraphs.push(text);
        sectionDocumentation.push(`${checkpoint.label}: ${docText}`);
      } else {
        // SHARED_BOTTOM – dedupliziert
        if (!sharedBottomSeen.has(checkpointId)) {
          sharedBottomSeen.add(checkpointId);
          sharedBottomTexts.push(text);
        }
      }
    }

    // Verfügbare Aktionen (availableActionIds) in SHARED_BOTTOM einmalig ausgeben
    for (const actionId of profile.availableActionIds) {
      const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[actionId];
      if (!checkpoint) continue;

      const status = section.checkpointStatuses[actionId];
      if (status === undefined || status === ActionStatus.INACTIVE) continue;

      const text = checkpoint.textByStatus[status];
      if (!text) continue;

      if (
        checkpoint.placement === InquiryCheckpointPlacement.SHARED_BOTTOM &&
        !sharedBottomSeen.has(actionId)
      ) {
        sharedBottomSeen.add(actionId);
        sharedBottomTexts.push(text);
      }
    }

    sectionOutputs.push({
      inquiryId: section.inquiryId,
      label: profile.label,
      attachedParagraphs,
      documentation: sectionDocumentation,
    });

    allDocumentation.push(...sectionDocumentation);
  }

  return {
    sections: sectionOutputs,
    sharedBottom: sharedBottomTexts,
    documentation: allDocumentation,
  };
}
