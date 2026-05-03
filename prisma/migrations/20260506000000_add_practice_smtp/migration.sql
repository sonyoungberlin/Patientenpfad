-- Practice-spezifische SMTP-Konfiguration für Website-Form-Bestätigungs-Mails.
--
-- Additiv: alle Spalten nullable, kein Default, kein Backfill. Bestands-
-- Practices laufen weiter über den ENV-Fallback (siehe MAIL_TRANSPORT in
-- lib/mail/sendWebsiteFormConfirmationEmail.ts). Eine Konfiguration gilt
-- erst dann als vollständig, wenn alle Pflichtfelder (Host, Port, User,
-- Pass-Cipher, From-Email) gesetzt sind — geprüft im App-Layer.
--
-- Sicherheit: `smtp_pass_encrypted` ist NUR der Cipher-Blob im Format
-- `v1:<base64(iv)>:<base64(ciphertext)>:<base64(authTag)>`. Klartext-
-- Passwörter werden weder hier noch sonst irgendwo persistiert.

ALTER TABLE "Practice" ADD COLUMN "smtp_host"           TEXT;
ALTER TABLE "Practice" ADD COLUMN "smtp_port"           INTEGER;
ALTER TABLE "Practice" ADD COLUMN "smtp_secure"         BOOLEAN;
ALTER TABLE "Practice" ADD COLUMN "smtp_user"           TEXT;
ALTER TABLE "Practice" ADD COLUMN "smtp_pass_encrypted" TEXT;
ALTER TABLE "Practice" ADD COLUMN "smtp_from_email"     TEXT;
ALTER TABLE "Practice" ADD COLUMN "smtp_from_name"      TEXT;
ALTER TABLE "Practice" ADD COLUMN "smtp_updated_at"     TIMESTAMP(3);
