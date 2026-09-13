CREATE TYPE "QuestionnaireAutoExportMode" AS ENUM ('BROWSER', 'WINDOWS');

ALTER TABLE "Practice"
  ADD COLUMN "questionnaire_auto_export_mode" "QuestionnaireAutoExportMode" NOT NULL DEFAULT 'BROWSER';