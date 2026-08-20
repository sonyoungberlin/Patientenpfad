import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import {
  isPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PublishToCatalogInput, PublishToCatalogResult } from "./types";

/**
 * Publiziert eine abgeschlossene WorkflowSession als stabilen Praxiskatalog-Eintrag.
 *
 * Idempotent: Wurde diese Session bereits publiziert, wird der bestehende Eintrag
 * zurückgegeben (alreadyPublished: true).
 *
 * Versionierung: Hat die Session eine source_catalog_entry_id, wird eine neue
 * Version innerhalb desselben catalog_case_id erstellt. Alte is_current_version-
 * Flags werden in derselben Transaktion zurückgesetzt.
 *
 * @throws Error mit HTTP-Statuscode-Präfix bei Validierungsfehlern.
 */
export async function publishToCatalog(
  input: PublishToCatalogInput,
): Promise<PublishToCatalogResult> {
  const { sessionId, title, description, practiceId } = input;

  // A — Session laden + Ownership prüfen
  const session = await prisma.workflowSession.findFirst({
    where: { id: sessionId, owner_practice_id: practiceId },
  });

  if (!session) {
    throw Object.assign(new Error("WorkflowSession nicht gefunden oder kein Zugriff."), {
      statusCode: 404,
    });
  }

  // B — Snapshot validieren
  const rawSnapshot = session.process_snapshot;

  if (!isPracticeWorkflowSnapshot(rawSnapshot)) {
    throw Object.assign(new Error("Snapshot ist kein PracticeWorkflowSnapshot."), {
      statusCode: 400,
    });
  }

  if (!rawSnapshot.completedAt) {
    throw Object.assign(new Error("Snapshot ist noch nicht abgeschlossen (completedAt fehlt)."), {
      statusCode: 400,
    });
  }

  const allDecided = rawSnapshot.checkpoints.every(
    (cp) => cp.decision !== undefined,
  );
  if (!allDecided) {
    throw Object.assign(
      new Error("Nicht alle Checkpoints haben eine Entscheidung (PFLICHT/OPTIONAL/NICHT_RELEVANT)."),
      { statusCode: 400 },
    );
  }

  // C — Idempotenz: bereits publiziert?
  const existing = await prisma.practiceCatalogEntry.findUnique({
    where: { source_session_id: sessionId },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, id: existing.id, alreadyPublished: true };
  }

  // D/E — Versionierung bestimmen
  let catalogCaseId: string;
  let nextVersion: number;

  if (session.source_catalog_entry_id) {
    // Revision: parent-Eintrag laden
    const parent = await prisma.practiceCatalogEntry.findFirst({
      where: { id: session.source_catalog_entry_id, practice_id: practiceId },
      select: { catalog_case_id: true },
    });
    if (!parent) {
      throw Object.assign(
        new Error("Eltern-Katalogeintrag nicht gefunden oder kein Zugriff."),
        { statusCode: 404 },
      );
    }
    catalogCaseId = parent.catalog_case_id;

    const agg = await prisma.practiceCatalogEntry.aggregate({
      where: { catalog_case_id: catalogCaseId },
      _max: { version: true },
    });
    nextVersion = (agg._max.version ?? 0) + 1;
  } else {
    // Erstpublikation
    catalogCaseId = nanoid();
    nextVersion = 1;
  }

  // F — Transaktion: alte Versionen demarkieren, neuen Eintrag anlegen
  let newEntryId: string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (nextVersion > 1) {
        await tx.practiceCatalogEntry.updateMany({
          where: { catalog_case_id: catalogCaseId, is_current_version: true },
          data: { is_current_version: false },
        });
      }

      const entry = await tx.practiceCatalogEntry.create({
        data: {
          catalog_case_id: catalogCaseId,
          practice_id: practiceId,
          source_session_id: sessionId,
          source_case_profile_id: rawSnapshot.caseProfileId ?? null,
          title,
          description: description ?? null,
          snapshot: rawSnapshot as object,
          version: nextVersion,
          is_current_version: true,
          is_catalog_active: true,
          published_at: new Date(),
        },
        select: { id: true },
      });

      return entry;
    });

    newEntryId = result.id;
  } catch (err: unknown) {
    // @@unique([catalog_case_id, version]) Verletzung → Nebenläufigkeit
    const isUniqueViolation =
      err instanceof Error && err.message.includes("Unique constraint failed");
    if (isUniqueViolation) {
      throw Object.assign(
        new Error("Versionsnummern-Konflikt. Bitte erneut versuchen."),
        { statusCode: 409 },
      );
    }
    throw err;
  }

  return { ok: true, id: newEntryId };
}
