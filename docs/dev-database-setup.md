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
