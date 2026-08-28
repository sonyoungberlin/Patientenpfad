import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/lib/cleanup/runCleanup";

export const dynamic = "force-dynamic";

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

  const result = await runCleanup({ dryRun });

  console.info("[cleanup]", {
    timestamp: new Date().toISOString(),
    dryRun: result.dryRun,
    pendingSessions: result.pendingSessions,
    completedSessions: result.completedSessions,
    trashSessions: result.trashSessions,
    websiteUnconfirmedSessions: result.websiteUnconfirmedSessions,
    totalSessions: result.totalSessions,
    nulledSessionRefs: result.nulledSessionRefs,
    digitalRequests: result.digitalRequests,
  });

  return NextResponse.json({ ok: true, ...result });
}
