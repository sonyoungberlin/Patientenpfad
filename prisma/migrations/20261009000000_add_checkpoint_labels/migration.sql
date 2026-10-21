CREATE TABLE "CheckpointLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckpointLabel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckpointLabelAssignment" (
    "checkpoint_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckpointLabelAssignment_pkey" PRIMARY KEY ("checkpoint_id", "label_id"),
    CONSTRAINT "CheckpointLabelAssignment_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "CheckpointLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CheckpointLabel_normalized_name_key" ON "CheckpointLabel"("normalized_name");
CREATE INDEX "CheckpointLabelAssignment_label_id_idx" ON "CheckpointLabelAssignment"("label_id");