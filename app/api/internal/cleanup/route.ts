import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/lib/cleanup/runCleanup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const CLEANUP_STATUS_ID = "communication-retention";

/**
 * GET /api/internal/cleanup
 *
 * Wird täglich vom Vercel Cron aufgerufen (vercel.json → schedule "0 3 * * *").
 * Schützt sich über CRON_SECRET (Vercel setzt Authorization-Header automatisch).
 *
 * Query-Parameter:
 *   ?dry=true  → Dry-Run: zählt Kandidaten, löscht nichts.
 *
 * Antwort:
 *   { ok: true, ...CleanupCounts }
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Standardmäßig immer Dry-Run. Echte Löschung nur bei explizitem ?apply=true.
  const apply = req.nextUrl.searchParams.get("apply") === "true";
  const dryRun = !apply;

  const startedAt = new Date();
  try {
    await prisma.cleanupStatus.upsert({
      where: { id: CLEANUP_STATUS_ID },
      create: { id: CLEANUP_STATUS_ID, last_started_at: startedAt },
      update: { last_started_at: startedAt },
    });

    const result = await runCleanup({ dryRun });
    const succeededAt = new Date();
    const status = await prisma.cleanupStatus.update({
      where: { id: CLEANUP_STATUS_ID },
      data: {
        last_succeeded_at: succeededAt,
        last_error_code: null,
      },
      select: {
        last_started_at: true,
        last_succeeded_at: true,
        last_failed_at: true,
      },
    });

    console.info("[cleanup]", {
      timestamp: succeededAt.toISOString(),
      outcome: "success",
      dryRun: result.dryRun,
      pendingSessions: result.pendingSessions,
      completedSessions: result.completedSessions,
      trashSessions: result.trashSessions,
      websiteUnconfirmedSessions: result.websiteUnconfirmedSessions,
      totalSessions: result.totalSessions,
      nulledSessionRefs: result.nulledSessionRefs,
      nulledInquiryRefs: result.nulledInquiryRefs,
      digitalRequests: result.digitalRequests,
      caseSessions: result.caseSessions,
      inquirySessions: result.inquirySessions,
    });

    return NextResponse.json({ ok: true, ...result, cleanupStatus: status });
  } catch (error) {
    const failedAt = new Date();
    const errorCode = error instanceof Error ? error.name : "UnknownError";
    await prisma.cleanupStatus.update({
      where: { id: CLEANUP_STATUS_ID },
      data: { last_failed_at: failedAt, last_error_code: errorCode },
    }).catch(() => {});
    console.error("[cleanup]", {
      timestamp: failedAt.toISOString(),
      outcome: "failed",
      dryRun,
      errorCode,
    });
    return NextResponse.json(
      { ok: false, error: "Cleanup fehlgeschlagen." },
      { status: 500 },
    );
  }
}
