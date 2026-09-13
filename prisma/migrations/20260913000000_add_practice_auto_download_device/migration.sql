CREATE TABLE "PracticeAutoDownloadDevice" (
  "id" TEXT NOT NULL,
  "practice_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credential_hash" TEXT,
  "enrollment_token_hash" TEXT,
  "enrollment_expires_at" TIMESTAMP(3),
  "enrollment_used_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "revoked_at" TIMESTAMP(3),
  "last_seen_at" TIMESTAMP(3),
  "created_by_account_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeAutoDownloadDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeAutoDownloadDevice_credential_hash_key" ON "PracticeAutoDownloadDevice"("credential_hash");
CREATE UNIQUE INDEX "PracticeAutoDownloadDevice_enrollment_token_hash_key" ON "PracticeAutoDownloadDevice"("enrollment_token_hash");
CREATE INDEX "PracticeAutoDownloadDevice_practice_id_created_at_idx" ON "PracticeAutoDownloadDevice"("practice_id", "created_at");
CREATE INDEX "PracticeAutoDownloadDevice_practice_id_is_active_revoked_at_idx" ON "PracticeAutoDownloadDevice"("practice_id", "is_active", "revoked_at");
CREATE INDEX "PracticeAutoDownloadDevice_enrollment_expires_at_idx" ON "PracticeAutoDownloadDevice"("enrollment_expires_at");

ALTER TABLE "PracticeAutoDownloadDevice"
  ADD CONSTRAINT "PracticeAutoDownloadDevice_practice_id_fkey"
  FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PracticeAutoDownloadDevice"
  ADD CONSTRAINT "PracticeAutoDownloadDevice_created_by_account_id_fkey"
  FOREIGN KEY ("created_by_account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
