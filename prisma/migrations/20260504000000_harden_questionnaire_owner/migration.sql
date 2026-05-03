-- Phase 2: Härtung des Datenmodells für PatientQuestionnaireSession.
--
-- Ziele:
--   1. owner_account_id wird zur Pflichtspalte (NOT NULL).
--   2. Foreign-Key-Verhalten wechselt von ON DELETE SET NULL auf ON DELETE RESTRICT,
--      damit ein Account nicht gelöscht werden kann, solange noch Fragebogen-
--      Sessions auf ihn verweisen. Das verhindert das stille Verschwinden
--      medizinisch dokumentationspflichtiger Daten.
--   3. Composite-Index (owner_account_id, createdAt) bedient die Listenabfrage in
--      app/questionnaires/page.tsx (Filter + Sortierung) als Präfix-Index, der
--      gleichzeitig auch reine owner_account_id-Lookups abdeckt.
--
-- Sicherheitsnetz:
--   Der DO-Block bricht die Migration mit einer sprechenden Exception ab, falls
--   noch Datensätze ohne owner_account_id existieren. Damit gibt es keinen
--   stillen Datenverlust und keine automatische Zuordnung zu einem Default-
--   Account; solche Fälle werden vor dem Deploy bewusst manuell entschieden.

-- 1. Vorabprüfung: keine NULLs erlaubt.
DO $$
DECLARE
  null_count BIGINT;
BEGIN
  SELECT count(*) INTO null_count
  FROM "PatientQuestionnaireSession"
  WHERE "owner_account_id" IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION
      'Migration abgebrochen: % PatientQuestionnaireSession-Datensätze ohne owner_account_id gefunden. Bitte vor dem Deploy manuell zuordnen oder entfernen.',
      null_count;
  END IF;
END
$$;

-- 2. Bestehende Foreign-Key-Constraint mit ON DELETE SET NULL entfernen.
ALTER TABLE "PatientQuestionnaireSession"
  DROP CONSTRAINT "PatientQuestionnaireSession_owner_account_id_fkey";

-- 3. Spalte auf NOT NULL setzen.
ALTER TABLE "PatientQuestionnaireSession"
  ALTER COLUMN "owner_account_id" SET NOT NULL;

-- 4. Foreign-Key neu anlegen mit ON DELETE RESTRICT.
ALTER TABLE "PatientQuestionnaireSession"
  ADD CONSTRAINT "PatientQuestionnaireSession_owner_account_id_fkey"
  FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Composite-Index fuer die Praxis-Listenabfrage.
CREATE INDEX "PatientQuestionnaireSession_owner_account_id_createdAt_idx"
  ON "PatientQuestionnaireSession" ("owner_account_id", "createdAt");
