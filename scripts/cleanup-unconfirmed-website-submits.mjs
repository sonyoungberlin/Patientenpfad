#!/usr/bin/env node
/**
 * Phase 3d: Manuell ausführbares Cleanup-Skript für unbestätigte
 * Website-Form-Submissions.
 *
 * Verwendung:
 *   node scripts/cleanup-unconfirmed-website-submits.mjs            # dry-run
 *   node scripts/cleanup-unconfirmed-website-submits.mjs --apply    # tatsächlich löschen
 *
 * Bedingungen für Löschung — alle MÜSSEN erfüllt sein:
 *   - source = "website"
 *   - status = "awaiting_email_confirmation"
 *   - confirmed_at IS NULL
 *   - confirm_token_expires_at < now()
 *
 * Ausdrücklich NICHT betroffen:
 *   - bestätigte / completed Sessions (auch nicht versehentlich)
 *   - interne Sessions (source != "website")
 *   - Sessions, deren Token noch gültig ist
 *
 * KEIN Cron-Trigger eingerichtet. Phase 3d sieht den Lauf nur manuell vor.
 *
 * Voraussetzung: DATABASE_URL muss gesetzt sein.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes("--apply");

// Strukturierte Logs — siehe docs/website-forms-operations.md.
// Bewusst KEINE Session-IDs im Log: das Cleanup darf keine
// Patient-Session-Identifier in Log-Aggregatoren tragen.
const LOG_MARKER = "[website-form/cleanup]";

function logCleanup(level, outcome, extra = {}) {
  const payload = { event: "cleanup", outcome, ...extra };
  if (level === "error") {
    console.error(LOG_MARKER, payload);
  } else {
    console.info(LOG_MARKER, payload);
  }
}

async function run() {
  const now = new Date();
  const filter = {
    source: "website",
    status: "awaiting_email_confirmation",
    confirmed_at: null,
    confirm_token_expires_at: { lt: now },
  };

  const candidates = await prisma.patientQuestionnaireSession.findMany({
    where: filter,
    select: {
      id: true,
      createdAt: true,
      practice_form_id: true,
      confirm_token_expires_at: true,
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });

  const candidate_count = candidates.length;

  if (!apply) {
    logCleanup("info", "dry_run", { mode: "dry_run", candidate_count });
    // Operativer Dry-Run-Output (lokal, NICHT für Log-Aggregator gedacht):
    for (const c of candidates) {
      console.log(
        `  - id=${c.id} created=${c.createdAt.toISOString()} expired=${c.confirm_token_expires_at?.toISOString() ?? "?"} form=${c.practice_form_id ?? "?"}`,
      );
    }
    console.log(
      "[cleanup] DRY-RUN — nichts gelöscht. Mit --apply ausführen, um die Einträge zu entfernen.",
    );
    return;
  }

  if (candidate_count === 0) {
    logCleanup("info", "apply_noop", { mode: "apply", candidate_count: 0 });
    return;
  }

  logCleanup("info", "apply_started", { mode: "apply", candidate_count });

  // deleteMany verwendet exakt denselben Filter — defensiv gegen
  // Race-Conditions zwischen findMany und delete.
  const result = await prisma.patientQuestionnaireSession.deleteMany({
    where: filter,
  });
  logCleanup("info", "apply_finished", {
    mode: "apply",
    candidate_count,
    deleted_count: result.count,
  });
}

run()
  .catch((err) => {
    const detail = err instanceof Error ? err.message : "unknown";
    logCleanup("error", "error", { mode: apply ? "apply" : "dry_run", detail });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
