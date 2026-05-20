-- Digitale Anfrage: angefragte Anliegen des Patienten.
-- Spalte nullable für rückwärtskompatible Migration (Bestandszeilen erhalten NULL).
ALTER TABLE "DigitalRequest" ADD COLUMN "requested_topics" JSONB;
