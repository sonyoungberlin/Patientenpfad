-- Passwortschutz fuer interne Accounts.
--
-- Neues optionales Feld `password_hash` am Account. Gespeichert wird ein
-- kompakter String im Format `scrypt$N$r$p$saltBase64$hashBase64` (siehe
-- `lib/password.ts`). NULL bedeutet: Account hat noch kein Passwort gesetzt;
-- Login schlaegt fuer solche Accounts neutral mit
-- "E-Mail oder Passwort ungueltig" fehl (kein Bypass).
--
-- Es wird bewusst KEIN Backfill durchgefuehrt: Bestandsaccounts muessen sich
-- (out-of-band) ein Passwort setzen lassen. Der Mail-/Reset-Flow ist nicht
-- Teil dieser Migration.

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "password_hash" TEXT;
