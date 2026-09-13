CREATE TYPE "QuestionnaireArtifactType" AS ENUM ('PDF', 'XML', 'GDT');

CREATE TABLE "QuestionnaireArtifactDelivery" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "artifact_type" "QuestionnaireArtifactType" NOT NULL,
  "device_id" TEXT,
  "lease_token_hash" TEXT,
  "lease_expires_at" TIMESTAMP(6),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "acknowledged_at" TIMESTAMP(6),
  "content_sha256" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionnaireArtifactDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionnaireArtifactDelivery_lease_token_hash_key" ON "QuestionnaireArtifactDelivery"("lease_token_hash");
CREATE UNIQUE INDEX "QuestionnaireArtifactDelivery_session_id_artifact_type_key" ON "QuestionnaireArtifactDelivery"("session_id", "artifact_type");
CREATE INDEX "QuestionnaireArtifactDelivery_acknowledged_at_lease_expires_at_idx" ON "QuestionnaireArtifactDelivery"("acknowledged_at", "lease_expires_at");
CREATE INDEX "QuestionnaireArtifactDelivery_lease_expires_at_idx" ON "QuestionnaireArtifactDelivery"("lease_expires_at");
CREATE INDEX "QuestionnaireArtifactDelivery_device_id_idx" ON "QuestionnaireArtifactDelivery"("device_id");

ALTER TABLE "QuestionnaireArtifactDelivery"
  ADD CONSTRAINT "QuestionnaireArtifactDelivery_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "PatientQuestionnaireSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireArtifactDelivery"
  ADD CONSTRAINT "QuestionnaireArtifactDelivery_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "PracticeAutoDownloadDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
