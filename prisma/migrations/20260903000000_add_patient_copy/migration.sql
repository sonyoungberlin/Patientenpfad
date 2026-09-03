ALTER TABLE "Practice"
  ADD COLUMN "questionnaire_confirmation_send_copy_1" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "questionnaire_confirmation_send_copy_2" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "questionnaire_confirmation_send_copy_3" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "patient_copy_email" TEXT,
  ADD COLUMN "patient_copy_return_email" TEXT,
  ADD COLUMN "patient_copy_sent_at" TIMESTAMP(3),
  ADD COLUMN "patient_copy_failed_at" TIMESTAMP(3);