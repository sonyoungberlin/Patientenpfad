#!/usr/bin/env node
/**
 * Setzt die Anfrage-Konfigurations-Felder (inq_*) der Pilot-Praxis auf die
 * Standardwerte aus PILOT_PRACTICE_INQUIRY_CONFIG.
 *
 * Die Pilot-Praxis wird über den ersten Account mit
 *   inquiry_assistant_enabled = true
 * und dessen default_practice ermittelt.
 *
 * Hinweis zu den Werten:
 *   Die 15 Werte unten spiegeln PILOT_PRACTICE_INQUIRY_CONFIG aus
 *   lib/inquiries/practiceConfig.ts wider (nur die DB-persistierten Felder).
 *   Bei einer Änderung der Pilot-Werte MUSS DIESE DATEI EBENFALLS aktualisiert
 *   werden – und umgekehrt.
 *
 * Verwendung:
 *   node scripts/set-pilot-practice-inquiry-config.mjs            # Dry-Run (Default)
 *   node scripts/set-pilot-practice-inquiry-config.mjs --apply    # tatsächlich schreiben
 *
 * Voraussetzung: DATABASE_URL muss in der Umgebung gesetzt sein (z.B. via .env).
 */

import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Ziel-Werte – spiegeln PILOT_PRACTICE_INQUIRY_CONFIG (lib/inquiries/practiceConfig.ts)
// ---------------------------------------------------------------------------
const TARGET = {
  inq_booking_calendar_name:         "Online-Buchungskalender",
  inq_findings_review_code:          "BFSP25",
  inq_chronic_control_code:          "CHKT25",
  inq_checkup_second_code:           "CHECK25",
  inq_doctor_order_code:             "LKBP25",
  inq_upload_platform_name:          "Doctolib",
  inq_upload_platform_account_label: "Doctolib-Account",
  inq_open_consultation_days:        "täglich",
  inq_open_consultation_hours:       "9–10 Uhr",
  inq_open_consultation_cap_limited: true,
  inq_video_support_contact:         "Doctolib Support",
  inq_billing_cycle_label:           "quartalsweise",
  inq_digital_req_time_min:          8,
  inq_digital_req_time_max:          12,
  inq_digital_req_time_unit:         "Stunden",
};

const INQ_FIELDS = Object.keys(TARGET);

// ---------------------------------------------------------------------------

async function run() {
  try {
    // 1. Pilot-Account finden
    const account = await prisma.account.findFirst({
      where: { inquiry_assistant_enabled: true },
      include: {
        default_practice: {
          select: {
            id: true,
            slug: true,
            name: true,
            inq_booking_calendar_name:         true,
            inq_findings_review_code:          true,
            inq_chronic_control_code:          true,
            inq_checkup_second_code:           true,
            inq_doctor_order_code:             true,
            inq_upload_platform_name:          true,
            inq_upload_platform_account_label: true,
            inq_open_consultation_days:        true,
            inq_open_consultation_hours:       true,
            inq_open_consultation_cap_limited: true,
            inq_video_support_contact:         true,
            inq_billing_cycle_label:           true,
            inq_digital_req_time_min:          true,
            inq_digital_req_time_max:          true,
            inq_digital_req_time_unit:         true,
          },
        },
      },
    });

    if (!account) {
      console.error("Fehler: Kein Account mit inquiry_assistant_enabled = true gefunden.");
      process.exit(1);
    }

    const practice = account.default_practice;
    if (!practice) {
      console.error(
        `Fehler: Account "${account.email}" (id=${account.id}) hat keine default_practice.`,
      );
      process.exit(1);
    }

    // 2. Status anzeigen
    console.log("=".repeat(60));
    console.log(`Pilot-Praxis:  ${practice.name ?? "(kein Name)"}`);
    console.log(`Slug:          ${practice.slug ?? "(kein Slug)"}`);
    console.log(`ID:            ${practice.id}`);
    console.log("=".repeat(60));
    console.log("\nAktuell in DB vs. Zielwert:\n");

    let anyDiff = false;
    for (const field of INQ_FIELDS) {
      const current = practice[field];
      const target  = TARGET[field];
      const diff    = current !== target;
      if (diff) anyDiff = true;
      const marker = diff ? "≠" : "=";
      console.log(
        `  ${marker} ${field.padEnd(36)} ` +
        `aktuell=${JSON.stringify(current)}  →  neu=${JSON.stringify(target)}`,
      );
    }

    console.log();

    if (!anyDiff) {
      console.log("✓ Alle Felder sind bereits auf den Zielwert gesetzt. Nichts zu tun.");
      return;
    }

    if (!apply) {
      console.log("DRY-RUN – keine Änderungen geschrieben.");
      console.log("  Mit --apply ausführen, um die Werte zu setzen:");
      console.log("  node scripts/set-pilot-practice-inquiry-config.mjs --apply");
      return;
    }

    // 3. Schreiben
    await prisma.practice.update({
      where: { id: practice.id },
      data: TARGET,
    });

    // 4. Bestätigung: Neu-Lesen und anzeigen
    const updated = await prisma.practice.findUniqueOrThrow({
      where: { id: practice.id },
      select: Object.fromEntries(INQ_FIELDS.map((f) => [f, true])),
    });

    console.log("Gespeicherte Werte:");
    for (const field of INQ_FIELDS) {
      console.log(`  ✓ ${field.padEnd(36)} = ${JSON.stringify(updated[field])}`);
    }
    console.log("\n✓ Inquiry-Konfiguration der Pilot-Praxis erfolgreich gesetzt.");
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("Fehler:", err.message ?? err);
  process.exit(1);
});
