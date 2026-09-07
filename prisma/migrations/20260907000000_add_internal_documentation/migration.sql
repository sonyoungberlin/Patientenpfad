ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "session_kind" TEXT NOT NULL DEFAULT 'patient_communication';

ALTER TABLE "QuestionnaireKioskDevice"
  ADD COLUMN "capabilities" JSONB NOT NULL DEFAULT '["questionnaires"]';

CREATE INDEX "PatientQuestionnaireSession_session_kind_idx"
  ON "PatientQuestionnaireSession"("session_kind");