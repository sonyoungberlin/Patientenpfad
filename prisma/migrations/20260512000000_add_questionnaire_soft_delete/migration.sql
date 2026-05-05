-- AlterTable: Soft-Delete-Marker für `PatientQuestionnaireSession`.
-- NULL bedeutet aktiv, ein gesetzter Zeitstempel markiert die Session als
-- archiviert. Die App liest gelöschte Sessions an keiner Stelle mehr aus
-- (Liste, PDF, Patienten-Token-Flow). Bestandszeilen bleiben aktiv (NULL).
-- Bewusst additiv und ohne Backfill, damit alle bestehenden Codepfade
-- unverändert weiterlaufen.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "deleted_at" TIMESTAMP(6);
