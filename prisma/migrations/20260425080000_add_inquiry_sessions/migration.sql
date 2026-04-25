-- CreateEnum
CREATE TYPE "InquirySessionStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "InquirySession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "owner_account_id" TEXT,
    "status" "InquirySessionStatus" NOT NULL DEFAULT 'DRAFT',
    "selected_inquiry_ids" JSONB,
    "section_snapshot" JSONB,
    "checkpoint_statuses" JSONB,
    "action_statuses" JSONB,
    "generated_output" JSONB,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "InquirySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquirySession_owner_account_id_idx" ON "InquirySession"("owner_account_id");

-- AddForeignKey
ALTER TABLE "InquirySession" ADD CONSTRAINT "InquirySession_owner_account_id_fkey"
    FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
