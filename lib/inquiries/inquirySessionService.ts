/**
 * Service-Schicht für InquirySession.
 *
 * Enthält Typen, reine Hilfsfunktionen und DB-Schreiblogik.
 * Vollständig isoliert von CaseSession/Verordnungslogik.
 *
 * Fachliche Regeln:
 *  1. Eine CONFIRMED-Session ist unveränderlich – weder Checkpoint-Updates
 *     noch erneutes Bestätigen sind möglich (idempotenter OK-Pfad ausgenommen).
 *  2. selected_inquiry_ids werden gegen INQUIRY_PROFILE_CATALOG_V2 validiert;
 *     unbekannte IDs werden stillschweigend herausgefiltert. Bleibt keine
 *     gültige ID übrig, wird ein InquirySessionError geworfen.
 *  3. Checkpoint-Statuses werden als unvermischte Flat-Maps gespeichert
 *     (checkpoint_statuses für DECISION/EXPLANATION/SPECIFIC,
 *      action_statuses für ACTION-Checkpoints). Kein partielles Merge.
 *  4. confirmInquirySession rekonstruiert die vollständigen Sections aus
 *     section_snapshot + checkpoint_statuses + action_statuses und berechnet
 *     generated_output deterministisch via renderInquiryResponseFromSections.
 */

import { Prisma, type PrismaClient, type InquirySession } from "@prisma/client";

import {
  DecisionStatus,
  type InquirySection,
  type InquiryResponseV2Output,
  type CheckpointStatusValue,
} from "@/lib/inquiries/types";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { prisma as defaultPrisma } from "@/lib/prisma";

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
// Fehlerklasse
// ---------------------------------------------------------------------------

export type InquirySessionErrorCode =
  | "session_not_found"
  | "session_confirmed"
  | "invalid_inquiry_ids";

export class InquirySessionError extends Error {
  public readonly code: InquirySessionErrorCode;

  constructor(code: InquirySessionErrorCode, message: string) {
    super(message);
    this.name = "InquirySessionError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Minimaler Prisma-Ausschnitt für Testbarkeit
// ---------------------------------------------------------------------------

/**
 * Minimaler Prisma-Ausschnitt, den die Service-Schicht benötigt.
 * Erlaubt leichtere Test-Doubles ohne den vollen PrismaClient.
 */
type PrismaLike = Pick<PrismaClient, "inquirySession" | "$transaction">;

// ---------------------------------------------------------------------------
// Hilfsfunktionen (stateless, keine DB-Aufrufe)
// ---------------------------------------------------------------------------

/**
 * Erzeugt den initialen Sections-Snapshot aus einer Liste von Anliegen-IDs.
 *
 * Der Snapshot dient als unveränderlicher Ankerpunkt für die im Profil-Katalog
 * registrierten Anliegen. Alle Statuses sind initial leer – der Nutzer befüllt
 * sie in der UI.
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

// ---------------------------------------------------------------------------
// DB-Funktionen
// ---------------------------------------------------------------------------

/**
 * Legt eine neue InquirySession im Status DRAFT an.
 *
 * Unbekannte Anliegen-IDs (nicht in INQUIRY_PROFILE_CATALOG_V2) werden
 * herausgefiltert. Bleibt keine gültige ID übrig, wird ein
 * InquirySessionError("invalid_inquiry_ids") geworfen.
 */
export async function createInquirySession(
  input: CreateInquirySessionInput,
  client: PrismaLike = defaultPrisma,
): Promise<InquirySession> {
  const validIds = (input.selectedInquiryIds ?? []).filter(
    (id) => id in INQUIRY_PROFILE_CATALOG_V2,
  );

  if (validIds.length === 0) {
    throw new InquirySessionError(
      "invalid_inquiry_ids",
      "Keine gültigen Anliegen-IDs angegeben.",
    );
  }

  const sections = buildInitialInquirySectionSnapshot(validIds);

  return client.inquirySession.create({
    data: {
      owner_account_id: input.ownerAccountId ?? null,
      status: "DRAFT",
      selected_inquiry_ids: toJsonInput(validIds),
      section_snapshot: toJsonInput(sections),
      checkpoint_statuses: toJsonInput({}),
      action_statuses: toJsonInput({}),
    },
  });
}

/**
 * Aktualisiert die Checkpoint- und Aktions-Statuses einer Session.
 *
 * Wirft InquirySessionError("session_confirmed"), wenn die Session bereits
 * bestätigt ist. Wirft InquirySessionError("session_not_found"), wenn die
 * Session nicht existiert.
 *
 * Es findet kein partielles Merge statt: der übergebene Stand ersetzt den
 * vollständigen bisherigen JSON-Blob.
 */
export async function updateInquiryCheckpointStatuses(
  input: UpdateCheckpointStatusesInput,
  client: PrismaLike = defaultPrisma,
): Promise<InquirySession> {
  const session = await client.inquirySession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true },
  });

  if (!session) {
    throw new InquirySessionError(
      "session_not_found",
      `InquirySession ${input.sessionId} nicht gefunden.`,
    );
  }

  if (session.status === "CONFIRMED") {
    throw new InquirySessionError(
      "session_confirmed",
      `InquirySession ${input.sessionId} ist bereits bestätigt und kann nicht mehr geändert werden.`,
    );
  }

  return client.inquirySession.update({
    where: { id: input.sessionId },
    data: {
      checkpoint_statuses: toJsonInput(input.checkpointStatuses),
      action_statuses: toJsonInput(input.actionStatuses ?? {}),
    },
  });
}

