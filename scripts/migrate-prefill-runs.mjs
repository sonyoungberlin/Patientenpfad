#!/usr/bin/env node
/**
 * Idempotente Bestandsdaten-Migration: erzeugt aus jedem `CaseSession` mit
 * tatsächlich gespeicherten Antworten in `ctx_prefill` genau **einen** ersten
 * `PrefillRun` (sequence = 1).
 *
 * Regeln (festgezurrt im Plan):
 *   - sequence            = 1
 *   - source              = preparation_mode, falls in {mfa, conversation, patient};
 *                           sonst defensiver Fallback "mfa"
 *   - answers             = ctx_prefill (1:1)
 *   - active_checkpoints  = CaseSession.active_checkpoints (Snapshot)
 *   - frozen_at           = CaseSession.updatedAt
 *   - created_by_account  = owner_account_id, außer bei source="patient" → null
 *   - patient_token_used  = null (historisch nicht rekonstruierbar)
 *
 * Nicht migriert werden Fälle ohne tatsächlich gespeicherte Antworten
 * (`ctx_prefill` null, leeres Array oder leeres Objekt). Auch Fälle mit
 *   m2_status = "waiting_for_patient" / "skipped"
 * bekommen keinen Run, solange `ctx_prefill` leer ist.
 *
 * Idempotenz: Existiert für einen Fall bereits ein PrefillRun (egal welche
 * sequence), wird er übersprungen.
 *
 * Verwendung:
 *   node scripts/migrate-prefill-runs.mjs            # Dry-Run (Default)
 *   node scripts/migrate-prefill-runs.mjs --apply    # tatsächlich schreiben
 *
 * Voraussetzung: DATABASE_URL ist gesetzt und die Schema-Migration
 * `20260423040000_add_prefill_run` wurde bereits angewendet.
 */

import { createRequire } from "node:module";

import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const {
  FALLBACK_SOURCE,
  hasSavedPrefill,
  deriveSource,
  deriveCreatedBy,
  normalizeActiveCheckpoints,
  parseArgs,
} = require("./migrate-prefill-runs.helpers.cjs");

const PAGE_SIZE = 200;

async function migrate({ apply, verbose }) {
  const prisma = new PrismaClient();
  const stats = {
    scanned: 0,
    skippedEmpty: 0,
    skippedExistingRun: 0,
    sourceFromMode: 0,
    sourceFallback: 0,
    created: 0,
    failed: 0,
  };

  try {
    let cursor = undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await prisma.caseSession.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: {
          id: true,
          updatedAt: true,
          ctx_prefill: true,
          active_checkpoints: true,
          preparation_mode: true,
          owner_account_id: true,
        },
      });

      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      for (const session of batch) {
        stats.scanned += 1;

        if (!hasSavedPrefill(session.ctx_prefill)) {
          stats.skippedEmpty += 1;
          continue;
        }

        // Idempotenz: Fall überspringen, wenn bereits irgendein Run existiert.
        const existing = await prisma.prefillRun.findFirst({
          where: { case_id: session.id },
          select: { id: true },
        });
        if (existing) {
          stats.skippedExistingRun += 1;
          continue;
        }

        const source = deriveSource(session.preparation_mode);
        if (source === session.preparation_mode) {
          stats.sourceFromMode += 1;
        } else {
          stats.sourceFallback += 1;
          if (verbose) {
            console.warn(
              `[fallback-source] case=${session.id} preparation_mode=${JSON.stringify(
                session.preparation_mode,
              )} → source="${FALLBACK_SOURCE}"`,
            );
          }
        }

        const data = {
          case_id: session.id,
          sequence: 1,
          source,
          active_checkpoints: normalizeActiveCheckpoints(session.active_checkpoints),
          answers: session.ctx_prefill,
          created_at: session.updatedAt,
          frozen_at: session.updatedAt,
          created_by_account_id: deriveCreatedBy(source, session.owner_account_id),
          patient_token_used: null,
        };

        if (!apply) {
          if (verbose) {
            console.log(`[dry-run] would create PrefillRun for case=${session.id} source=${source}`);
          }
          stats.created += 1;
          continue;
        }

        try {
          await prisma.prefillRun.create({ data });
          stats.created += 1;
        } catch (err) {
          stats.failed += 1;
          console.error(
            `[error] case=${session.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      if (batch.length < PAGE_SIZE) break;
    }

    console.log(apply ? "Migration applied." : "Dry run complete (no writes).");
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

// CLI-Entry. Das Skript wird als Knoten-CLI aufgerufen; die Tests importieren
// ausschließlich die pure Helper-Datei (`*.helpers.cjs`), nicht dieses Modul.
const args = parseArgs(process.argv.slice(2));
migrate(args).catch((err) => {
  console.error(err);
  process.exit(1);
});
