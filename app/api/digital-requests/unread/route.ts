import { NextRequest, NextResponse } from "next/server";
import { requireDigitalRequestWorkAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";

export const dynamic = "force-dynamic";

/**
 * GET /api/digital-requests/unread
 *
 * Gibt `{ hasUnread: boolean }` zurück – true, wenn mindestens eine
 * DigitalRequest mit status="new" im Praxis-Scope des Accounts existiert.
 *
 * Wird von der AppShell verwendet, um den Unread-Indikator zu befüllen.
 * Erfordert Digital-Request-Arbeitszugriff.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { account, error } = await requireDigitalRequestWorkAccess(req);
  if (error) return error;

  const count = await prisma.digitalRequest.count({
    where: {
      ...getOwnershipFilter(account),
      request_type: "patient",
      status: "new",
      deleted_at: null,
    },
  });

  return NextResponse.json({ hasUnread: count > 0 });
}
