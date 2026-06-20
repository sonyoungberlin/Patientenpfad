-- Add arbeitsprozesse_enabled flag to Account
ALTER TABLE "Account" ADD COLUMN "arbeitsprozesse_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Add arbeitsprozesse_enabled flag to Practice
ALTER TABLE "Practice" ADD COLUMN "arbeitsprozesse_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Create WorkflowSession table
CREATE TABLE "WorkflowSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "process_snapshot" JSONB,
    "internal_saved_at" TIMESTAMP(3),
    "owner_account_id" TEXT NOT NULL,
    "owner_practice_id" TEXT,

    CONSTRAINT "WorkflowSession_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "WorkflowSession_owner_account_id_createdAt_idx" ON "WorkflowSession"("owner_account_id", "createdAt");
CREATE INDEX "WorkflowSession_owner_practice_id_createdAt_idx" ON "WorkflowSession"("owner_practice_id", "createdAt");

-- Add foreign keys
ALTER TABLE "WorkflowSession" ADD CONSTRAINT "WorkflowSession_owner_account_id_fkey"
    FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkflowSession" ADD CONSTRAINT "WorkflowSession_owner_practice_id_fkey"
    FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
