-- Admin-verwaltete Praxisfall-Bibliothek
-- DB-Einträge überschreiben caseProfileCatalog.ts zur Laufzeit.

CREATE TABLE "LibraryCaseProfile" (
  "id"              TEXT         NOT NULL,
  "title"           TEXT         NOT NULL,
  "description"     TEXT,
  "checkpoint_refs" JSONB        NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LibraryCaseProfile_pkey" PRIMARY KEY ("id")
);
