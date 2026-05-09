-- S1 Architekturgrundlage: separates OfficeCaseSession-Modell
-- Additiv, ohne Anpassungen an CaseSession oder bestehende Flows.

CREATE TABLE "OfficeCaseSession" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT,
  "trigger_note" TEXT,
  "checkpoint_snapshot" JSONB,
  "owner_account_id" TEXT NOT NULL,
  "owner_practice_id" TEXT,

  CONSTRAINT "OfficeCaseSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficeCaseSession_owner_account_id_createdAt_idx"
  ON "OfficeCaseSession"("owner_account_id", "createdAt");

CREATE INDEX "OfficeCaseSession_owner_practice_id_createdAt_idx"
  ON "OfficeCaseSession"("owner_practice_id", "createdAt");

ALTER TABLE "OfficeCaseSession"
  ADD CONSTRAINT "OfficeCaseSession_owner_account_id_fkey"
  FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfficeCaseSession"
  ADD CONSTRAINT "OfficeCaseSession_owner_practice_id_fkey"
  FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
