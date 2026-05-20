-- Phase B Schritt 2: DigitalRequest – selected_block_ids und in_review-Status
-- Additiver Change. Kein destructiver Change.
-- `selected_block_ids` nullable JSONB für Praxis-seitige Block-Auswahl.

ALTER TABLE "DigitalRequest"
  ADD COLUMN "selected_block_ids" JSONB;