/**
 * Bestätigt eine InquirySession (Übergang DRAFT → CONFIRMED).
 *
 * Ablauf (transaktional):
 *  1. Session laden (inkl. section_snapshot, checkpoint_statuses, action_statuses).
 *  2. Sections aus snapshot + flat statuses rekonstruieren:
 *     - decisionStatus aus checkpoint_statuses[profile.decisionCheckpointId].
 *     - checkpointStatuses = merge(checkpoint_statuses, action_statuses).
 *  3. generated_output via renderInquiryResponseFromSections berechnen.
 *  4. Session atomar auf CONFIRMED setzen + generated_output + confirmed_at speichern.
 *
 * Idempotent: Ist die Session bereits CONFIRMED, wird sie unverändert zurückgegeben.
 * Wirft InquirySessionError("session_not_found"), wenn die Session nicht existiert.
 */
export async function confirmInquirySession(
  sessionId: string,
  client: PrismaLike = defaultPrisma,
): Promise<InquirySession> {
  return client.$transaction(async (tx) => {
    const session = await tx.inquirySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new InquirySessionError(
        "session_not_found",
        `InquirySession ${sessionId} nicht gefunden.`,
      );
    }

    // Idempotent: bereits bestätigt → unveränderter Datensatz zurückgeben.
    if (session.status === "CONFIRMED") {
      return session;
    }

    // Sections rekonstruieren: section_snapshot liefert die Anliegen-IDs;
    // checkpoint_statuses + action_statuses liefern den aktuellen Arbeitsstand.
    const sectionSnapshot: InquirySection[] = Array.isArray(session.section_snapshot)
      ? (session.section_snapshot as unknown as InquirySection[])
      : [];

    const checkpointStatuses: Record<string, string> =
      session.checkpoint_statuses !== null &&
      typeof session.checkpoint_statuses === "object" &&
      !Array.isArray(session.checkpoint_statuses)
        ? (session.checkpoint_statuses as Record<string, string>)
        : {};

    const actionStatuses: Record<string, string> =
      session.action_statuses !== null &&
      typeof session.action_statuses === "object" &&
      !Array.isArray(session.action_statuses)
        ? (session.action_statuses as Record<string, string>)
        : {};

    // Alle Statuses zu einer flachen Map zusammenführen.
    // renderInquiryResponseFromSections liest pro Section nur die für das
    // jeweilige Anliegen relevanten Einträge heraus.
    const mergedStatuses = {
      ...checkpointStatuses,
      ...actionStatuses,
    } as Record<string, CheckpointStatusValue>;

    const sections: InquirySection[] = sectionSnapshot.map((s) => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[s.inquiryId];
      const decisionRaw = profile
        ? checkpointStatuses[profile.decisionCheckpointId]
        : undefined;
      return {
        inquiryId: s.inquiryId,
        decisionStatus: isDecisionStatus(decisionRaw)
          ? decisionRaw
          : DecisionStatus.DISABLED,
        checkpointStatuses: mergedStatuses,
      };
    });

    const generatedOutput = generateOutputFromSections(sections);

    return tx.inquirySession.update({
      where: { id: sessionId },
      data: {
        status: "CONFIRMED",
        confirmed_at: new Date(),
        generated_output: toJsonInput(generatedOutput),
      },
    });
  });
}

/**
 * Liest eine InquirySession inkl. generiertem Output aus der DB.
 *
 * Gibt null zurück, wenn die Session nicht existiert.
 * Optionaler Guard: Wird `ownerAccountId` übergeben, schlägt die Abfrage fehl
 * (gibt null zurück), wenn die Session einem anderen Account gehört.
 */
export async function getInquirySessionWithOutput(
  sessionId: string,
  ownerAccountId?: string,
  client: PrismaLike = defaultPrisma,
): Promise<InquirySession | null> {
  const session = await client.inquirySession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;
  if (ownerAccountId && session.owner_account_id !== ownerAccountId) return null;

  return session;
}

// ---------------------------------------------------------------------------
// Interne Hilfsfunktionen
// ---------------------------------------------------------------------------

function isDecisionStatus(value: unknown): value is DecisionStatus {
  return (
    value === DecisionStatus.POSSIBLE ||
    value === DecisionStatus.NOT_POSSIBLE ||
    value === DecisionStatus.DISABLED
  );
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
