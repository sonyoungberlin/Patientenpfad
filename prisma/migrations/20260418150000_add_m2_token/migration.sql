-- AlterTable
ALTER TABLE "CaseSession" ADD COLUMN "m2_token" TEXT;
ALTER TABLE "CaseSession" ADD COLUMN "m2_token_expires_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "CaseSession_m2_token_key" ON "CaseSession"("m2_token");
