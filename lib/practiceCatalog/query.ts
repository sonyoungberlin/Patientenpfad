import { prisma } from "@/lib/prisma";
import type { CatalogEntryRow, CatalogEntryDetail } from "./types";

const ROW_SELECT = {
  id: true,
  catalog_case_id: true,
  practice_id: true,
  source_session_id: true,
  source_case_profile_id: true,
  title: true,
  description: true,
  version: true,
  is_current_version: true,
  is_catalog_active: true,
  published_at: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Gibt alle aktiven, aktuellen Katalogeinträge einer Praxis zurück.
 * Sortiert nach Titel aufsteigend.
 */
export async function listActiveCatalogEntries(
  practiceId: string,
): Promise<CatalogEntryRow[]> {
  return prisma.practiceCatalogEntry.findMany({
    where: {
      practice_id: practiceId,
      is_catalog_active: true,
      is_current_version: true,
    },
    select: ROW_SELECT,
    orderBy: { title: "asc" },
  });
}

/**
 * Gibt alle Versionen eines Katalogfalls zurück (identische catalog_case_id),
 * sortiert nach Versionsnummer absteigend.
 */
export async function listCatalogEntryVersions(
  catalogCaseId: string,
  practiceId: string,
): Promise<CatalogEntryRow[]> {
  return prisma.practiceCatalogEntry.findMany({
    where: { catalog_case_id: catalogCaseId, practice_id: practiceId },
    select: ROW_SELECT,
    orderBy: { version: "desc" },
  });
}

/**
 * Gibt einen einzelnen Katalogeintrag inklusive Snapshot zurück.
 * Null wenn nicht gefunden oder Praxis stimmt nicht überein.
 */
export async function getCatalogEntry(
  id: string,
  practiceId: string,
): Promise<CatalogEntryDetail | null> {
  const entry = await prisma.practiceCatalogEntry.findFirst({
    where: { id, practice_id: practiceId },
    select: { ...ROW_SELECT, snapshot: true },
  });
  if (!entry) return null;

  // snapshot ist Json → als PracticeWorkflowSnapshot casted
  return entry as unknown as CatalogEntryDetail;
}
