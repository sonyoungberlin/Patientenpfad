-- Additive fields for the one-time practice completion response.
ALTER TABLE "DigitalRequest" ADD COLUMN "completion_message" TEXT;
ALTER TABLE "DigitalRequest" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "DigitalRequest" ADD COLUMN "completion_claimed_at" TIMESTAMP(3);
