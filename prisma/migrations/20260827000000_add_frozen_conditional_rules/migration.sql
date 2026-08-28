-- Phase 1 Conditional Logic: eingefrorene Regelstruktur additiv ergänzen.
-- NULL = keine Regeln (alle Bestandszeilen). Neue Sessions erhalten die
-- gesammelten ConditionalRules der gewählten Blöcke beim Anlegen.
-- Spätere Katalogänderungen verändern bestehende Links nicht.
ALTER TABLE "PatientQuestionnaireSession"
  ADD COLUMN "frozen_conditional_rules" JSONB;
