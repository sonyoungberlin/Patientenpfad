-- AlterTable: Sprache der Patientensicht des Token-Fragebogens additiv ergänzen.
-- Bestandszeilen erhalten den Default "de", damit alle bestehenden Codepfade
-- unverändert deutsch bleiben. Praxis-/interne Sichten ignorieren das Feld.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "patient_language" TEXT NOT NULL DEFAULT 'de';
