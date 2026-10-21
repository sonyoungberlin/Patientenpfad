import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "prisma/migrations/20261020190000_add_kiosk_membership_mode/migration.sql",
);

describe("KIOSK-Mitgliedschafts-Migration", () => {
  it("ergänzt die Rolle und den nullable Startmodus additiv", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      `ALTER TYPE "PracticeRole" ADD VALUE IF NOT EXISTS 'KIOSK'`,
    );
    expect(migration).toContain(
      `CREATE TYPE "KioskMode" AS ENUM ('QUESTIONNAIRES', 'INTERNAL_DOCUMENTATION')`,
    );
    expect(migration).toMatch(
      /ALTER TABLE "PracticeMembership"\s+ADD COLUMN "kiosk_mode" "KioskMode";/,
    );
    expect(migration).not.toMatch(/\b(DROP|TRUNCATE|DELETE|UPDATE)\b/i);
    expect(migration).not.toMatch(/"kiosk_mode"[^;]*\bNOT NULL\b/i);
  });
});
