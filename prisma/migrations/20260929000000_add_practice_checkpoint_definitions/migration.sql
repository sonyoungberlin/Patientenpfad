-- AddTable
CREATE TABLE "PracticeCheckpointDefinition" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "draft" JSONB,
    "current_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeCheckpointDefinition_pkey" PRIMARY KEY ("id")
);

-- AddTable
CREATE TABLE "PracticeCheckpointDefinitionVersion" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "template_snapshot" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "released_by_account_id" TEXT NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeCheckpointDefinitionVersion_pkey" PRIMARY KEY ("id")
);

-- AddIndex
CREATE UNIQUE INDEX "PracticeCheckpointDefinition_practice_id_checkpoint_id_key"
ON "PracticeCheckpointDefinition"("practice_id", "checkpoint_id");

CREATE UNIQUE INDEX "PracticeCheckpointDefinition_current_version_id_key"
ON "PracticeCheckpointDefinition"("current_version_id");

CREATE INDEX "PracticeCheckpointDefinition_practice_id_updated_at_idx"
ON "PracticeCheckpointDefinition"("practice_id", "updated_at");

CREATE UNIQUE INDEX "PracticeCheckpointDefinitionVersion_definition_id_version_key"
ON "PracticeCheckpointDefinitionVersion"("definition_id", "version");

CREATE INDEX "PracticeCheckpointDefinitionVersion_definition_id_released_at_idx"
ON "PracticeCheckpointDefinitionVersion"("definition_id", "released_at");

-- AddForeignKey
ALTER TABLE "PracticeCheckpointDefinition"
ADD CONSTRAINT "PracticeCheckpointDefinition_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PracticeCheckpointDefinitionVersion"
ADD CONSTRAINT "PracticeCheckpointDefinitionVersion_definition_id_fkey"
FOREIGN KEY ("definition_id") REFERENCES "PracticeCheckpointDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PracticeCheckpointDefinition"
ADD CONSTRAINT "PracticeCheckpointDefinition_current_version_id_fkey"
FOREIGN KEY ("current_version_id") REFERENCES "PracticeCheckpointDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;