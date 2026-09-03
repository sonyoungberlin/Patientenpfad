-- AlterTable
ALTER TABLE "Practice"
ADD COLUMN "questionnaire_auto_pdf_device_hash" TEXT,
ADD COLUMN "questionnaire_auto_pdf_enabled_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "PatientQuestionnaireSession"
ADD COLUMN "auto_pdf_download_claimed_at" TIMESTAMP(6);
