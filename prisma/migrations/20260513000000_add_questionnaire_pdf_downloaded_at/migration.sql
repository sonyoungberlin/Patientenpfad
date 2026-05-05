-- AlterTable: Marker für „PDF wurde heruntergeladen" auf
-- `PatientQuestionnaireSession`. NULL = bislang kein Download, Timestamp =
-- Zeitpunkt des ersten erfolgreichen Downloads (wird in der Praxis-Liste als
-- Hinweis angezeigt). Bewusst additiv und ohne Backfill: Bestandszeilen
-- bleiben NULL und tauchen damit als „noch nicht heruntergeladen" auf.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "pdf_downloaded_at" TIMESTAMP(6);
