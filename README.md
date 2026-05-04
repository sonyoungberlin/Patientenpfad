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

## Prisma-Migrationen (Production / Preview)

Migrationen werden grundsätzlich **gegen die Deployment-Datenbank** ausgeführt –
nicht von einer Entwickler-Maschine aus. Lokales `prisma migrate dev` gegen
Neon ist nicht vorgesehen und scheitert i. d. R. an Netzwerk-/Firewall-Regeln
(`P1001`).

### Automatisch (Vercel)

Bei jedem Vercel-Build läuft via `vercel-build`-Script:

```sh
prisma migrate deploy && next build
```

`prisma migrate deploy` nutzt dabei **`DIRECT_DATABASE_URL`** direkt aus der
Vercel-Environment (siehe `prisma/schema.prisma` → `directUrl`). Das gilt für
Production **und** Preview – ausstehende Migrationen werden also bei jedem
Deploy angewendet.

#### Neon / Vercel-Postgres-Mapping (Pflicht)

Neon bzw. Vercel-Postgres stellt automatisch `POSTGRES_PRISMA_URL` (pooled)
und `POSTGRES_URL_NON_POOLING` (direct) bereit. Das Projekt erwartet aber die
stabilen Namen aus `prisma/schema.prisma`. In den Vercel Environment Variables
muss daher für jede Umgebung (Production, Preview, Development) gesetzt sein:

- `DATABASE_URL` = Wert von `POSTGRES_PRISMA_URL` (pooled, für Runtime-Queries)
- `DIRECT_DATABASE_URL` = Wert von `POSTGRES_URL_NON_POOLING` (direct, für
  `prisma migrate deploy`)
- Beide URLs sollen den Query-Parameter `connect_timeout=15` enthalten, damit
  Neon-Compute-Instanzen nach einem Scale-to-zero genug Zeit zum Aufwachen
  haben (verhindert `P1001`-Fehler).

`vercel-build` nutzt diese Environment-Variablen direkt; `DIRECT_DATABASE_URL`
darf **nicht** auf `DATABASE_URL` überschrieben werden – sonst läuft
`prisma migrate deploy` über den Pooler und schlägt fehl. Die vollständige
Doku liegt in [`.env.example`](./.env.example).

### Manuell (z. B. wenn eine Migration ohne Deploy nachgezogen werden muss)

Bevorzugt über die Vercel-CLI mit den verlinkten Projekt-ENV
(keine lokale `.env` nötig, keine Secrets im Repo):

```sh
# Einmalig Projekt verlinken
vercel link

# Production-ENV in die aktuelle Shell ziehen (nur für diesen Aufruf!)
vercel env pull .env.vercel.production --environment=production

# Migration ausführen – nutzt DIRECT_DATABASE_URL aus der gezogenen Datei
env $(grep -v '^#' .env.vercel.production | xargs) npm run db:migrate:deploy

# Datei danach löschen, damit keine Secrets liegen bleiben
rm .env.vercel.production
```

Verfügbare npm-Scripts:

```sh
npm run db:migrate:deploy   # = prisma migrate deploy
npm run db:generate         # = prisma generate
```

Diese Scripts versuchen **keine** Verbindung zu testen und verändern keine
lokalen Variablen – sie führen ausschließlich den jeweiligen Prisma-Befehl
mit den ENV-Variablen aus, die der Aufrufer mitgibt.

