-- Phase 1a: Neues Account-Feld zur Freischaltung der Patientenkommunikation
-- (Patientenfragebogen-Funktionen). Standard ist FALSE; Bestandsaccounts mit
-- is_approved = TRUE werden im selben Schritt zurueckmigriert (Backfill), damit
-- bestehendes Verhalten erhalten bleibt.

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "patient_communication_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: alle bisher freigeschalteten Accounts erhalten patient_communication_enabled = TRUE
UPDATE "Account" SET "patient_communication_enabled" = TRUE WHERE "is_approved" = TRUE;
