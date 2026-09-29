CREATE TABLE IF NOT EXISTS "PracticeCheckpointDefinition" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "selected_anchor_ids" JSONB NOT NULL,
    "implementation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PracticeCheckpointDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PracticeCheckpointDefinition_practice_id_checkpoint_id_key"
ON "PracticeCheckpointDefinition"("practice_id", "checkpoint_id");

CREATE INDEX IF NOT EXISTS "PracticeCheckpointDefinition_practice_id_idx"
ON "PracticeCheckpointDefinition"("practice_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PracticeCheckpointDefinition_practice_id_fkey'
    ) THEN
        ALTER TABLE "PracticeCheckpointDefinition"
            ADD CONSTRAINT "PracticeCheckpointDefinition_practice_id_fkey"
            FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;