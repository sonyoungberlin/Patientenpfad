-- Phase 3a: Technische Grundlage für öffentliche Website-Fragebögen.
-- Migration ist rein additiv:
--   * Account erhält Feld `website_forms_enabled` (Default false, KEIN Backfill).
--   * Neue Tabelle `PracticeQuestionnaireForm` für künftige öffentliche Formulare.
--   * `PatientQuestionnaireSession` erhält `source` (Default 'internal_link',
--     wodurch Bestandszeilen automatisch korrekt klassifiziert werden) sowie
--     nullable Felder für Bestätigungs-Token, Confirm-Zeitpunkt und Submitter-
--     E-Mail-Hash.
-- Es werden keine bestehenden Spalten umbenannt, gelöscht oder NOT-NULL gemacht.

-- 1. Account: neues Feature-Flag, keine Backfill-Aktualisierung.
ALTER TABLE "Account" ADD COLUMN "website_forms_enabled" BOOLEAN NOT NULL DEFAULT false;

-- 2. Neue Tabelle für öffentliche Praxis-Formulare.
CREATE TABLE "PracticeQuestionnaireForm" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "owner_account_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "selected_block_ids" JSONB NOT NULL,
    "intro_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PracticeQuestionnaireForm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeQuestionnaireForm_slug_key" ON "PracticeQuestionnaireForm"("slug");
CREATE INDEX "PracticeQuestionnaireForm_owner_account_id_createdAt_idx" ON "PracticeQuestionnaireForm"("owner_account_id", "createdAt");

ALTER TABLE "PracticeQuestionnaireForm"
  ADD CONSTRAINT "PracticeQuestionnaireForm_owner_account_id_fkey"
  FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. PatientQuestionnaireSession: neue Felder.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'internal_link',
  ADD COLUMN "practice_form_id" TEXT,
  ADD COLUMN "confirm_token" TEXT,
  ADD COLUMN "confirm_token_expires_at" TIMESTAMP(3),
  ADD COLUMN "confirmed_at" TIMESTAMP(3),
  ADD COLUMN "submitter_email_hash" TEXT;

CREATE UNIQUE INDEX "PatientQuestionnaireSession_confirm_token_key" ON "PatientQuestionnaireSession"("confirm_token");

ALTER TABLE "PatientQuestionnaireSession"
  ADD CONSTRAINT "PatientQuestionnaireSession_practice_form_id_fkey"
  FOREIGN KEY ("practice_form_id") REFERENCES "PracticeQuestionnaireForm"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
