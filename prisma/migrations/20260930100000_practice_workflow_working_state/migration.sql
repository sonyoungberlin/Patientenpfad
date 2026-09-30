BEGIN;

-- The existing practice-workflow rows are known E2E/test data from the
-- architecture tests. Preserve published catalog entries and chains, but
-- remove only these five temporary source sessions before enforcing the new
-- one-working-state invariant.
ALTER TABLE "PracticeCatalogEntry"
  DROP CONSTRAINT IF EXISTS "PracticeCatalogEntry_source_session_id_fkey";

DELETE FROM "WorkflowSession"
WHERE "id" IN (
  'cmuni4p0a0001i804nurm6ytz',
  'cmuni88o4000ni804mdgsiq33',
  'cmuni8v050013i804lc1tuvmb',
  'cmuni9hw40003js040cgma6dn',
  'cmunibvek001li804nq2mm7ig'
)
AND "process_snapshot" ->> 'processKind' = 'practice-workflow';

ALTER TABLE "WorkflowSession"
  ADD COLUMN "case_profile_id" TEXT;

CREATE UNIQUE INDEX "WorkflowSession_owner_practice_case_profile_key"
  ON "WorkflowSession" ("owner_practice_id", "case_profile_id")
  WHERE "case_profile_id" IS NOT NULL;

COMMIT;