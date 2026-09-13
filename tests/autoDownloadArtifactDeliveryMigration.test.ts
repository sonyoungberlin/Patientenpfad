import fs from "fs";
import path from "path";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "prisma/migrations/20260913010000_add_questionnaire_artifact_delivery/migration.sql",
  ),
  "utf8",
);

describe("QuestionnaireArtifactDelivery-Migration", () => {
  it("legt Delivery-Tabelle, Artefakttypen und Relationen additiv an", () => {
    expect(migration).toContain(
      'CREATE TYPE "QuestionnaireArtifactType" AS ENUM (\'PDF\', \'XML\', \'GDT\')',
    );
    expect(migration).toContain('CREATE TABLE "QuestionnaireArtifactDelivery"');
    expect(migration).toContain(
      'REFERENCES "PatientQuestionnaireSession"("id") ON DELETE RESTRICT',
    );
    expect(migration).toContain(
      'REFERENCES "PracticeAutoDownloadDevice"("id") ON DELETE RESTRICT',
    );
  });

  it("erzwingt genau eine Delivery pro Session und Artefakttyp", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "QuestionnaireArtifactDelivery_session_id_artifact_type_key" ON "QuestionnaireArtifactDelivery"("session_id", "artifact_type")',
    );
  });

  it("indexiert offene Leases, Ablauf, Gerät und ACK-Zustand", () => {
    expect(migration).toContain(
      '"QuestionnaireArtifactDelivery_acknowledged_at_lease_expires_at_idx"',
    );
    expect(migration).toContain(
      '"QuestionnaireArtifactDelivery_lease_expires_at_idx"',
    );
    expect(migration).toContain(
      '"QuestionnaireArtifactDelivery_device_id_idx"',
    );
  });
});
