-- CreateTable
CREATE TABLE "PrefillRun" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "active_checkpoints" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frozen_at" TIMESTAMP(3),
    "created_by_account_id" TEXT,
    "patient_token_used" TEXT,

    CONSTRAINT "PrefillRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrefillRun_case_id_sequence_key" ON "PrefillRun"("case_id", "sequence");

-- CreateIndex
CREATE INDEX "PrefillRun_case_id_frozen_at_sequence_idx" ON "PrefillRun"("case_id", "frozen_at", "sequence");

-- Partial unique index: maximal ein offener Run pro Fall (frozen_at IS NULL).
-- Prisma unterstützt partielle Unique-Indexe nicht nativ, daher als Raw-SQL.
CREATE UNIQUE INDEX "PrefillRun_case_id_open_unique"
    ON "PrefillRun"("case_id")
    WHERE "frozen_at" IS NULL;

-- AddForeignKey
ALTER TABLE "PrefillRun" ADD CONSTRAINT "PrefillRun_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "CaseSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
