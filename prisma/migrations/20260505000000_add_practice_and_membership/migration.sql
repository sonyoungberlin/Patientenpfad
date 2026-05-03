-- Phase P1: Additive Einführung von Practice / PracticeMembership.
--
-- Diese Migration ist rein additiv und verändert keine bestehenden Spalten:
--   * neuer Enum `PracticeRole` (OWNER | ADMIN | USER)
--   * neue Tabellen `Practice` und `PracticeMembership`
--   * `owner_practice_id` wird zusätzlich (nullable) auf den vier
--     Owner-Tabellen eingeführt:
--       - CaseSession (alt: nullable)        -> SetNull
--       - InquirySession (alt: nullable)     -> SetNull
--       - PatientQuestionnaireSession (alt: NOT NULL) -> Restrict
--       - PracticeQuestionnaireForm (alt: NOT NULL)   -> Restrict
--   * additive Indexe `(owner_practice_id, createdAt)` analog zu den
--     bestehenden Owner-Indexen (nur dort, wo es heute schon einen
--     `(owner_account_id, createdAt)`-Index gibt).
--
-- Backfill (idempotent, in derselben Transaktion):
--   * pro Account eine Practice + OWNER-Membership
--   * `owner_practice_id` aus der OWNER-Membership zum bisherigen
--     `owner_account_id` ableiten
--   * Carry-Over der Account-Flags (is_approved, *_enabled) 1:1 auf die
--     Practice
--
-- Verifikation am Ende: ein DO-Block prüft sieben Invarianten und bricht
-- die Migration mit RAISE EXCEPTION ab, wenn auch nur eine verletzt ist.
--
-- Bewusst NICHT in dieser Migration:
--   * keine Änderung an bestehenden Spalten oder Indexen
--   * keine NOT-NULL-Verschärfung auf `owner_practice_id` (folgt in P5)
--   * keine Code-/UI-/Auth-Änderungen
--   * keine SMTP- oder Stammdaten-Felder an Practice

-- 1. Enum -------------------------------------------------------------------

CREATE TYPE "PracticeRole" AS ENUM ('OWNER', 'ADMIN', 'USER');

-- 2. Practice ---------------------------------------------------------------

