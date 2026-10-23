import { NextRequest } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import {
  isInternalProtocolWorkflowSnapshot,
  type InternalProtocolWorkflowSnapshot,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { buildInternalProtocolPrintBlocks } from "@/lib/workflow/internalProtocol/printPdf";

export async function GET(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account || !account.is_approved || !canAccessWorkflowCases(account)) {
    return new Response("Nicht berechtigt.", { status: 403 });
  }

  const sessions = await prisma.workflowSession.findMany({
    where: {
      ...getWorkflowOwnershipFilter(account),
      internal_saved_at: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { title: true, createdAt: true, process_snapshot: true },
  });

  const entries = sessions.flatMap((session) =>
    isInternalProtocolWorkflowSnapshot(session.process_snapshot)
      ? [{
          title: session.title,
          createdAt: session.createdAt,
          snapshot: session.process_snapshot as InternalProtocolWorkflowSnapshot,
        }]
      : [],
  );
  const bytes = await buildPrintPdf(
    "Interne Protokolle",
    buildInternalProtocolPrintBlocks(entries),
  );

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="interne-protokolle.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}