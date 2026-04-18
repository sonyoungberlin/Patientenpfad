# Patientenpfad

Neutrales technisches Startrepository.

## Ziel
Leeres, sauberes Grundgerüst für eine spätere Next.js/TypeScript-App mit Prisma und Tests.

## Struktur
- `app/` – minimale Next.js App-Router Platzhalter
- `lib/` – technische Hilfsbibliotheken (derzeit leer)
- `prisma/` – Prisma-Konfiguration (`schema.prisma`)
- `tests/` – Teststruktur (derzeit leer)
- `docs/` – fachliche Regeln und Spezifikationen
- `scripts/` – Betreiber-CLI-Tools

## Regeln
- [Checkpoint-Klassifikation (M/O + P/A)](docs/checkpoint-classification.md)

## Account-Freischaltung (Betreiber-CLI)

Neue Tester oder Praxis-Accounts müssen einmalig freigeschaltet werden. Das geht über ein CLI-Script direkt auf dem Server.

### Ablauf

1. Tester loggt sich einmal über die App mit seiner E-Mail-Adresse ein
   - Dadurch wird automatisch ein Account angelegt (`is_approved = false`)
2. Betreiber schaltet den Account frei:
   ```sh
   npm run approve-email -- tester@example.com
   ```
3. Tester kann die App danach vollständig nutzen

### Weitere Befehle

```sh
# Account sperren (is_approved = false)
npm run revoke-email -- tester@example.com

# Alle Accounts anzeigen
npm run list-accounts
```

Oder direkt ohne npm:
```sh
node scripts/approve-account.mjs approve tester@example.com
node scripts/approve-account.mjs revoke  tester@example.com
node scripts/approve-account.mjs list
```

> Voraussetzung: `DATABASE_URL` muss in der Umgebung gesetzt sein (z. B. via `.env`).

## Admin-Seite `/admin/accounts`

Für eine browserbasierte Verwaltung gibt es eine interne Admin-Seite.

### Admin-Account einrichten

1. Tester loggt sich einmal über die App ein
2. Betreiber setzt Admin-Recht per CLI:
   ```sh
   npm run set-admin -- betreiber@example.com
   ```
   Das setzt sowohl `is_admin = true` als auch `is_approved = true`.
3. Betreiber öffnet `/admin/accounts` im Browser und kann alle Accounts freischalten oder sperren.

### Sicherheit

- Die Seite und die API (`/api/admin/accounts`) sind doppelt gesichert:
  - Eingeloggter Account erforderlich
  - `is_admin = true` erforderlich
- Normale Nutzer sehen nur einen Redirect auf `/`, kein Fehlermeldung

