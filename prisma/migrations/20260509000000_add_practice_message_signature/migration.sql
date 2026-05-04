-- Verschiebt die Nachrichtensignatur konzeptionell vom Account auf die
-- Practice. Diese Migration ist additiv: `Account.message_signature` bleibt
-- vorerst bestehen (Cleanup-Migration in einem späteren PR), damit ein
-- Rollback und parallele Deploys ohne Datenverlust möglich sind.
--
-- Schritte:
--   1. Neue Spalte `Practice.message_signature` (nullable).
--   2. Backfill pro Practice aus `Account.message_signature`. Auswahlregel
--      (in dieser Reihenfolge), nur Accounts mit nicht-leerer Signatur:
--        a) OWNER der Practice
--        b) ADMIN der Practice
--        c) ältester Member (älteste `PracticeMembership.created_at`)
--      Bei Gleichstand innerhalb einer Stufe gewinnt die älteste Membership
--      (deterministisch). Practices ohne passenden Account-Wert bleiben
--      `NULL`.
--
-- Bewusst NICHT in dieser Migration:
--   * keine Änderung oder Drop von `Account.message_signature`
--   * keine Auth-/Code-Änderungen

-- 1. Neue Spalte ------------------------------------------------------------

ALTER TABLE "Practice" ADD COLUMN "message_signature" TEXT;

-- 2. Backfill ---------------------------------------------------------------
--
-- Für jede Practice wird genau ein Account ausgewählt (OWNER vor ADMIN vor
-- ältester Membership), dessen `message_signature` nicht NULL und nicht
-- leer ist. `DISTINCT ON` sortiert pro Practice nach Rolle-Priorität und
-- Membership-Alter; das gewinnende Tupel liefert die Signatur.

UPDATE "Practice" p
   SET "message_signature" = src."signature"
  FROM (
    SELECT DISTINCT ON (m."practice_id")
           m."practice_id" AS practice_id,
           a."message_signature" AS signature
      FROM "PracticeMembership" m
      JOIN "Account" a ON a."id" = m."account_id"
     WHERE a."message_signature" IS NOT NULL
       AND length(btrim(a."message_signature")) > 0
     ORDER BY m."practice_id",
              CASE m."role"
                WHEN 'OWNER' THEN 0
                WHEN 'ADMIN' THEN 1
                ELSE 2
              END,
              m."created_at" ASC,
              m."id" ASC
  ) AS src
 WHERE p."id" = src."practice_id"
   AND p."message_signature" IS NULL;
