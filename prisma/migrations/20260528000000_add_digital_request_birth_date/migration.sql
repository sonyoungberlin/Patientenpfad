-- DigitalRequest: Geburtsdatum im Klartext für Praxis-Detailansicht.
-- Spalte nullable für rückwärtskompatible Migration (Bestandszeilen erhalten NULL).
ALTER TABLE "DigitalRequest" ADD COLUMN "birth_date" TEXT;
