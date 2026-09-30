-- Controlled reset of the practice-workflow feature test data only.
-- Admin library tables and non-practice workflows are intentionally untouched.

BEGIN;

-- Scope the reset to catalog entries and workflow sessions of this feature.
CREATE TEMP TABLE "_PracticeWorkflowResetCatalogEntries" ON COMMIT DROP AS
SELECT "id"
FROM "PracticeCatalogEntry"
WHERE ("snapshot" ->> 'processKind') = 'practice-workflow'
   OR "source_session_id" IN (
     SELECT "id"
     FROM "WorkflowSession"
     WHERE ("process_snapshot" ->> 'processKind') = 'practice-workflow'
   );

CREATE TEMP TABLE "_PracticeWorkflowResetChains" ON COMMIT DROP AS
WITH RECURSIVE direct_chains AS (
  SELECT DISTINCT chain."id"
  FROM "PracticeCaseChain" chain
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(chain."definition" -> 'steps') = 'array'
        THEN chain."definition" -> 'steps'
      ELSE '[]'::jsonb
    END
  ) AS step
  WHERE (step.value ->> 'catalogEntryId') IN (
    SELECT "id" FROM "_PracticeWorkflowResetCatalogEntries"
  )
), chain_family AS (
  SELECT "id" FROM direct_chains
  UNION
  SELECT revision."id"
  FROM "PracticeCaseChain" revision
  JOIN chain_family parent ON revision."source_chain_id" = parent."id"
)
SELECT "id" FROM chain_family;

DELETE FROM "PracticeCaseChainApprovalEvent"
WHERE "chain_id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains")
   OR "source_chain_id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains")
   OR "target_chain_id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains");

DELETE FROM "PracticeCaseChainConnectionApproval"
WHERE "source_chain_id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains")
   OR "target_chain_id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains");

DELETE FROM "PracticeCaseChainEntryApproval"
WHERE "chain_id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains");

DELETE FROM "PracticeCaseChain"
WHERE "id" IN (SELECT "id" FROM "_PracticeWorkflowResetChains");

-- Remove only published practice-workflow entries and their source sessions.
DELETE FROM "PracticeCatalogEntry"
WHERE "id" IN (SELECT "id" FROM "_PracticeWorkflowResetCatalogEntries");

DELETE FROM "WorkflowSession"
WHERE ("process_snapshot" ->> 'processKind') = 'practice-workflow';

-- Existing definition rows are development/test data for this feature.
ALTER TABLE "PracticeCheckpointDefinition"
  DROP CONSTRAINT IF EXISTS "PracticeCheckpointDefinition_current_version_id_fkey";

ALTER TABLE "PracticeCheckpointDefinitionVersion"
  DROP CONSTRAINT IF EXISTS "PracticeCheckpointDefinitionVersion_definition_id_fkey";

DELETE FROM "PracticeCheckpointDefinitionVersion";
DELETE FROM "PracticeCheckpointDefinition";

DROP TABLE IF EXISTS "PracticeCheckpointDefinitionVersion";

ALTER TABLE "PracticeCheckpointDefinition"
  DROP COLUMN IF EXISTS "draft",
  DROP COLUMN IF EXISTS "current_version_id",
  ADD COLUMN IF NOT EXISTS "selected_anchor_ids" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "implementation" TEXT NOT NULL DEFAULT '';

ALTER TABLE "PracticeCheckpointDefinition"
  ALTER COLUMN "selected_anchor_ids" DROP DEFAULT,
  ALTER COLUMN "implementation" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "PracticeCheckpointDefinition_practice_id_checkpoint_id_key"
  ON "PracticeCheckpointDefinition"("practice_id", "checkpoint_id");

CREATE INDEX IF NOT EXISTS "PracticeCheckpointDefinition_practice_id_idx"
  ON "PracticeCheckpointDefinition"("practice_id");

COMMIT;
