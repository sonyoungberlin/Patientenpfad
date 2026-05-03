#!/usr/bin/env node
/**
 * Phase P1: Verifikationsskript für den Practice/Membership-Backfill.
 *
 * Führt dieselben sieben Invarianten-Checks aus wie der DO-Block der
 * Migration `20260505000000_add_practice_and_membership`. Gedacht für den
 * manuellen Lauf gegen die Pilot-DB vor und nach dem Deploy.
 *
 * Verwendung:
 *   node scripts/verify-practice-backfill.mjs
 *
 * Voraussetzung: DATABASE_URL muss in der Umgebung gesetzt sein.
 *
 * Exit-Code:
 *   0 — alle Checks ohne Treffer (Backfill konsistent).
 *   1 — mindestens ein Check schlug an oder das Skript brach ab.
 *
 * Bewusst nur lesend: das Skript ändert keine Daten.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Jeder Check liefert die Anzahl der Verstöße (BIGINT als string aus pg).
 * Erwartet wird überall 0.
 */
const CHECKS = [
  {
    id: 1,
    description: "Genau eine Membership pro Account",
    sql: `SELECT COUNT(*)::bigint AS n FROM (
            SELECT "account_id" FROM "PracticeMembership"
             GROUP BY "account_id" HAVING COUNT(*) <> 1
          ) x`,
  },
  {
    id: 2,
    description: "Genau ein OWNER pro Practice",
    sql: `SELECT COUNT(*)::bigint AS n FROM (
            SELECT "practice_id" FROM "PracticeMembership"
             WHERE "role" = 'OWNER'
             GROUP BY "practice_id" HAVING COUNT(*) <> 1
          ) x`,
  },
  {
    id: 3,
    description: "Kein Account ohne Membership",
    sql: `SELECT COUNT(*)::bigint AS n
            FROM "Account" a
            LEFT JOIN "PracticeMembership" m ON m."account_id" = a."id"
           WHERE m."id" IS NULL`,
  },
  {
    id: "4a",
    description: "CaseSession: owner_practice_id für jede nicht-Gast-Zeile gesetzt",
    sql: `SELECT COUNT(*)::bigint AS n FROM "CaseSession"
           WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL`,
  },
  {
    id: "4b",
    description: "InquirySession: owner_practice_id für jede nicht-Gast-Zeile gesetzt",
    sql: `SELECT COUNT(*)::bigint AS n FROM "InquirySession"
           WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL`,
  },
  {
    id: "4c",
    description: "PatientQuestionnaireSession: owner_practice_id für jede Zeile gesetzt",
    sql: `SELECT COUNT(*)::bigint AS n FROM "PatientQuestionnaireSession"
           WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL`,
  },
  {
    id: "4d",
    description: "PracticeQuestionnaireForm: owner_practice_id für jede Zeile gesetzt",
    sql: `SELECT COUNT(*)::bigint AS n FROM "PracticeQuestionnaireForm"
           WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL`,
  },
  {
    id: "5a",
    description: "CaseSession: owner_practice_id konsistent mit OWNER-Membership",
    sql: `SELECT COUNT(*)::bigint AS n FROM "CaseSession" t
            JOIN "PracticeMembership" m
              ON m."practice_id" = t."owner_practice_id" AND m."role" = 'OWNER'
           WHERE t."owner_account_id" IS NOT NULL
             AND m."account_id" <> t."owner_account_id"`,
  },
  {
    id: "5b",
    description: "InquirySession: owner_practice_id konsistent mit OWNER-Membership",
    sql: `SELECT COUNT(*)::bigint AS n FROM "InquirySession" t
            JOIN "PracticeMembership" m
              ON m."practice_id" = t."owner_practice_id" AND m."role" = 'OWNER'
           WHERE t."owner_account_id" IS NOT NULL
             AND m."account_id" <> t."owner_account_id"`,
  },
  {
    id: "5c",
    description: "PatientQuestionnaireSession: owner_practice_id konsistent",
    sql: `SELECT COUNT(*)::bigint AS n FROM "PatientQuestionnaireSession" t
            JOIN "PracticeMembership" m
              ON m."practice_id" = t."owner_practice_id" AND m."role" = 'OWNER'
           WHERE m."account_id" <> t."owner_account_id"`,
  },
  {
    id: "5d",
    description: "PracticeQuestionnaireForm: owner_practice_id konsistent",
    sql: `SELECT COUNT(*)::bigint AS n FROM "PracticeQuestionnaireForm" t
            JOIN "PracticeMembership" m
              ON m."practice_id" = t."owner_practice_id" AND m."role" = 'OWNER'
           WHERE m."account_id" <> t."owner_account_id"`,
  },
  {
    id: 6,
    description: "Practice-Slugs sind eindeutig",
    sql: `SELECT COUNT(*)::bigint AS n FROM (
            SELECT "slug" FROM "Practice"
             GROUP BY "slug" HAVING COUNT(*) > 1
          ) x`,
  },
  {
    id: 7,
    description: "Carry-Over der Account-Flags 1:1 auf die OWNER-Practice",
    sql: `SELECT COUNT(*)::bigint AS n
            FROM "Account" a
            JOIN "PracticeMembership" m ON m."account_id" = a."id" AND m."role" = 'OWNER'
            JOIN "Practice"           p ON p."id"         = m."practice_id"
           WHERE a."is_approved"                   <> p."is_approved"
              OR a."inquiry_assistant_enabled"     <> p."inquiry_assistant_enabled"
              OR a."patient_communication_enabled" <> p."patient_communication_enabled"
              OR a."website_forms_enabled"         <> p."website_forms_enabled"`,
  },
];

async function run() {
  let failed = 0;
  for (const check of CHECKS) {
    const rows = await prisma.$queryRawUnsafe(check.sql);
    // BigInt aus pg wird über Number() in einen Zahlenvergleich überführt.
    const raw = rows[0]?.n ?? 0;
    const n = Number(raw);
    if (n === 0) {
      console.log(`  ok   (${check.id}) ${check.description}`);
    } else {
      failed += 1;
      console.error(`  FAIL (${check.id}) ${check.description}: ${n} Verstoß/Verstöße`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} Check(s) fehlgeschlagen.`);
    process.exit(1);
  }
  console.log(`\nAlle ${CHECKS.length} Checks ohne Treffer.`);
}

run()
  .catch((err) => {
    console.error("Verifikationsskript abgebrochen:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
