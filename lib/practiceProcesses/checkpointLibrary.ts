/**
 * Async DB-Layer für die Checkpoint-Bibliothek.
 *
 * DB-Einträge überschreiben den statischen Katalog (checkpointCatalog.ts).
 * Existiert kein DB-Eintrag, wird auf den Katalog zurückgefallen (DB-first).
 *
 * Nur für Server-seitige Verwendung (Admin-Pages, API-Routen).
 * Client Components verwenden weiterhin die synchrone Katalog-API.
 */

import { prisma } from "@/lib/prisma";
import type { PracticeCheckpoint, PracticeCheckpointAnchor } from "./types";
import {
  getCheckpoint as getCatalogCheckpoint,
  listCheckpoints as listCatalogCheckpoints,
} from "./checkpointCatalog";

// ---------------------------------------------------------------------------
// Interne Helpers
// ---------------------------------------------------------------------------

function parseAnchors(raw: unknown): PracticeCheckpointAnchor[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is PracticeCheckpointAnchor =>
      a !== null &&
      typeof a === "object" &&
      typeof (a as Record<string, unknown>).id === "string" &&
      typeof (a as Record<string, unknown>).text === "string",
  );
}

function dbRowToCheckpoint(row: {
  id: string;
  title: string;
  description: string | null;
  orientation_hint: string | null;
  anchors: unknown;
}): PracticeCheckpoint {
  return {
    id: row.id,
    title: row.title,
    ...(row.description != null ? { description: row.description } : {}),
    ...(row.orientation_hint != null ? { orientationHint: row.orientation_hint } : {}),
    orientationAnchors: parseAnchors(row.anchors),
  };
}

// ---------------------------------------------------------------------------
// Öffentliche Lese-API (server-only)
// ---------------------------------------------------------------------------

/**
 * Lädt einen Checkpoint aus der DB; fällt auf den statischen Katalog zurück.
 */
export async function getCheckpointFromLib(
  id: string,
): Promise<PracticeCheckpoint | undefined> {
  const row = await prisma.libraryCheckpoint.findUnique({ where: { id } });
  if (row) return dbRowToCheckpoint(row);
  return getCatalogCheckpoint(id);
}

/**
 * Liefert alle Checkpoints: DB-Einträge überschreiben Katalogeinträge bei gleicher ID.
 */
export async function listCheckpointsFromLib(): Promise<PracticeCheckpoint[]> {
  const rows = await prisma.libraryCheckpoint.findMany({ orderBy: { updatedAt: "desc" } });
  const dbMap = new Map(rows.map((r) => [r.id, dbRowToCheckpoint(r)]));
  const catalog = listCatalogCheckpoints();
  const merged = catalog.map((cp) => dbMap.get(cp.id) ?? cp);
  // DB-only entries (new checkpoints not in catalog)
  for (const [id, cp] of dbMap) {
    if (!merged.find((c) => c.id === id)) merged.push(cp);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Schreib-API (nur Admin-Routen)
// ---------------------------------------------------------------------------

export interface CheckpointWriteInput {
  id: string;
  title: string;
  description: string;
  orientationHint: string;
  orientationAnchors: PracticeCheckpointAnchor[];
}

/**
 * Legt einen neuen Checkpoint an oder überschreibt einen bestehenden DB-Eintrag.
 * Gibt den persistierten Stand zurück.
 */
export async function upsertLibraryCheckpoint(
  input: CheckpointWriteInput,
): Promise<PracticeCheckpoint> {
  const row = await prisma.libraryCheckpoint.upsert({
    where: { id: input.id },
    update: {
      title: input.title,
      description: input.description || null,
      orientation_hint: input.orientationHint || null,
      anchors: input.orientationAnchors as unknown as object[],
    },
    create: {
      id: input.id,
      title: input.title,
      description: input.description || null,
      orientation_hint: input.orientationHint || null,
      anchors: input.orientationAnchors as unknown as object[],
    },
  });
  return dbRowToCheckpoint(row);
}
