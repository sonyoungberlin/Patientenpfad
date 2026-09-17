CREATE TABLE "PublicQuestionnaireHandoff" (
  "parent_session_id" TEXT NOT NULL,
  "secret_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "follow_up_session_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicQuestionnaireHandoff_pkey" PRIMARY KEY ("parent_session_id")
);

CREATE UNIQUE INDEX "PublicQuestionnaireHandoff_secret_hash_key"
  ON "PublicQuestionnaireHandoff"("secret_hash");
CREATE UNIQUE INDEX "PublicQuestionnaireHandoff_follow_up_session_id_key"
  ON "PublicQuestionnaireHandoff"("follow_up_session_id");
CREATE INDEX "PublicQuestionnaireHandoff_expires_at_idx"
  ON "PublicQuestionnaireHandoff"("expires_at");

ALTER TABLE "PublicQuestionnaireHandoff"
  ADD CONSTRAINT "PublicQuestionnaireHandoff_parent_session_id_fkey"
  FOREIGN KEY ("parent_session_id") REFERENCES "PatientQuestionnaireSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicQuestionnaireHandoff"
  ADD CONSTRAINT "PublicQuestionnaireHandoff_follow_up_session_id_fkey"
  FOREIGN KEY ("follow_up_session_id") REFERENCES "PatientQuestionnaireSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicQuestionnaireHandoff"
  ADD CONSTRAINT "PublicQuestionnaireHandoff_status_check" CHECK (
    (
      "status" IN ('waiting', 'closed')
      AND "follow_up_session_id" IS NULL
    )
    OR "status" = 'questionnaire_ready'
  );

ALTER TABLE "PatientQuestionnaireSession"
  ADD CONSTRAINT "PatientQuestionnaireSession_owner_or_kiosk_check_v2" CHECK (
    (
      "source" = 'kiosk_direct'
      AND "owner_account_id" IS NULL
      AND "owner_practice_id" IS NOT NULL
      AND "created_by_kiosk_device_id" IS NOT NULL
    )
    OR (
      "source" = 'public_check_in'
      AND "owner_account_id" IS NULL
      AND "owner_practice_id" IS NOT NULL
      AND "created_by_kiosk_device_id" IS NULL
    )
    OR (
      "source" NOT IN ('kiosk_direct', 'public_check_in')
      AND "owner_account_id" IS NOT NULL
      AND "created_by_kiosk_device_id" IS NULL
    )
  ) NOT VALID;

ALTER TABLE "PatientQuestionnaireSession"
  VALIDATE CONSTRAINT "PatientQuestionnaireSession_owner_or_kiosk_check_v2";

ALTER TABLE "PatientQuestionnaireSession"
  DROP CONSTRAINT "PatientQuestionnaireSession_owner_or_kiosk_check";

ALTER TABLE "PatientQuestionnaireSession"
  RENAME CONSTRAINT "PatientQuestionnaireSession_owner_or_kiosk_check_v2"
  TO "PatientQuestionnaireSession_owner_or_kiosk_check";