import { NextRequest, NextResponse } from "next/server";
import { getOfficeTopic, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { prisma } from "@/lib/prisma";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { requireOfficeCasesManagementAccess } from "@/lib/authz";

type OfficeCaseSnapshotRecord = {
  topicId?: unknown;
  topicTitle?: unknown;
  checkpoints?: unknown;
};

function readSnapshot(value: unknown): OfficeCaseSnapshotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as OfficeCaseSnapshotRecord;
}

export async function GET(req: NextRequest) {
  const { account, error } = await requireOfficeCasesManagementAccess(req);
  if (error) return error;

  const ownershipScope = getOfficeOwnershipFilter(account);

  const officeCases = await prisma.officeCaseSession.findMany({
    where: { ...ownershipScope, internal_saved_at: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      title: true,
      trigger_note: true,
      checkpoint_snapshot: true,
      owner_account_id: true,
      owner_practice_id: true,
    },
  });

  const items = officeCases.map((officeCase) => {
    const snapshot = readSnapshot(officeCase.checkpoint_snapshot);
    const topicId = typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
      ? snapshot.topicId
      : null;
    const checkpoints = Array.isArray(snapshot?.checkpoints) ? snapshot?.checkpoints : [];
    const topicTitle = topicId ? getOfficeTopic(topicId).title : null;

    return {
      id: officeCase.id,
      createdAt: officeCase.createdAt,
      updatedAt: officeCase.updatedAt,
      title: officeCase.title,
      trigger_note: officeCase.trigger_note,
      topicId,
      topicTitle,
      checkpointCount: checkpoints.length,
      owner_account_id: officeCase.owner_account_id,
      owner_practice_id: officeCase.owner_practice_id,
    };
  });

  return NextResponse.json({ ok: true, items });
}
