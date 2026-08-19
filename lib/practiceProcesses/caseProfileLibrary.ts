/**
 * Async DB-Layer für die Praxisfall-Bibliothek.
 *
 * DB-Einträge überschreiben den statischen Katalog (caseProfileCatalog.ts).
 * Existiert kein DB-Eintrag, wird auf den Katalog zurückgefallen (DB-first).
 *
 * Nur für Server-seitige Verwendung (Admin-Pages, API-Routen).
 */

import { prisma } from "@/lib/prisma";
import type { PracticeCaseProfile, PracticeCheckpointRef } from "./types";
import {
  getCaseProfile as getCatalogProfile,
  listCaseProfiles as listCatalogProfiles,
} from "./caseProfileCatalog";

// ---------------------------------------------------------------------------
// Interne Helpers
// ---------------------------------------------------------------------------

function parseCheckpointRefs(raw: unknown): PracticeCheckpointRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is { checkpointId: string; group?: string } =>
      r !== null &&
      typeof r === "object" &&
      typeof (r as Record<string, unknown>).checkpointId === "string" &&
      (r as Record<string, unknown>).checkpointId !== "",
  );
}

function dbRowToProfile(row: {
  id: string;
  title: string;
  description: string | null;
  checkpoint_refs: unknown;
}): PracticeCaseProfile {
  return {
    id: row.id,
    title: row.title,
    ...(row.description != null ? { description: row.description } : {}),
    checkpointRefs: parseCheckpointRefs(row.checkpoint_refs),
  };
}

// ---------------------------------------------------------------------------
// Öffentliche Lese-API (server-only)
// ---------------------------------------------------------------------------

/** Lädt einen Praxisfall aus der DB; fällt auf den statischen Katalog zurück. */
export async function getCaseProfileFromLib(
  id: string,
): Promise<PracticeCaseProfile | undefined> {
  const row = await prisma.libraryCaseProfile.findUnique({ where: { id } });
  if (row) return dbRowToProfile(row);
  return getCatalogProfile(id);
}

/**
 * Liefert alle Praxisfälle: DB-Einträge überschreiben Katalogeinträge bei gleicher ID.
 * Reihenfolge: Katalog-Reihenfolge bleibt erhalten; DB-only-Einträge werden hinten angehängt.
 */
export async function listCaseProfilesFromLib(): Promise<PracticeCaseProfile[]> {
  const rows = await prisma.libraryCaseProfile.findMany({ orderBy: { updatedAt: "desc" } });
  const dbMap = new Map(rows.map((r) => [r.id, dbRowToProfile(r)]));
  const catalog = listCatalogProfiles();
  const merged = catalog.map((cp) => dbMap.get(cp.id) ?? cp);
  // DB-only entries (neue Praxisfälle, die nicht im Katalog stehen)
  for (const [id, cp] of dbMap) {
    if (!merged.find((c) => c.id === id)) merged.push(cp);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Schreib-API (nur Admin-Routen)
// ---------------------------------------------------------------------------

export interface CaseProfileWriteInput {
  id: string;
  title: string;
  description: string;
  checkpointRefs: Array<{ checkpointId: string; group?: string }>;
}

/**
 * Legt einen neuen Praxisfall an oder überschreibt einen bestehenden DB-Eintrag.
 * Gibt den persistierten Stand zurück.
 */
export async function upsertLibraryCaseProfile(
  input: CaseProfileWriteInput,
): Promise<PracticeCaseProfile> {
  const row = await prisma.libraryCaseProfile.upsert({
    where: { id: input.id },
    update: {
      title: input.title,
      description: input.description || null,
      checkpoint_refs: input.checkpointRefs,
      updatedAt: new Date(),
    },
    create: {
      id: input.id,
      title: input.title,
      description: input.description || null,
      checkpoint_refs: input.checkpointRefs,
    },
  });
  return dbRowToProfile(row);
}
