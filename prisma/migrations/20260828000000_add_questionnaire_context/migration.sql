-- Office-Fragebogen: Context-Feld zur Trennung von Patient- und Office-Sessions.
-- DEFAULT "patient" klassifiziert alle Bestandszeilen korrekt ohne Backfill.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "context" TEXT NOT NULL DEFAULT 'patient';
