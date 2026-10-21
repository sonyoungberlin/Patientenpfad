# Datenbank-Setup für Entwicklung

## Verbindungen

`prisma/schema.prisma` verwendet zwei Umgebungsvariablen:

| Variable | Verwendung |
| --- | --- |
| `DATABASE_URL` | Anwendungszugriffe; kann eine gepoolte Neon-URL sein |
| `DIRECT_DATABASE_URL` | Direkte Datenbankverbindung für Prisma-Migrationen |

Lokale Zugangsdaten gehören ausschließlich in eine ignorierte lokale
`.env`-Datei. Sie dürfen nicht in Git, Chat, Logs oder Konsolenausgaben
gelangen. Beim Wechsel des Codespaces können lokale Env-Dateien fehlen; das
sagt nichts darüber aus, ob Vercel Production-Variablen gesetzt sind.

## Lokale Migrationen

`prisma migrate dev` und andere Schemaänderungen dürfen nur gegen eine
ausdrücklich als Entwicklungsdatenbank identifizierte Datenbank ausgeführt
werden. Production ist keine Entwicklungsdatenbank. Prüfe vor jedem
Migrationsbefehl das tatsächlich konfigurierte Ziel, ohne den Verbindungsstring
auszugeben.

Die `package.json` enthält `migrate:deploy`- und `db:migrate:deploy`-Scripts.
Sie werden nicht automatisch ausgeführt. `vercel-build` ist in diesem Projekt
`next build` und führt keine Migrationen aus.

## Production ist ein gesonderter Ablauf

Produktionsmigrationen erfordern zuerst eine lesende Prüfung der tatsächlichen
Migrationstabelle und des Schemas, den Vergleich mit den Migrationen im
Release, die Prüfung der SQL-Auswirkungen und ausdrückliche Freigabe der
konkreten Änderungen. Verwende keine blinden Aufrufe von `prisma db push`,
`prisma migrate deploy` oder `prisma migrate reset`.

Wenn der Codespace wegen `P1001` Neon nicht erreicht, siehe den dokumentierten
[Vercel-Sandbox-Weg und die sichere Production-Reihenfolge](deployment-and-database.md).
