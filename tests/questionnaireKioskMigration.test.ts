import fs from "fs";
import path from "path";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "prisma/migrations/20260906000000_add_questionnaire_kiosk/migration.sql",
  ),
  "utf8",
);

function ownershipAllowed(input: {
  source: string;
  account: boolean;
  practice: boolean;
  device: boolean;
}) {
  return input.source === "kiosk_direct"
    ? !input.account && input.practice && input.device
    : input.account && !input.device;
}

describe("Questionnaire-Kiosk-Migration", () => {
  it.each([
    ["Legacy", { source: "internal_link", account: true, practice: false, device: false }],
    ["normale Session", { source: "internal_link", account: true, practice: true, device: false }],
    ["Kiosk", { source: "kiosk_direct", account: false, practice: true, device: true }],
  ])("lässt %s zu", (_label, input) => {
    expect(ownershipAllowed(input)).toBe(true);
  });

  it.each([
    ["ownerlos", { source: "internal_link", account: false, practice: false, device: false }],
    ["Kiosk mit Account statt Device", { source: "kiosk_direct", account: true, practice: true, device: false }],
    ["Kiosk ohne Practice", { source: "kiosk_direct", account: false, practice: false, device: true }],
    ["Kiosk ohne Device", { source: "kiosk_direct", account: false, practice: true, device: false }],
  ])("verbietet %s", (_label, input) => {
    expect(ownershipAllowed(input)).toBe(false);
  });

  it("enthält dieselben disjunkten Regeln und den Prisma-kompatiblen Indexnamen", () => {
    expect(migration).toContain('"source" = \'kiosk_direct\'');
    expect(migration).toContain('AND "owner_account_id" IS NULL');
    expect(migration).toContain('AND "owner_practice_id" IS NOT NULL');
    expect(migration).toContain('AND "created_by_kiosk_device_id" IS NOT NULL');
    expect(migration).toContain('"source" <> \'kiosk_direct\'');
    expect(migration).toContain('AND "owner_account_id" IS NOT NULL');
    expect(migration).toContain('AND "created_by_kiosk_device_id" IS NULL');
    expect(migration).toContain(
      '"PatientQuestionnaireSession_created_by_kiosk_device_id_crea_idx"',
    );
  });
});