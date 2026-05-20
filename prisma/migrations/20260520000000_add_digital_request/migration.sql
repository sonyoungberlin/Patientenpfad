-- Phase A: DigitalRequest – Digitale Anfrage / Anliegen
-- Neue Tabelle, additiv. Kein destructiver Change.

CREATE TABLE "DigitalRequest" (
  "id"                       TEXT         NOT NULL,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,
  "submitter_name"           TEXT         NOT NULL,
  "submitter_email"          TEXT         NOT NULL,
  "submitter_email_hash"     TEXT         NOT NULL,
  "birth_date_hash"          TEXT,
  "concern_text"             TEXT,
  "status"                   TEXT         NOT NULL DEFAULT 'new',
  "owner_account_id"         TEXT         NOT NULL,
  "owner_practice_id"        TEXT,
  "practice_form_id"         TEXT,
  "patient_reference"        TEXT,
  "questionnaire_session_id" TEXT,
  "deleted_at"               TIMESTAMP(3),

  CONSTRAINT "DigitalRequest_pkey" PRIMARY KEY ("id")
);

-- Eindeutigkeit: eine DigitalRequest → maximal eine PatientQuestionnaireSession
CREATE UNIQUE INDEX "DigitalRequest_questionnaire_session_id_key"
  ON "DigitalRequest"("questionnaire_session_id");

-- Abfrage-Indizes (Practice-first)
CREATE INDEX "DigitalRequest_owner_practice_id_createdAt_idx"
  ON "DigitalRequest"("owner_practice_id", "createdAt");

CREATE INDEX "DigitalRequest_owner_account_id_createdAt_idx"
  ON "DigitalRequest"("owner_account_id", "createdAt");

-- Fremdschlüssel
ALTER TABLE "DigitalRequest"
  ADD CONSTRAINT "DigitalRequest_owner_account_id_fkey"
  FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DigitalRequest"
  ADD CONSTRAINT "DigitalRequest_owner_practice_id_fkey"
  FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DigitalRequest"
  ADD CONSTRAINT "DigitalRequest_practice_form_id_fkey"
  FOREIGN KEY ("practice_form_id") REFERENCES "PracticeQuestionnaireForm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DigitalRequest"
  ADD CONSTRAINT "DigitalRequest_questionnaire_session_id_fkey"
  FOREIGN KEY ("questionnaire_session_id") REFERENCES "PatientQuestionnaireSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
