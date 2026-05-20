import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
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
 * Erfordert eine aktive Sitzung (401 sonst).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  const count = await prisma.digitalRequest.count({
    where: {
      ...getOwnershipFilter(account),
      status: "new",
      deleted_at: null,
    },
  });

  return NextResponse.json({ hasUnread: count > 0 });
}
