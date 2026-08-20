import { prisma } from "@/lib/prisma";
import type { StartRevisionInput, StartRevisionResult } from "./types";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

/**
 * Startet eine neue Revision eines Katalogeintrags.
 *
 * Idempotent: Existiert bereits eine WorkflowSession mit source_catalog_entry_id = entryId,
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

  // B — Bestehende Revision prüfen (idempotent)
  const existingRevision = await prisma.workflowSession.findUnique({
    where: { source_catalog_entry_id: entryId },
    select: { id: true },
  });

  if (existingRevision) {
    return { ok: true, sessionId: existingRevision.id, alreadyStarted: true };
  }

  // C — Snapshot aus Katalogeintrag laden und completedAt entfernen
  const rawSnapshot = entry.snapshot;
  if (!isPracticeWorkflowSnapshot(rawSnapshot)) {
    throw Object.assign(
      new Error("Snapshot des Katalogeintrags ist kein gültiger PracticeWorkflowSnapshot."),
      { statusCode: 500 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { completedAt: _removed, ...draftSnapshot } =
    rawSnapshot as PracticeWorkflowSnapshot;

  const newSession = await prisma.workflowSession.create({
    data: {
      title: entry.title,
      process_snapshot: draftSnapshot as object,
      internal_saved_at: new Date(),
      owner_account_id: accountId,
      owner_practice_id: practiceId,
      source_catalog_entry_id: entryId,
    },
    select: { id: true },
  });

  return { ok: true, sessionId: newSession.id };
}
