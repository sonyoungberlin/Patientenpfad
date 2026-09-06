-- AlterTable
ALTER TABLE "PatientQuestionnaireSession"
  ALTER COLUMN "owner_account_id" DROP NOT NULL,
  ADD COLUMN "created_by_kiosk_device_id" TEXT;

-- CreateTable
CREATE TABLE "QuestionnaireKioskDevice" (
  "id" TEXT NOT NULL,
  "practice_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credential_hash" TEXT NOT NULL,
  "pin_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_account_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "failed_pin_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3),
  "unlock_token_hash" TEXT,
  "unlock_expires_at" TIMESTAMP(3),
  CONSTRAINT "QuestionnaireKioskDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionnaireKioskDevice_credential_hash_key" ON "QuestionnaireKioskDevice"("credential_hash");
CREATE UNIQUE INDEX "QuestionnaireKioskDevice_unlock_token_hash_key" ON "QuestionnaireKioskDevice"("unlock_token_hash");
CREATE INDEX "QuestionnaireKioskDevice_practice_id_created_at_idx" ON "QuestionnaireKioskDevice"("practice_id", "created_at");
CREATE INDEX "QuestionnaireKioskDevice_practice_id_is_active_revoked_at_idx" ON "QuestionnaireKioskDevice"("practice_id", "is_active", "revoked_at");
CREATE INDEX "PatientQuestionnaireSession_created_by_kiosk_device_id_crea_idx" ON "PatientQuestionnaireSession"("created_by_kiosk_device_id", "createdAt");

ALTER TABLE "QuestionnaireKioskDevice" ADD CONSTRAINT "QuestionnaireKioskDevice_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireKioskDevice" ADD CONSTRAINT "QuestionnaireKioskDevice_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientQuestionnaireSession" ADD CONSTRAINT "PatientQuestionnaireSession_created_by_kiosk_device_id_fkey" FOREIGN KEY ("created_by_kiosk_device_id") REFERENCES "QuestionnaireKioskDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientQuestionnaireSession" ADD CONSTRAINT "PatientQuestionnaireSession_owner_or_kiosk_check" CHECK (
  (
    "source" = 'kiosk_direct'
    AND "owner_account_id" IS NULL
    AND "owner_practice_id" IS NOT NULL
    AND "created_by_kiosk_device_id" IS NOT NULL
  )
  OR (
    "source" <> 'kiosk_direct'
    AND "owner_account_id" IS NOT NULL
    AND "created_by_kiosk_device_id" IS NULL
  )
);