-- Phase 4: Vollständiger Block-Snapshot additiv ergänzen.
-- NULL = Bestandssession (Legacy-Pfad). Neue Sessions erhalten den
-- eingefrorenen FrozenBlock[]-Snapshot beim Anlegen.
-- Spätere Katalogänderungen verändern bestehende Links nicht.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "frozen_blocks" JSONB;
