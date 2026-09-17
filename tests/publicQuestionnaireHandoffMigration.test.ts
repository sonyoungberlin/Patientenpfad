import fs from "fs";
import path from "path";

const migration = fs.readFileSync(path.join(
  process.cwd(),
  "prisma/migrations/20260917090000_add_public_questionnaire_handoff/migration.sql",
), "utf8");

describe("PublicQuestionnaireHandoff migration", () => {
  it("erstellt die isolierte 1:1-Relation mit sicheren Delete-Regeln", () => {
    expect(migration).toContain('CREATE TABLE "PublicQuestionnaireHandoff"');
    expect(migration).toContain('PRIMARY KEY ("parent_session_id")');
    expect(migration).toContain('"PublicQuestionnaireHandoff_secret_hash_key"');
    expect(migration).toContain('"PublicQuestionnaireHandoff_follow_up_session_id_key"');
    expect(migration).toContain('ON DELETE CASCADE ON UPDATE CASCADE');
    expect(migration).toContain('ON DELETE SET NULL ON UPDATE CASCADE');
    expect(migration).toContain("'waiting', 'closed'");
    expect(migration).toContain("OR \"status\" = 'questionnaire_ready'");
  });

  it("erweitert Ownership disjunkt ohne Kiosk aufzuweichen", () => {
    expect(migration).toContain('"source" = \'kiosk_direct\'');
    expect(migration).toContain('"source" = \'public_check_in\'');
    expect(migration).toContain('"created_by_kiosk_device_id" IS NOT NULL');
    expect(migration).toContain('"created_by_kiosk_device_id" IS NULL');
    expect(migration).toContain('"source" NOT IN (\'kiosk_direct\', \'public_check_in\')');
    expect(migration).not.toMatch(/INSERT INTO|UPDATE "PatientQuestionnaireSession"/);
  });
});