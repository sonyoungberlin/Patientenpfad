CREATE TABLE "PracticeDocumentationBlock" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "block_type" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeDocumentationBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeDocumentationBlock_practice_id_is_active_created_at_idx"
ON "PracticeDocumentationBlock"("practice_id", "is_active", "created_at");

ALTER TABLE "PracticeDocumentationBlock"
ADD CONSTRAINT "PracticeDocumentationBlock_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;