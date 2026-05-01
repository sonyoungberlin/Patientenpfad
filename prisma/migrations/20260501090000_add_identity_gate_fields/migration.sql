-- AlterTable
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "identity_gate_completed_at" TIMESTAMP(3),
  ADD COLUMN "identity_gate_method" TEXT DEFAULT 'dob_lastname3';
