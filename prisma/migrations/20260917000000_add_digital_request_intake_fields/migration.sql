-- Digitale Anfrage: additive Angaben zum Patiententyp und Anliegenweg.
-- Alle Spalten bleiben nullable für rückwärtskompatible Bestandsdaten.
ALTER TABLE "DigitalRequest" ADD COLUMN "patient_relationship" TEXT;
ALTER TABLE "DigitalRequest" ADD COLUMN "request_intent" TEXT;
ALTER TABLE "DigitalRequest" ADD COLUMN "new_patient_exception_confirmed_at" TIMESTAMP(3);