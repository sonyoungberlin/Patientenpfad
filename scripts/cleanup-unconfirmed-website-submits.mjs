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

  console.log(
    `[cleanup] Gefundene abgelaufene unbestätigte Website-Sessions: ${candidates.length}`,
  );
  for (const c of candidates) {
    console.log(
      `  - id=${c.id} created=${c.createdAt.toISOString()} expired=${c.confirm_token_expires_at?.toISOString() ?? "?"} form=${c.practice_form_id ?? "?"}`,
    );
  }

  if (!apply) {
    console.log(
      "[cleanup] DRY-RUN — nichts gelöscht. Mit --apply ausführen, um die Einträge zu entfernen.",
    );
    return;
  }

  if (candidates.length === 0) {
    console.log("[cleanup] Keine Einträge zu löschen.");
    return;
  }

  // deleteMany verwendet exakt denselben Filter — defensiv gegen
  // Race-Conditions zwischen findMany und delete.
  const result = await prisma.patientQuestionnaireSession.deleteMany({
    where: filter,
  });
  console.log(`[cleanup] Gelöscht: ${result.count}`);
}

run()
  .catch((err) => {
    console.error("[cleanup] FEHLER:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
