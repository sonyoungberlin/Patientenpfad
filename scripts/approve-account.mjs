#!/usr/bin/env node
/**
 * Admin-CLI zur Account-Freischaltung.
 *
 * Verwendung:
 *   npm run approve-email  -- test@example.com
 *   npm run revoke-email   -- test@example.com
 *   npm run list-accounts
 *
 * Oder direkt:
 *   node scripts/approve-account.mjs approve test@example.com
 *   node scripts/approve-account.mjs revoke  test@example.com
 *   node scripts/approve-account.mjs list
 *
 * Voraussetzung: DATABASE_URL muss in der Umgebung gesetzt sein (z.B. via .env).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [, , command, email] = process.argv;

async function run() {
  try {
    if (command === "approve") {
      if (!email) {
        console.error("Fehler: Bitte E-Mail angeben.");
        console.error("  node scripts/approve-account.mjs approve <email>");
        process.exit(1);
      }

      const account = await prisma.account.findUnique({ where: { email } });
      if (!account) {
        console.error(`Fehler: Kein Account mit E-Mail "${email}" gefunden.`);
        console.error("Tipp: Tester muss sich zuerst einmal über die App einloggen.");
        process.exit(1);
      }

      await prisma.account.update({
        where: { email },
        data: { is_approved: true },
      });

      console.log(`✓ Account "${email}" wurde freigeschaltet.`);
    } else if (command === "revoke") {
      if (!email) {
        console.error("Fehler: Bitte E-Mail angeben.");
        console.error("  node scripts/approve-account.mjs revoke <email>");
        process.exit(1);
      }

      const account = await prisma.account.findUnique({ where: { email } });
      if (!account) {
        console.error(`Fehler: Kein Account mit E-Mail "${email}" gefunden.`);
        process.exit(1);
      }

      await prisma.account.update({
        where: { email },
        data: { is_approved: false },
      });

      console.log(`✓ Account "${email}" wurde gesperrt.`);
    } else if (command === "set-admin") {
      if (!email) {
        console.error("Fehler: Bitte E-Mail angeben.");
        console.error("  node scripts/approve-account.mjs set-admin <email>");
        process.exit(1);
      }

      const account = await prisma.account.findUnique({ where: { email } });
      if (!account) {
        console.error(`Fehler: Kein Account mit E-Mail "${email}" gefunden.`);
        console.error("Tipp: Tester muss sich zuerst einmal über die App einloggen.");
        process.exit(1);
      }

      await prisma.account.update({
        where: { email },
        data: { is_admin: true, is_approved: true },
      });

      console.log(`✓ Account "${email}" ist jetzt Admin (und freigeschaltet).`);
    } else if (command === "list") {
      const accounts = await prisma.account.findMany({
        select: { email: true, is_approved: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      if (accounts.length === 0) {
        console.log("Keine Accounts vorhanden.");
      } else {
        console.log("Accounts:");
        for (const acc of accounts) {
          const status = acc.is_approved ? "✓ freigeschaltet" : "✗ gesperrt";
          const date = acc.createdAt.toISOString().slice(0, 10);
          console.log(`  ${acc.email}  –  ${status}  (angelegt: ${date})`);
        }
      }
    } else {
      console.log("Verwendung:");
      console.log("  node scripts/approve-account.mjs approve   <email>");
      console.log("  node scripts/approve-account.mjs revoke    <email>");
      console.log("  node scripts/approve-account.mjs set-admin <email>");
      console.log("  node scripts/approve-account.mjs list");
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
