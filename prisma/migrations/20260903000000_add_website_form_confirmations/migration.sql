-- Ausgewählte praxisindividuelle Bestätigungs-Slots für Website-Formulare.
ALTER TABLE "PracticeQuestionnaireForm"
  ADD COLUMN "selected_confirmation_ids" JSONB;