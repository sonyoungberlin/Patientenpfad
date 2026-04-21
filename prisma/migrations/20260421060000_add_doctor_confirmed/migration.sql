-- AlterTable
ALTER TABLE "CaseSession" ADD COLUMN "doctor_confirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CaseSession" ADD COLUMN "doctor_confirmed_at" TIMESTAMP(3);
