import type { PracticeCatalogEntry as PrismaCatalogEntry } from "@prisma/client";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

// ─── Typen für Katalogeintrag-Rückgaben ─────────────────────────────────────

export type CatalogEntryRow = Pick<
  PrismaCatalogEntry,
  | "id"
  | "catalog_case_id"
  | "practice_id"
  | "source_session_id"
  | "source_case_profile_id"
  | "title"
  | "description"
  | "version"
  | "is_current_version"
  | "is_catalog_active"
  | "published_at"
  | "createdAt"
  | "updatedAt"
>;

export type CatalogEntryDetail = CatalogEntryRow & {
  snapshot: PracticeWorkflowSnapshot;
};

// ─── Publish-Aufruf ──────────────────────────────────────────────────────────

export type PublishToCatalogInput = {
  sessionId: string;
  title: string;
  description?: string;
  practiceId: string;
  accountId: string;
};

export type PublishToCatalogResult =
  | { ok: true; id: string; alreadyPublished?: false }
  | { ok: true; id: string; alreadyPublished: true };

// ─── start-revision ──────────────────────────────────────────────────────────

export type StartRevisionInput = {
  entryId: string;
  practiceId: string;
  accountId: string;
};

export type StartRevisionResult =
  | { ok: true; sessionId: string; alreadyStarted?: false }
  | { ok: true; sessionId: string; alreadyStarted: true };
