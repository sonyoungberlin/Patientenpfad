CREATE TABLE "PracticeCaseChain" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "source_chain_id" TEXT,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeCaseChain_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeCaseChain_practice_id_updated_at_idx"
ON "PracticeCaseChain"("practice_id", "updated_at");

CREATE INDEX "PracticeCaseChain_practice_id_status_idx"
ON "PracticeCaseChain"("practice_id", "status");

CREATE UNIQUE INDEX "PracticeCaseChain_source_chain_id_key"
ON "PracticeCaseChain"("source_chain_id");

ALTER TABLE "PracticeCaseChain"
ADD CONSTRAINT "PracticeCaseChain_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PracticeCaseChain"
ADD CONSTRAINT "PracticeCaseChain_source_chain_id_fkey"
FOREIGN KEY ("source_chain_id") REFERENCES "PracticeCaseChain"("id")
ON DELETE SET NULL ON UPDATE CASCADE;