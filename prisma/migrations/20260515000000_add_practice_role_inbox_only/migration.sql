-- Additive Erweiterung der Praxisrolle fuer den Mini-Zugang Fragebogen-Posteingang.
-- Bestehende Rollen und Membership-Daten bleiben unveraendert.

ALTER TYPE "PracticeRole" ADD VALUE IF NOT EXISTS 'INBOX_ONLY';
