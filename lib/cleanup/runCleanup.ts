import { prisma } from "@/lib/prisma";
import { COMMUNICATION_RETENTION_DAYS, retentionCutoff } from "./retention";
import {
  STATUS_AWAITING_EMAIL_CONFIRMATION,
  WEBSITE_SESSION_SOURCE,
} from "@/lib/websiteForms/constants";

export type CleanupCounts = {
  dryRun: boolean;
  trashSessions: number;
  websiteUnconfirmedSessions: number;
  completedSessions: number;
  pendingSessions: number;
  totalSessions: number;
  nulledSessionRefs: number;
  digitalRequests: number;
};

/** Prüft, wie viele Kandidaten je Kategorie ohne Löschung gefunden werden. */
async function countCandidates(
  now: Date,
  cutoff: Date,
): Promise<Omit<CleanupCounts, "dryRun" | "nulledSessionRefs">> {
  const [trash, unconfirmed, completed, pending, digitalRequests] =
    await Promise.all([
      prisma.patientQuestionnaireSession.count({
        where: { deleted_at: { lt: cutoff } },
      }),
      prisma.patientQuestionnaireSession.count({
        where: {
          deleted_at: null,
          source: WEBSITE_SESSION_SOURCE,
          status: STATUS_AWAITING_EMAIL_CONFIRMATION,
          confirmed_at: null,
          confirm_token_expires_at: { lt: now },
        },
      }),
      prisma.patientQuestionnaireSession.count({
        where: {
          deleted_at: null,
          status: "completed",
          // null submitted_at wird durch SQL-Semantik von lt ausgeschlossen
          submitted_at: { lt: cutoff },
          NOT: { submitted_at: null },
        },
      }),
      // Explizit nur "pending" — unbekannte Statuswerte werden NICHT gelöscht.
      prisma.patientQuestionnaireSession.count({
        where: {
          deleted_at: null,
          status: "pending",
          createdAt: { lt: cutoff },
        },
      }),
      prisma.digitalRequest.count({
        where: { createdAt: { lt: cutoff } },
      }),
    ]);

  const totalSessions = trash + unconfirmed + completed + pending;
  return {
    trashSessions: trash,
    websiteUnconfirmedSessions: unconfirmed,
    completedSessions: completed,
    pendingSessions: pending,
    totalSessions,
    digitalRequests,
  };
}

/**
 * Führt den physischen Cleanup durch.
 *
 * Reihenfolge:
 *  1. DR.questionnaire_session_id → null (wo DR überlebt, Session aber gelöscht wird)
 *  2. PatientQuestionnaireSession löschen
 *  3. DigitalRequest löschen
 */
async function executeCleanup(now: Date, cutoff: Date): Promise<CleanupCounts> {
  // Alle Session-IDs sammeln, die in diesem Lauf gelöscht werden.
  // Wird für den defensiven Null-Out-Schritt benötigt.
  const sessionIdsToDelete = (
    await prisma.patientQuestionnaireSession.findMany({
      where: {
        OR: [
          { deleted_at: { lt: cutoff } },
          {
            deleted_at: null,
            source: WEBSITE_SESSION_SOURCE,
            status: STATUS_AWAITING_EMAIL_CONFIRMATION,
            confirmed_at: null,
            confirm_token_expires_at: { lt: now },
          },
          {
            deleted_at: null,
            status: "completed",
            submitted_at: { lt: cutoff },
            NOT: { submitted_at: null },
          },
          // Explizit nur "pending" — kein Catch-all für unbekannte Statuswerte.
          {
            deleted_at: null,
            status: "pending",
            createdAt: { lt: cutoff },
          },
        ],
      },
      select: { id: true },
      take: 5000,
    })
  ).map((s) => s.id);

  // 1. DR.questionnaire_session_id null setzen für DRs, die NICHT ebenfalls gelöscht werden.
  let nulledSessionRefs = 0;
  if (sessionIdsToDelete.length > 0) {
    const updateResult = await prisma.digitalRequest.updateMany({
      where: {
        questionnaire_session_id: { in: sessionIdsToDelete },
        // DR bleibt erhalten (wird nicht im selben Lauf gelöscht)
        NOT: { createdAt: { lt: cutoff } },
      },
      data: { questionnaire_session_id: null },
    });
    nulledSessionRefs = updateResult.count;
  }

  // 2. Sessions physisch löschen.
  const sessionResult =
    sessionIdsToDelete.length > 0
      ? await prisma.patientQuestionnaireSession.deleteMany({
          where: { id: { in: sessionIdsToDelete } },
        })
      : { count: 0 };

  // 3. DigitalRequests physisch löschen (alle, unabhängig vom Status).
  const drResult = await prisma.digitalRequest.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  // Einzelkategorien für den Abschlussbericht rekonstruieren.
  // Nach dem Löschen können wir nur noch die Gesamtzahl des deleteMany nennen.
  // Für Reporting teilen wir sie durch den Vorab-Count auf.
  const counts = await countCandidates(now, cutoff);

  return {
    dryRun: false,
    trashSessions: counts.trashSessions,
    websiteUnconfirmedSessions: counts.websiteUnconfirmedSessions,
    completedSessions: counts.completedSessions,
    pendingSessions: counts.pendingSessions,
    totalSessions: sessionResult.count,
    nulledSessionRefs,
    digitalRequests: drResult.count,
  };
}

/**
 * Zentraler Cleanup-Einstiegspunkt.
 *
 * dryRun=true: zählt Kandidaten, löscht nichts.
 * dryRun=false: führt physische Löschung durch.
 */
export async function runCleanup({
  dryRun = false,
  retentionDays = COMMUNICATION_RETENTION_DAYS,
  now = new Date(),
}: {
  dryRun?: boolean;
  /** Überschreibbar für Tests; Standard: COMMUNICATION_RETENTION_DAYS. */
  retentionDays?: number;
  /** Überschreibbar für Tests; Standard: aktuelle Uhrzeit. */
  now?: Date;
} = {}): Promise<CleanupCounts> {
  const cutoff = retentionCutoff(now, retentionDays);

  if (dryRun) {
    const counts = await countCandidates(now, cutoff);
    return { dryRun: true, nulledSessionRefs: 0, ...counts };
  }

  return executeCleanup(now, cutoff);
}
