/**
 * Service-Skeletons für den Anfrage-Assistenten.
 *
 * Enthält nur Typen und reine Hilfsfunktionen – keine DB-Schreiblogik.
 * Die tatsächliche Persistenz über prisma.inquirySession wird in einem
 * späteren Schritt ergänzt, wenn UI/API-Routes gebaut werden.
 *
 * Vollständig isoliert von CaseSession/Verordnungslogik.
 */

import {
  DecisionStatus,
  type InquirySection,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";

// ---------------------------------------------------------------------------
// Input-Typen
// ---------------------------------------------------------------------------

/**
 * Eingabedaten zum Anlegen einer neuen InquirySession (DRAFT).
 *
 * Alle Felder sind optional, da die Session schrittweise befüllt wird.
 */
export type CreateInquirySessionInput = {
  /** Optionale Account-ID des erstellenden Nutzers. */
  ownerAccountId?: string;
  /** Liste der vom Nutzer gewählten Anliegen-IDs (z. B. ["AU"]). */
  selectedInquiryIds?: string[];
};

/**
 * Eingabe zum Aktualisieren von Checkpoint-Statuses innerhalb einer Session.
 */
export type UpdateCheckpointStatusesInput = {
  sessionId: string;
  /**
   * Vollständige Checkpoint-Statuses der Session.
   * Wird als JSON-Blob gespeichert; kein partielles Merge.
   */
  checkpointStatuses: Record<string, string>;
  actionStatuses?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen (stateless, keine DB-Aufrufe)
// ---------------------------------------------------------------------------

/**
 * Erzeugt den initialen Sections-Snapshot aus einer Liste von Anliegen-IDs.
 *
 * Der Snapshot dient als Grundlage für die Checkpoint-Auswertung.
 * Alle Statuses sind initial leer – der Nutzer füllt sie in der UI.
 *
 * @param inquiryIds – Ausgewählte Anliegen-IDs (müssen in INQUIRY_PROFILE_CATALOG_V2 vorhanden sein).
 * @returns Geordnete Liste von InquirySection-Objekten mit leeren checkpointStatuses.
 */
export function buildInitialInquirySectionSnapshot(
  inquiryIds: string[],
): InquirySection[] {
  return inquiryIds
    .filter((id) => id in INQUIRY_PROFILE_CATALOG_V2)
    .map((id) => ({
      inquiryId: id,
      decisionStatus: DecisionStatus.DISABLED,
      checkpointStatuses: {},
    }));
}

/**
 * Generiert den Output einer Session aus dem gespeicherten Sections-Snapshot.
 *
 * Reine Hilfsfunktion – kein DB-Zugriff, keine Seiteneffekte.
 * Kann direkt zum Speichern in `generated_output` verwendet werden.
 *
 * @param sections – Sections-Snapshot aus der InquirySession.
 * @returns InquiryResponseV2Output für die Antwortgenerierung.
 */
export function generateOutputFromSections(
  sections: InquirySection[],
): InquiryResponseV2Output {
  return renderInquiryResponseFromSections(sections);
}
