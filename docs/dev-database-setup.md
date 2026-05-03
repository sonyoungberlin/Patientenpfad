# Datenbank-Setup (lokal / Vercel / Neon)

## Übersicht

Prisma arbeitet dauerhaft mit zwei stabilen Umgebungsvariablen:

| Variable             | Bedeutung                                                       |
|----------------------|-----------------------------------------------------------------|
| `DATABASE_URL`       | Verbindungs-URL für Laufzeit-Queries (darf Pooler sein)         |
| `DIRECT_DATABASE_URL`| Direkte Verbindung ohne Pooler (Pflicht für Prisma Migrate)     |

---

## Woher kommen die Werte?

### Lokal (`.env.local`)

Lege eine Datei `.env.local` im Projekt-Root an (sie ist in `.gitignore`
aufgelistet und wird **nicht** in Git eingecheckt):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?connect_timeout=15"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?connect_timeout=15"
```

Bei Neon:
- **DATABASE_URL** → die Pooler-URL (z. B. `...pooler.neon.tech:5432/...`)
- **DIRECT_DATABASE_URL** → die direkte URL (z. B. `...neon.tech:5432/...`, ohne `pooler`-Subdomain)

### Vercel

Vercel (mit Neon-Integration) stellt automatisch POSTGRES_*-Variablen bereit.
Diese müssen **manuell** auf die stabilen Namen gemappt werden:

1. Vercel-Dashboard → Projekt → **Settings → Environment Variables**
2. Neue Variable anlegen:
   - `DATABASE_URL` → Wert: `$POSTGRES_PRISMA_URL` (oder direkter String der Pooler-URL)
   - `DIRECT_DATABASE_URL` → Wert: `$POSTGRES_URL_NON_POOLING` (oder direkter String der Direct-URL)
3. Beide URLs sollten `?connect_timeout=15` enthalten.

> **Kein automatisches Branching** für Pre-Pilot aktivieren – alle Umgebungen
> (Production, Preview, Development) sollen dieselbe stabile Neon-Datenbank
> verwenden, bis Branching explizit freigegeben wird.

---

## `schema.prisma`

Die `datasource`-Konfiguration ist bereits korrekt gesetzt und muss
**nicht geändert werden**:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

---

## Migrationen ausführen

```bash
# Lokal: direkte URL wird von Prisma über directUrl automatisch verwendet
npx prisma migrate deploy

# oder via npm-Script
npm run migrate:deploy
```

> **Wichtig:** `prisma migrate deploy` (und `migrate dev`) nutzen intern
> `DIRECT_DATABASE_URL`. Migrationen **niemals** gegen eine Pooler-URL
> ausführen – der Pooler unterstützt kein Session-Modus-SQL, das Migrate
> benötigt.

---

## Migrationen über Vercel-Deploy ausführen

Wenn der lokale Rechner Neon nicht erreicht (z. B. P1001 trotz korrekter
`DATABASE_URL`), Vercel die Datenbank aber sehr wohl erreicht, lassen sich
Migrationen über die Deployment-Umgebung ausrollen.

Dazu ist in `package.json` ein eigenes Script `vercel-build` definiert:

```json
"vercel-build": "prisma migrate deploy && next build"
```

Verhalten:

- Vercel bevorzugt automatisch `vercel-build` gegenüber `build`, sobald es
  existiert. Lokales `npm run build` bleibt unverändert (`next build` ohne
  Migrate) – Entwickler ohne DB-Zugriff können weiterhin lokal bauen.
- Bei jedem Vercel-Deploy (Production **und** Preview) läuft `prisma migrate
  deploy` **vor** `next build`. Schlägt die Migration fehl, bricht der Build
  ab – es gibt kein Deployment mit halb migrierter DB.
- Es wird ausschließlich `prisma migrate deploy` ausgeführt. **Keine**
  destruktiven Befehle (`migrate dev`, `migrate reset`, `db push` o. ä.).
  `migrate deploy` wendet ausstehende Migrationen idempotent an und ändert
  keine Daten außerhalb der in `prisma/migrations/` versionierten Schritte.
- Genutzt wird automatisch `DIRECT_DATABASE_URL` (über `directUrl` in
  `schema.prisma`). Diese Variable muss im Vercel-Projekt gesetzt sein
  (siehe Abschnitt „Vercel" oben).

Rollout neuer Migrationen:

1. Migration lokal generieren bzw. manuell schreiben und in
   `prisma/migrations/` committen.
2. Branch nach Vercel pushen → Preview-Deploy führt `prisma migrate deploy`
   gegen die konfigurierte DB aus.
3. Nach Merge in den Production-Branch wendet der Production-Build dieselbe
   Migration gegen die Production-DB an.

> **Wichtig:** Production- und Preview-Environment in Vercel müssen auf die
> gewünschte Ziel-Datenbank zeigen. Solange Pre-Pilot kein Branching nutzt
> (siehe oben), laufen Preview-Deploys gegen dieselbe Neon-DB wie Production
> – ein Preview-Deploy migriert also bereits die Produktions-DB.

---

## Fehlercode P1001 – Was tun?

`P1001: Can't reach database server` tritt bei Neon typischerweise auf, wenn:

1. **Scale-to-zero / Suspended Compute** – Neon schläft ein, wenn keine Anfragen
   kommen. Der erste Verbindungsversuch weckt die Instanz auf, kann aber
   mehrere Sekunden dauern.
   - **Lösung:** `connect_timeout=15` in beiden URLs sicherstellen (gibt der
     Instanz genug Zeit zum Aufwachen).
   - Im Neon-Dashboard kann Scale-to-zero pro Branch deaktiviert werden
     (kostenpflichtig).

2. **Falsche URL / Credentials** – Tipp- oder Konfigurationsfehler.
   - Prüfen: Sind `DATABASE_URL` und `DIRECT_DATABASE_URL` in der jeweiligen
     Umgebung gesetzt? (`echo $DATABASE_URL`)

3. **IP-Allowlist / Firewall** – Neon erlaubt standardmäßig alle IPs. Bei
   restriktiven Projekten: IP des Deployment-Servers freigeben.

4. **Branch suspended / deleted** – Im Neon-Dashboard prüfen, ob der Branch
   noch aktiv ist.