CREATE TABLE "Practice" (
    "id"                            TEXT         NOT NULL,
    "name"                          TEXT         NOT NULL,
    "slug"                          TEXT         NOT NULL,
    "is_approved"                   BOOLEAN      NOT NULL DEFAULT false,
    "inquiry_assistant_enabled"     BOOLEAN      NOT NULL DEFAULT false,
    "patient_communication_enabled" BOOLEAN      NOT NULL DEFAULT false,
    "website_forms_enabled"         BOOLEAN      NOT NULL DEFAULT false,
    "created_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Practice_slug_key" ON "Practice"("slug");

-- 3. PracticeMembership -----------------------------------------------------

CREATE TABLE "PracticeMembership" (
    "id"          TEXT           NOT NULL,
    "account_id"  TEXT           NOT NULL,
    "practice_id" TEXT           NOT NULL,
    "role"        "PracticeRole" NOT NULL,
    "created_at"  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "PracticeMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeMembership_account_id_practice_id_key"
  ON "PracticeMembership"("account_id", "practice_id");
CREATE INDEX "PracticeMembership_practice_id_role_idx"
  ON "PracticeMembership"("practice_id", "role");

ALTER TABLE "PracticeMembership"
  ADD CONSTRAINT "PracticeMembership_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "Account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeMembership"
  ADD CONSTRAINT "PracticeMembership_practice_id_fkey"
  FOREIGN KEY ("practice_id") REFERENCES "Practice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. owner_practice_id auf den vier Owner-Tabellen --------------------------

ALTER TABLE "CaseSession" ADD COLUMN "owner_practice_id" TEXT;
ALTER TABLE "CaseSession"
  ADD CONSTRAINT "CaseSession_owner_practice_id_fkey"
  FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InquirySession" ADD COLUMN "owner_practice_id" TEXT;
ALTER TABLE "InquirySession"
  ADD CONSTRAINT "InquirySession_owner_practice_id_fkey"
  FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientQuestionnaireSession" ADD COLUMN "owner_practice_id" TEXT;
ALTER TABLE "PatientQuestionnaireSession"
  ADD CONSTRAINT "PatientQuestionnaireSession_owner_practice_id_fkey"
  FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PatientQuestionnaireSession_owner_practice_id_createdAt_idx"
  ON "PatientQuestionnaireSession"("owner_practice_id", "createdAt");

ALTER TABLE "PracticeQuestionnaireForm" ADD COLUMN "owner_practice_id" TEXT;
ALTER TABLE "PracticeQuestionnaireForm"
  ADD CONSTRAINT "PracticeQuestionnaireForm_owner_practice_id_fkey"
  FOREIGN KEY ("owner_practice_id") REFERENCES "Practice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PracticeQuestionnaireForm_owner_practice_id_createdAt_idx"
  ON "PracticeQuestionnaireForm"("owner_practice_id", "createdAt");

-- 5. Backfill ---------------------------------------------------------------
--
-- Idempotenz wird über zwei Mechanismen sichergestellt:
--   * `INSERT ... WHERE NOT EXISTS` für Practice/Membership pro Account
--   * `UPDATE ... WHERE owner_practice_id IS NULL` auf den vier Tabellen
-- Damit ist die Migration auch nach einem Teil-Lauf erneut anwendbar.

-- 5a. Practice je Account.
--   - id: Account-Id 1:1 wiederverwenden, damit auch nach mehrfachen Läufen
--         keine Doppelten entstehen können (Account-Id ist cuid, global
--         eindeutig). Die fachliche Practice-Id bleibt davon unabhängig
--         austauschbar; in P1 ist die Identität für die App irrelevant.
--   - slug: slugify(email) + "-" + substr(account.id, 1, 8)
--           Slug-Kollisionen sind durch das Account-Id-Suffix strukturell
--           ausgeschlossen.
--   - Carry-Over: Flags 1:1 vom Account auf die Practice.
INSERT INTO "Practice" (
    "id",
    "name",
    "slug",
    "is_approved",
    "inquiry_assistant_enabled",
    "patient_communication_enabled",
    "website_forms_enabled",
    "created_at",
    "updated_at"
)
SELECT
    a."id",
    a."email",
    trim(both '-' from regexp_replace(lower(a."email"), '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(a."id", 1, 8),
    a."is_approved",
    a."inquiry_assistant_enabled",
    a."patient_communication_enabled",
    a."website_forms_enabled",
    a."createdAt",
    NOW()
FROM "Account" a
WHERE NOT EXISTS (
    SELECT 1 FROM "Practice" p WHERE p."id" = a."id"
);

-- 5b. OWNER-Membership pro Account.
--   - id: deterministisch aus Account-Id ableiten ('m_' + account.id),
--         damit Wiederholungsläufe keine Duplikate erzeugen können.
--         Die fachliche Membership-Id ist in P1 für die App irrelevant.
INSERT INTO "PracticeMembership" (
    "id",
    "account_id",
    "practice_id",
    "role",
    "created_at",
    "updated_at"
)
SELECT
    'm_' || a."id",
    a."id",
    a."id",
    'OWNER'::"PracticeRole",
    a."createdAt",
    NOW()
FROM "Account" a
WHERE NOT EXISTS (
    SELECT 1 FROM "PracticeMembership" m
     WHERE m."account_id" = a."id"
);

-- 5c. owner_practice_id remappen — pro Tabelle aus der eindeutigen
--     OWNER-Membership des bisherigen `owner_account_id` ableiten.
UPDATE "CaseSession" t
   SET "owner_practice_id" = m."practice_id"
  FROM "PracticeMembership" m
 WHERE m."account_id"        = t."owner_account_id"
   AND m."role"               = 'OWNER'
   AND t."owner_practice_id"  IS NULL
   AND t."owner_account_id"   IS NOT NULL;

UPDATE "InquirySession" t
   SET "owner_practice_id" = m."practice_id"
  FROM "PracticeMembership" m
 WHERE m."account_id"        = t."owner_account_id"
   AND m."role"               = 'OWNER'
   AND t."owner_practice_id"  IS NULL
   AND t."owner_account_id"   IS NOT NULL;

UPDATE "PatientQuestionnaireSession" t
   SET "owner_practice_id" = m."practice_id"
  FROM "PracticeMembership" m
 WHERE m."account_id"        = t."owner_account_id"
   AND m."role"               = 'OWNER'
   AND t."owner_practice_id"  IS NULL;

UPDATE "PracticeQuestionnaireForm" t
   SET "owner_practice_id" = m."practice_id"
  FROM "PracticeMembership" m
 WHERE m."account_id"        = t."owner_account_id"
   AND m."role"               = 'OWNER'
   AND t."owner_practice_id"  IS NULL;

-- 6. Verifikation -----------------------------------------------------------
--
-- Sieben Invarianten. Jede Verletzung bricht die Transaktion ab.
DO $$
DECLARE
    v_count BIGINT;
BEGIN
    -- (1) Genau eine Membership pro Account.
    SELECT COUNT(*) INTO v_count FROM (
        SELECT "account_id"
          FROM "PracticeMembership"
         GROUP BY "account_id"
        HAVING COUNT(*) <> 1
    ) x;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (1) failed: % accounts have <> 1 memberships', v_count;
    END IF;

    -- (2) Genau ein OWNER pro Practice.
    SELECT COUNT(*) INTO v_count FROM (
        SELECT "practice_id"
          FROM "PracticeMembership"
         WHERE "role" = 'OWNER'
         GROUP BY "practice_id"
        HAVING COUNT(*) <> 1
    ) x;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (2) failed: % practices have <> 1 OWNER', v_count;
    END IF;

    -- (3) Kein Account ohne Practice/Membership.
    SELECT COUNT(*) INTO v_count
      FROM "Account" a
      LEFT JOIN "PracticeMembership" m ON m."account_id" = a."id"
     WHERE m."id" IS NULL;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (3) failed: % accounts without membership', v_count;
    END IF;

    -- (4) Owner-Remap vollständig: keine Zeile mit owner_account_id IS NOT NULL
    --     darf nach dem Backfill noch owner_practice_id IS NULL haben.
    SELECT COUNT(*) INTO v_count FROM "CaseSession"
     WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (4) failed: CaseSession has % unmapped rows', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count FROM "InquirySession"
     WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (4) failed: InquirySession has % unmapped rows', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count FROM "PatientQuestionnaireSession"
     WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (4) failed: PatientQuestionnaireSession has % unmapped rows', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count FROM "PracticeQuestionnaireForm"
     WHERE "owner_account_id" IS NOT NULL AND "owner_practice_id" IS NULL;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (4) failed: PracticeQuestionnaireForm has % unmapped rows', v_count;
    END IF;

    -- (5) Owner-Remap konsistent: die Practice einer Zeile muss dem alten
    --     owner_account_id als OWNER zugeordnet sein.
    SELECT COUNT(*) INTO v_count FROM "CaseSession" t
      JOIN "PracticeMembership" m
        ON m."practice_id" = t."owner_practice_id"
       AND m."role"        = 'OWNER'
     WHERE t."owner_account_id" IS NOT NULL
       AND m."account_id" <> t."owner_account_id";
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (5) failed: CaseSession has % inconsistent owner remaps', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count FROM "InquirySession" t
      JOIN "PracticeMembership" m
        ON m."practice_id" = t."owner_practice_id"
       AND m."role"        = 'OWNER'
     WHERE t."owner_account_id" IS NOT NULL
       AND m."account_id" <> t."owner_account_id";
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (5) failed: InquirySession has % inconsistent owner remaps', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count FROM "PatientQuestionnaireSession" t
      JOIN "PracticeMembership" m
        ON m."practice_id" = t."owner_practice_id"
       AND m."role"        = 'OWNER'
     WHERE m."account_id" <> t."owner_account_id";
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (5) failed: PatientQuestionnaireSession has % inconsistent owner remaps', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count FROM "PracticeQuestionnaireForm" t
      JOIN "PracticeMembership" m
        ON m."practice_id" = t."owner_practice_id"
       AND m."role"        = 'OWNER'
     WHERE m."account_id" <> t."owner_account_id";
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (5) failed: PracticeQuestionnaireForm has % inconsistent owner remaps', v_count;
    END IF;

    -- (6) Slugs eindeutig (zusätzlich zur DDL-Constraint).
    SELECT COUNT(*) INTO v_count FROM (
        SELECT "slug" FROM "Practice"
         GROUP BY "slug" HAVING COUNT(*) > 1
    ) x;
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (6) failed: % duplicate practice slugs', v_count;
    END IF;

    -- (7) Carry-Over der Flags 1:1 vom Account auf die OWNER-Practice.
    SELECT COUNT(*) INTO v_count
      FROM "Account" a
      JOIN "PracticeMembership" m ON m."account_id" = a."id" AND m."role" = 'OWNER'
      JOIN "Practice"           p ON p."id"         = m."practice_id"
     WHERE a."is_approved"                    <> p."is_approved"
        OR a."inquiry_assistant_enabled"      <> p."inquiry_assistant_enabled"
        OR a."patient_communication_enabled"  <> p."patient_communication_enabled"
        OR a."website_forms_enabled"          <> p."website_forms_enabled";
    IF v_count > 0 THEN
        RAISE EXCEPTION
          'P1 verify (7) failed: % accounts/practices with flag mismatch', v_count;
    END IF;
END
$$;
