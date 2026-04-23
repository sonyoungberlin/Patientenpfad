import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  BlockStatus,
  type ActiveCheckpoint,
  type BlockSummary,
  type M1BlockId,
  type M1Selection,
} from "@/lib/types";
import {
  CHECKPOINT_CATALOGUE,
  hydrateActiveCheckpointsFromSnapshot,
} from "@/lib/logic/checkpointCatalog";
import { buildM1SnapshotInitial } from "@/lib/logic/m1Activation";
import {
  createOpenRun,
  getOpenRun,
  PrefillRunError,
} from "@/lib/server/prefillRuns";

const M1_BLOCK_IDS: ReadonlyArray<M1BlockId> = [
  "kommunikation",
  "medizinische_lage",
  "versorgung_im_alltag",
];

const M1_BLOCK_TITLES: Record<M1BlockId, string> = {
  kommunikation: "Kommunikation",
  medizinische_lage: "Medizinische Lage",
  versorgung_im_alltag: "Versorgung im Alltag",
};

function isM1BlockId(value: unknown): value is M1BlockId {
  return (
    typeof value === "string" &&
    (M1_BLOCK_IDS as ReadonlyArray<string>).includes(value)
  );
}

/**
 * Schritt C des Ergänzungs-Flows: additiver Schreibpfad für Fallergänzungen.
 *
 * Verhalten (bewusst minimal und additiv):
 *   * Auth + Owner-Check wie in den übrigen `/api/cases/[id]/...`-Routen.
 *   * Bestätigte Fälle (`doctor_confirmed = true` oder
 *     `clinical_status === "confirmed"`) werden mit 403 hart geblockt.
 *   * Eingabe: Liste von M1-Block-IDs, die als „neu unklar" ergänzt werden
 *     sollen. Bereits aktive Blöcke werden defensiv ignoriert.
 *   * Es werden nur die noch nicht aktiven Checkpoints zu
 *     `active_checkpoints` ergänzt – bestehende Einträge (inkl. Status,
 *     Antworten, MULTI_SELECTs) bleiben **unverändert**.
 *   * `block_status_anchor` wird minimal additiv ergänzt: für M1-Block-IDs,
 *     die noch keinen Eintrag haben, wird ein neuer `BlockSummary` mit
 *     `OFFEN` angehängt. Bestehende Einträge bleiben **unverändert**.
 *   * Es wird **kein** existierender PrefillRun verändert (keine Merge-,
 *     keine Reset-Logik). Existiert bereits ein offener Run, wird er
 *     idempotent wiederverwendet. Andernfalls wird via `createOpenRun`
 *     ein neuer offener Run mit `source = "mfa"` und dem **neuen
 *     Gesamtstand** der aktiven Checkpoints als Snapshot angelegt.
 *   * `m1_snapshot_initial` wird **nicht** angefasst.
 *   * Antwortet mit `{ ok, redirect: "/cases/[id]/m2", … }`. Den eigentlichen
 *     Redirect führt der Client aus.
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

    const body = (await req.json().catch(() => ({}))) as {
      blocks?: unknown;
    };
    const requestedBlocks: M1BlockId[] = Array.isArray(body?.blocks)
      ? Array.from(new Set(body.blocks.filter(isM1BlockId)))
      : [];

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        active_checkpoints: true,
        block_status_anchor: true,
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
    const existingCheckpoints: ActiveCheckpoint[] = Array.isArray(
      session.active_checkpoints,
    )
      ? (session.active_checkpoints as ActiveCheckpoint[])
      : [];

    // Bereits aktive M1-Blöcke nur aus Standard-Checkpoints (K01–K09)
    // ableiten – Always-present MULTI_SELECT-Checkpoints (K10/K11) tragen
    // zwar eine `block_id`, sind aber unabhängig von einer M1-Aktivierung
    // im Fall vorhanden und dürfen den jeweiligen Block daher nicht als
    // „bereits aktiv" markieren.
    const activeBlockIds = new Set<M1BlockId>();
    for (const cp of existingCheckpoints) {
      const cpId = cp?.id;
      if (typeof cpId !== "string") continue;
      if (!Object.prototype.hasOwnProperty.call(CHECKPOINT_CATALOGUE, cpId)) {
        continue;
      }
      if (isM1BlockId(cp?.block_id)) {
        activeBlockIds.add(cp.block_id);
      }
    }

    // Nur Blöcke berücksichtigen, die wirklich neu sind.
    const newBlocks = requestedBlocks.filter((b) => !activeBlockIds.has(b));

    // Wenn nichts Neues dazukommt: kein Schreibchaos – idempotent gegen den
    // ggf. bereits offenen Run, danach Redirect nach M2.
    if (newBlocks.length === 0) {
      const existingOpen = await getOpenRun(id);
      return NextResponse.json({
        ok: true,
        added_blocks: [],
        added_checkpoint_ids: [],
        runId: existingOpen?.id ?? null,
        sequence: existingOpen?.sequence ?? null,
        reused: existingOpen ? true : false,
        noop: true,
        redirect: redirectTo,
      });
    }

    // Aus den neuen Blöcken eine Mini-M1-Auswahl bauen (nur diese Blöcke
    // auf "unklar"; restliche bleiben "klar" und liefern nichts) und über
    // die bestehende Hydrate-Pipeline in vollständige Checkpoint-Objekte
    // überführen. Das stellt sicher, dass die gleiche Quelle/Form wie bei
    // der Fallanlage verwendet wird – keine eigene Block-Logik.
    const supplementSelection: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
    };
    for (const b of newBlocks) supplementSelection[b] = "unklar";

    const hydrated = hydrateActiveCheckpointsFromSnapshot(
      buildM1SnapshotInitial(supplementSelection),
    );

    const existingIds = new Set(existingCheckpoints.map((cp) => cp.id));
    const toAdd = hydrated.filter((cp) => !existingIds.has(cp.id));

    const updatedCheckpoints: ActiveCheckpoint[] = [
      ...existingCheckpoints,
      ...toAdd,
    ];

    // `block_status_anchor` minimal additiv ergänzen: bestehende Einträge
    // bleiben unverändert, neue M1-Blöcke werden mit `OFFEN` angefügt.
    const existingAnchor: BlockSummary[] = Array.isArray(
      session.block_status_anchor,
    )
      ? (session.block_status_anchor as BlockSummary[])
      : [];
    const anchorIds = new Set(existingAnchor.map((b) => b.block_id));
    const anchorAdditions: BlockSummary[] = newBlocks
      .filter((b) => !anchorIds.has(b))
      .map((b) => ({
        block_id: b,
        block_title: M1_BLOCK_TITLES[b],
        block_status: BlockStatus.OFFEN,
        active_checkpoint_count: hydrated.filter((cp) => cp.block_id === b)
          .length,
      }));
    const updatedAnchor =
      anchorAdditions.length > 0
        ? [...existingAnchor, ...anchorAdditions]
        : existingAnchor;

    // Nur schreiben, wenn sich tatsächlich etwas ändert.
    if (toAdd.length > 0 || anchorAdditions.length > 0) {
      await prisma.caseSession.update({
        where: { id },
        data: {
          active_checkpoints: updatedCheckpoints,
          ...(anchorAdditions.length > 0
            ? { block_status_anchor: updatedAnchor }
            : {}),
        },
      });
    }

    // Offenen Run idempotent wiederverwenden oder neu anlegen. Bestehende
    // (eingefrorene oder offene) Runs werden nicht modifiziert.
    const existingOpen = await getOpenRun(id);
    if (existingOpen) {
      return NextResponse.json({
        ok: true,
        added_blocks: newBlocks,
        added_checkpoint_ids: toAdd.map((cp) => cp.id),
        runId: existingOpen.id,
        sequence: existingOpen.sequence,
        reused: true,
        redirect: redirectTo,
      });
    }

    try {
      const run = await createOpenRun({
        caseId: id,
        source: "mfa",
        activeCheckpoints: updatedCheckpoints,
        createdByAccountId: account.id,
      });
      return NextResponse.json({
        ok: true,
        added_blocks: newBlocks,
        added_checkpoint_ids: toAdd.map((cp) => cp.id),
        runId: run.id,
        sequence: run.sequence,
        reused: false,
        redirect: redirectTo,
      });
    } catch (err) {
      if (err instanceof PrefillRunError && err.code === "open_run_exists") {
        const open = await getOpenRun(id);
        if (open) {
          return NextResponse.json({
            ok: true,
            added_blocks: newBlocks,
            added_checkpoint_ids: toAdd.map((cp) => cp.id),
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
      console.error("[cases/[id]/m1/supplement]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[cases/[id]/m1/supplement]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Fallergänzung konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
