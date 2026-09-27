CREATE TABLE "PracticeCaseChainEntryApproval" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "approval_version" INTEGER NOT NULL DEFAULT 1,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeCaseChainEntryApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeCaseChainConnectionApproval" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "source_chain_id" TEXT NOT NULL,
    "source_step_id" TEXT NOT NULL,
    "source_exit_id" TEXT NOT NULL,
    "target_chain_id" TEXT NOT NULL,
    "target_step_id" TEXT NOT NULL,
    "selection_version" INTEGER NOT NULL DEFAULT 1,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeCaseChainConnectionApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pc_chain_entry_approval_practice_chain_step_key"
ON "PracticeCaseChainEntryApproval"("practice_id", "chain_id", "step_id");
CREATE INDEX "pc_chain_entry_approval_practice_chain_idx"
ON "PracticeCaseChainEntryApproval"("practice_id", "chain_id");

CREATE UNIQUE INDEX "pc_chain_connection_approval_practice_source_exit_key"
ON "PracticeCaseChainConnectionApproval"("practice_id", "source_chain_id", "source_exit_id");
CREATE INDEX "pc_chain_connection_approval_practice_source_exit_idx"
ON "PracticeCaseChainConnectionApproval"("practice_id", "source_chain_id", "source_exit_id");

ALTER TABLE "PracticeCaseChainEntryApproval"
ADD CONSTRAINT "PracticeCaseChainEntryApproval_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeCaseChainEntryApproval"
ADD CONSTRAINT "PracticeCaseChainEntryApproval_chain_id_fkey"
FOREIGN KEY ("chain_id") REFERENCES "PracticeCaseChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeCaseChainConnectionApproval"
ADD CONSTRAINT "PracticeCaseChainConnectionApproval_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeCaseChainConnectionApproval"
ADD CONSTRAINT "PracticeCaseChainConnectionApproval_source_chain_id_fkey"
FOREIGN KEY ("source_chain_id") REFERENCES "PracticeCaseChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeCaseChainConnectionApproval"
ADD CONSTRAINT "PracticeCaseChainConnectionApproval_target_chain_id_fkey"
FOREIGN KEY ("target_chain_id") REFERENCES "PracticeCaseChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PracticeCaseChainApprovalEvent" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "approval_kind" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "chain_id" TEXT,
    "step_id" TEXT,
    "source_chain_id" TEXT,
    "source_step_id" TEXT,
    "source_exit_id" TEXT,
    "target_chain_id" TEXT,
    "target_step_id" TEXT,
    "selection_version" INTEGER,
    "actor_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeCaseChainApprovalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeCaseChainApprovalEvent_practice_id_created_at_idx"
ON "PracticeCaseChainApprovalEvent"("practice_id", "created_at");
CREATE INDEX "PracticeCaseChainApprovalEvent_source_idx"
ON "PracticeCaseChainApprovalEvent"("practice_id", "source_chain_id", "source_step_id", "created_at");

ALTER TABLE "PracticeCaseChainApprovalEvent"
ADD CONSTRAINT "PracticeCaseChainApprovalEvent_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeCaseChainApprovalEvent"
ADD CONSTRAINT "PracticeCaseChainApprovalEvent_actor_account_id_fkey"
FOREIGN KEY ("actor_account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
