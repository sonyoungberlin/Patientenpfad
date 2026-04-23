import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  createOpenRun,
  getOpenRun,
  PrefillRunError,
} from "@/lib/server/prefillRuns";

/**
 * Schritt 4 der PrefillRun-Umstellung: Einstieg „Weitere Vorbereitung
 * starten" aus M3 heraus.
 *
 * Verhalten:
 *   * Auth + Owner-Check wie in den übrigen `/api/cases/[id]/...`-Routen.
 *   * Sperre bei `doctor_confirmed = true` oder
 *     `clinical_status === "confirmed"` – die Route erlaubt **nicht**
 *     `allowConfirmed`, sodass der Service-Guard greift.
 *   * Existiert bereits ein offener Run für diesen Fall, wird er
 *     wiederverwendet (idempotent, keine Fehler nach außen). Es wird kein
 *     bestehender Run geändert oder gelöscht – die Route ruft
 *     ausschließlich `getOpenRun` (lesend) bzw. `createOpenRun` (anlegend);
 *     `freezeRun`/`appendFrozenRun` werden hier bewusst nicht verwendet.
 *   * Antwortet mit `{ ok, runId, sequence, redirect }`. Der Client führt
 *     den Redirect nach `/cases/[id]/m2` clientseitig aus.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 },
      );
    }
    if (!account.is_approved) {
      return NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
      );
    }

    const { id } = await params;

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        active_checkpoints: true,
        doctor_confirmed: true,
        clinical_status: true,
      },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json(
        { ok: false, error: "Fall nicht gefunden." },
        { status: 404 },
      );
    }

    // Defensive Doppel-Sperre: zusätzlich zum Service-Guard wird hier
    // explizit geblockt, damit das Außenverhalten unabhängig von
    // `allowConfirmed`-Flags bleibt.
    if (
      session.doctor_confirmed === true ||
      session.clinical_status === "confirmed"
    ) {
      return NextResponse.json(
        { ok: false, error: "Fall ist bereits ärztlich bestätigt." },
        { status: 403 },
      );
    }

    const redirectTo = `/cases/${id}/m2`;

    // Idempotent: falls bereits ein offener Run existiert, einfach diesen
    // verwenden – kein Fehler, kein Merge, keine Änderung am Run.
    const existingOpen = await getOpenRun(id);
    if (existingOpen) {
      return NextResponse.json({
        ok: true,
        runId: existingOpen.id,
        sequence: existingOpen.sequence,
        reused: true,
        redirect: redirectTo,
      });
    }

    const activeCheckpointsSnapshot = Array.isArray(session.active_checkpoints)
      ? (session.active_checkpoints as unknown[])
      : [];

    try {
      const run = await createOpenRun({
        caseId: id,
        source: "mfa",
        activeCheckpoints: activeCheckpointsSnapshot,
        createdByAccountId: account.id,
        // Kein `allowConfirmed`: die Service-Schicht blockiert Anlage bei
        // bestätigtem Fall zusätzlich zur expliziten Prüfung oben.
      });
      return NextResponse.json({
        ok: true,
        runId: run.id,
        sequence: run.sequence,
        reused: false,
        redirect: redirectTo,
      });
    } catch (err) {
      // Race-Condition-Schutz: falls zwischen `getOpenRun` und
      // `createOpenRun` parallel ein anderer offener Run entstanden ist,
      // wird er einfach wiederverwendet.
      if (err instanceof PrefillRunError && err.code === "open_run_exists") {
        const open = await getOpenRun(id);
        if (open) {
          return NextResponse.json({
            ok: true,
            runId: open.id,
            sequence: open.sequence,
            reused: true,
            redirect: redirectTo,
          });
        }
      }
      if (err instanceof PrefillRunError && err.code === "case_confirmed") {
        return NextResponse.json(
          { ok: false, error: "Fall ist bereits ärztlich bestätigt." },
          { status: 403 },
        );
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/prefill-run/start]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[cases/[id]/prefill-run/start]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Failed to start prefill run" },
      { status: 500 },
    );
  }
}
