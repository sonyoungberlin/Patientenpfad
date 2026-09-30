import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EnsurePracticeWorkingSessionInput = {
  accountId: string;
  practiceId: string;
  caseProfileId: string;
  title: string;
  snapshot: Prisma.InputJsonValue;
  sourceCatalogEntryId?: string;
};

export async function ensurePracticeWorkingSession(
  input: EnsurePracticeWorkingSessionInput,
): Promise<{ id: string; alreadyExists: boolean }> {
  if (!input.practiceId) {
    throw Object.assign(new Error("Kein Praxiskontext vorhanden."), { statusCode: 403 });
  }

  const existing = await prisma.workflowSession.findFirst({
    where: {
      owner_practice_id: input.practiceId,
      case_profile_id: input.caseProfileId,
    },
    select: { id: true },
  });

  if (existing) return { id: existing.id, alreadyExists: true };

  try {
    const created = await prisma.workflowSession.create({
      data: {
        title: input.title,
        process_snapshot: input.snapshot,
        internal_saved_at: new Date(),
        owner_account_id: input.accountId,
        case_profile_id: input.caseProfileId,
        owner_practice_id: input.practiceId,
        ...(input.sourceCatalogEntryId
          ? { source_catalog_entry_id: input.sourceCatalogEntryId }
          : {}),
      },
      select: { id: true },
    });
    return { id: created.id, alreadyExists: false };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unique constraint failed")) {
      throw error;
    }

    const concurrent = await prisma.workflowSession.findFirst({
      where: {
        owner_practice_id: input.practiceId,
        case_profile_id: input.caseProfileId,
      },
      select: { id: true },
    });
    if (!concurrent) throw error;
    return { id: concurrent.id, alreadyExists: true };
  }
}