-- Create a nullable snapshot for unassigned DigitalRequest follow-up sessions.
ALTER TABLE "PatientQuestionnaireSession"
ADD COLUMN "digital_request_snapshot" JSONB;