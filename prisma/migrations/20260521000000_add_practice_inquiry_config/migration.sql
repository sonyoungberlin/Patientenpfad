-- Praxis-spezifische Konfiguration für den Anfrage-Assistenten.
--
-- Additiv: alle Spalten nullable, kein Default, kein Backfill. Bestehende
-- Practice-Rows erhalten NULL für alle neuen Felder. NULL bedeutet explizit
-- "kein praxisspezifischer Override" — der Resolver fällt auf
-- PILOT_PRACTICE_INQUIRY_CONFIG zurück (lib/inquiries/practiceConfig.ts).
--
-- Bewusst NICHT in dieser Migration:
--   * kein Backfill / keine UPDATE-Statements
--   * kein Resolver-Update
--   * keine Admin-UI
--   * keine Visibility-Booleans
--   * keine URLs
--   * keine medizinischen/statischen Felder

ALTER TABLE "Practice" ADD COLUMN "inq_booking_calendar_name"         TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_findings_review_code"          TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_chronic_control_code"          TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_checkup_second_code"           TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_doctor_order_code"             TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_upload_platform_name"          TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_upload_platform_account_label" TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_open_consultation_days"        TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_open_consultation_hours"       TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_open_consultation_cap_limited" BOOLEAN;
ALTER TABLE "Practice" ADD COLUMN "inq_video_support_contact"         TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_billing_cycle_label"           TEXT;
ALTER TABLE "Practice" ADD COLUMN "inq_digital_req_time_min"          INTEGER;
ALTER TABLE "Practice" ADD COLUMN "inq_digital_req_time_max"          INTEGER;
ALTER TABLE "Practice" ADD COLUMN "inq_digital_req_time_unit"         TEXT;
