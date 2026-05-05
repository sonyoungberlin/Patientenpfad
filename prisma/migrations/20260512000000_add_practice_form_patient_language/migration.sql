-- AlterTable: Sprache der Patientensicht für öffentliche Website-Formulare
-- (`PracticeQuestionnaireForm`) additiv ergänzen. Bestandszeilen erhalten
-- den Default "de", damit alle bestehenden Codepfade unverändert deutsch
-- bleiben. Praxis-/interne Sichten ignorieren das Feld.
ALTER TABLE "PracticeQuestionnaireForm"
  ADD COLUMN "patient_language" TEXT NOT NULL DEFAULT 'de';
