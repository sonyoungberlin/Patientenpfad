-- Migration: 20260528000001_add_practice_info_texts
--
-- Fügt drei nullable TEXT-Spalten für praxisbezogene Info-Bausteine in M3 hinzu.
-- Kein Backfill. NULL = deaktiviert (Fallback "" im Resolver).
-- Max. 300 Zeichen je Feld werden im App-Layer (lib/inquiries/practiceConfig.ts,
-- app/api/practice/inquiry-info/route.ts) erzwungen, nicht auf DB-Ebene.

ALTER TABLE "Practice" ADD COLUMN "inq_info_text_1" TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_info_text_2" TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_info_text_3" TEXT;
