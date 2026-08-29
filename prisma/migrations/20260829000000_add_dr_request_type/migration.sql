-- AlterTable
ALTER TABLE "DigitalRequest" ADD COLUMN "request_type" TEXT NOT NULL DEFAULT 'patient';

-- CreateIndex
CREATE INDEX "DigitalRequest_request_type_idx" ON "DigitalRequest"("request_type");
