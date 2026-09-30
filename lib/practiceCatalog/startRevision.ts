import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { StartRevisionInput, StartRevisionResult } from "./types";
import type { PracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { isPublishedPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { ensurePracticeWorkingSession } from "./workingState";

/**
 * Startet eine neue Revision eines Katalogeintrags.
 *
 * Idempotent: Existiert bereits eine WorkflowSession für Praxis und Fallprofil,
 * wird diese zurückgegeben (alreadyStarted: true).
 *
 * Der Snapshot der neuen Session entspricht dem eingefrorenen Katalog-Snapshot,
 * jedoch ohne completedAt (damit die Session wieder als Entwurf gilt).
 */
export async function startRevision(
  input: StartRevisionInput,
): Promise<StartRevisionResult> {
  const { entryId, practiceId, accountId } = input;

  // A — Katalogeintrag laden + Ownership prüfen
  const entry = await prisma.practiceCatalogEntry.findFirst({
    where: { id: entryId, practice_id: practiceId },
  });

  if (!entry) {
    throw Object.assign(
      new Error("Katalogeintrag nicht gefunden oder kein Zugriff."),
      { statusCode: 404 },
    );
  }

  // B — Snapshot aus Katalogeintrag laden und completedAt entfernen
  const rawSnapshot = entry.snapshot;
  if (!isPublishedPracticeWorkflowSnapshot(rawSnapshot)) {
    throw Object.assign(
      new Error("Snapshot des Katalogeintrags ist kein gültiger PracticeWorkflowSnapshot."),
      { statusCode: 500 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const draftSnapshot: PracticeWorkflowDraftSnapshot = {
    processKind: rawSnapshot.processKind,
    snapshotVersion: rawSnapshot.snapshotVersion,
    caseProfileId: rawSnapshot.caseProfileId,
    caseProfileTitle: rawSnapshot.caseProfileTitle,
    checkpoints: rawSnapshot.checkpoints.map(({ definition: _definition, ...checkpoint }) => checkpoint),
  };

  const session = await ensurePracticeWorkingSession({
    accountId,
    practiceId,
    caseProfileId: rawSnapshot.caseProfileId,
    title: entry.title,
    snapshot: draftSnapshot as unknown as Prisma.InputJsonValue,
    sourceCatalogEntryId: entryId,
  });

  return {
    ok: true,
    sessionId: session.id,
    ...(session.alreadyExists ? { alreadyStarted: true as const } : {}),
  };
}
