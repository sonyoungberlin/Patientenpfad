-- "Passwort setzen per Link"-Flow für bestehende Accounts ohne Passwort.
--
-- Zwei neue, optionale Felder am Account:
--   * `password_reset_token`   -- Einmal-Token (hex), per E-Mail versandt.
--                                 NULL bedeutet: kein offener Setup-Link.
--   * `password_reset_expires` -- Ablaufzeitpunkt (typisch +1 Stunde).
--
-- Der Token wird in der API generiert (`crypto.randomBytes`, hex-kodiert) und
-- nach erfolgreichem Setzen des Passworts wieder auf NULL geräumt
-- (zusammen mit `password_reset_expires`). Klartext-Tokens werden niemals
-- geloggt.
--
-- Es wird KEIN Backfill durchgeführt; bestehende Accounts haben standardmäßig
-- keinen offenen Setup-Token. Der UNIQUE-Index erlaubt mehrere NULL-Werte
-- (Postgres-Standard) und stellt zugleich sicher, dass ein zufällig
-- kollidierender Token-Wert sofort als Constraint-Verstoß erkannt würde.

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "password_reset_token" TEXT;
ALTER TABLE "Account" ADD COLUMN "password_reset_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Account_password_reset_token_key" ON "Account"("password_reset_token");
