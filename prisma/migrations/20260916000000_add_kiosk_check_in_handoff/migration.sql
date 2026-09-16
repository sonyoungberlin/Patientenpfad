ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "kiosk_handoff_status" TEXT,
  ADD COLUMN "kiosk_follow_up_session_id" TEXT;

CREATE UNIQUE INDEX "PatientQuestionnaireSession_kiosk_follow_up_session_id_key"
  ON "PatientQuestionnaireSession"("kiosk_follow_up_session_id");

ALTER TABLE "PatientQuestionnaireSession"
  ADD CONSTRAINT "PatientQuestionnaireSession_kiosk_follow_up_session_id_fkey"
  FOREIGN KEY ("kiosk_follow_up_session_id") REFERENCES "PatientQuestionnaireSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientQuestionnaireSession"
  ADD CONSTRAINT "PatientQuestionnaireSession_kiosk_handoff_check" CHECK (
    (
      "kiosk_handoff_status" IS NULL
      AND "kiosk_follow_up_session_id" IS NULL
    )
    OR (
      "source" = 'kiosk_direct'
      AND "created_by_kiosk_device_id" IS NOT NULL
      AND (
        (
          "kiosk_handoff_status" IN ('waiting', 'closed')
          AND "kiosk_follow_up_session_id" IS NULL
        )
        OR "kiosk_handoff_status" = 'questionnaire_ready'
      )
    )
  );