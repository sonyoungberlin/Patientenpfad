-- Option C (minimal): Account.default_practice_id als nullable FK auf Practice.
--
-- Reine Auswahlhilfe für `current_practice` (siehe `lib/auth.ts`,
-- `pickCurrentMembership`). Kein Datenbackfill nötig — NULL entspricht
-- exakt dem bisherigen Verhalten (OWNER → älteste Membership).
--
-- `ON DELETE SET NULL` schützt vor Inkonsistenzen, falls eine Practice
-- später gelöscht würde; im aktuellen Scope wird nichts gelöscht.

ALTER TABLE "Account" ADD COLUMN "default_practice_id" TEXT;

CREATE INDEX "Account_default_practice_id_idx" ON "Account"("default_practice_id");

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_default_practice_id_fkey"
  FOREIGN KEY ("default_practice_id") REFERENCES "Practice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
