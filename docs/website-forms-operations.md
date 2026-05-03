# Website-Forms — Operations & Logging

Phase 3d. Dieses Dokument beschreibt die strukturierten Log-Marker, die der
Website-Form-Flow emittiert, und wie das Cleanup-Skript für abgelaufene
unbestätigte Submissions zu betreiben ist.

Geltungsbereich:

- `app/api/p/[slug]/submit/route.ts` (öffentlicher Submit)
- `app/p/confirm/[token]/page.tsx` (Bestätigungs-Route)
- `scripts/cleanup-unconfirmed-website-submits.mjs` (manuelles Cleanup)

Nicht in Scope: andere Routen, Audit-Persistenz (kein dediziertes
Audit-Schema), externer Log-Aggregator.

---

## Log-Konventionen

Alle drei Pfade emittieren strukturierte `console.info` / `console.warn` /
`console.error`-Einträge mit einem **Marker** als erstes Argument und einem
**Payload-Objekt** als zweites Argument:

```
console.info("[website-form/<area>]", { event, outcome, ... });
```

Marker:

- `[website-form/submit]` — vom Submit-Endpoint.
- `[website-form/confirm]` — von der Confirm-Route.
- `[website-form/cleanup]` — vom manuellen Cleanup-Skript.

Pflichtfelder im Payload:

- `event` — was passiert ist (z. B. `submit`, `confirm`, `dry_run`, `apply`).
- `outcome` — Ergebnis (siehe Tabellen unten). Wird auch im Erfolgsfall gesetzt.

### Datenschutz-Regeln für Logs

Die folgenden Werte dürfen **nie** Teil eines Log-Payloads werden:

- der Klartext-Bestätigungs-Token,
- der gehashte Bestätigungs-Token (`confirm_token`),
- die Empfängeradresse oder ihr Hash (`submitter_email_hash`),
- IP-Adressen,
- die eingereichten Antworten oder daraus abgeleitete Daten.

Erlaubt sind:

- `outcome`-Klassifikation,
- Session-IDs (`sessionId`) und Praxis-Form-IDs (`practiceFormId`) **nur** im
  Erfolgsfall (`outcome=success`),
- Zähler (z. B. `candidate_count`, `deleted_count`),
- Slug, sofern für die Diagnose nötig — kein Geheimnis (öffentliche URL).

Bei Fehlern wird `detail` als Kurztext (`err.message`) übernommen, ohne
Stack-Trace und ohne Variablen-Dump.

---

## Submit (`[website-form/submit]`)

| `outcome`            | Bedeutung                                                                            | Level   |
| -------------------- | ------------------------------------------------------------------------------------ | ------- |
| `success`            | Session angelegt, Bestätigungs-Mail erfolgreich versendet (oder console-geloggt).    | info    |
| `mail_failed`        | Session bleibt `awaiting_email_confirmation`, Mail-Layer hat geworfen.               | error   |
| `invalid_body`       | Body weder gültiges JSON noch Form-Data.                                             | info    |
| `invalid_email`      | E-Mail-Format ungültig.                                                              | info    |
| `honeypot`           | Honeypot-Feld gefüllt — keine DB-Schreibung, generischer Erfolgs-Redirect.           | info    |
| `not_found`          | Slug-/Owner-/Form-Cascade negativ. Antwort: 404, generisch.                          | info    |
| `rate_limited_ip`    | IP+Slug-Bucket überschritten.                                                        | info    |
| `rate_limited_email` | E-Mail-Hash-Bucket überschritten.                                                    | info    |
| `unexpected_error`   | Unerwarteter Fehler. Antwort: 500.                                                   | error   |

Felder:

- bei `success`: `event=submit`, `sessionId`, `practiceFormId`, `slug`.
- bei `mail_failed`: `event=submit`, `sessionId`, `practiceFormId`, `slug`, `detail`.
- bei `not_found`: `event=submit`, `slug`.
- bei `unexpected_error`: `event=submit`, `slug?`, `detail`.

## Confirm (`[website-form/confirm]`)

| `outcome`              | Bedeutung                                                              | Level |
| ---------------------- | ---------------------------------------------------------------------- | ----- |
| `success`              | Session bestätigt, Token verbrannt.                                    | info  |
| `already_confirmed`    | Session ist `completed` und `confirmed_at != null`. UX zeigt eigenen Hinweis. | info  |
| `invalid_token_format` | Token entspricht nicht dem erwarteten base64url-Format.                | info  |
| `not_found`            | Hash-Lookup leer.                                                      | info  |
| `wrong_state`          | source/status passt nicht (kein Website-Submit oder bereits in anderem Zustand). | info  |
| `expired`              | Token-Ablaufzeitpunkt in der Vergangenheit oder fehlt.                 | info  |
| `owner_disabled`       | Praxis-Account zwischenzeitlich deaktiviert oder Feature-Flag aus.     | info  |
| `form_inactive`        | Praxisformular zwischenzeitlich deaktiviert.                           | info  |
| `update_failed`        | Prisma-`update` hat geworfen.                                          | error |

Felder:

- bei `success` und `already_confirmed`: `event=confirm`, `sessionId`,
  `practiceFormId?` (nur falls `practice_form` geladen).
- alle anderen: `event=confirm`. Keine `sessionId`, weil im Negativfall
  bewusst nicht offengelegt werden darf, dass eine Session existiert.
- bei `update_failed`: zusätzlich `detail`.

## Cleanup (`[website-form/cleanup]`)

| `outcome`           | Bedeutung                                                      | Level |
| ------------------- | -------------------------------------------------------------- | ----- |
| `dry_run`           | Reines Reporting, ohne `--apply`.                              | info  |
| `apply_started`     | Lauf mit `--apply` hat Löschphase begonnen.                    | info  |
| `apply_finished`    | Lauf mit `--apply` ist abgeschlossen, inklusive `deleted_count`. | info  |
| `apply_noop`        | `--apply` ohne gefundene Kandidaten.                           | info  |
| `error`             | Skript-Fehler (DB-Connect, etc.).                              | error |

Felder: `event=cleanup`, `mode` (`dry_run` | `apply`), `candidate_count`, bei
`apply_finished` zusätzlich `deleted_count`, bei `error` zusätzlich `detail`.

Es werden bewusst **keine** Session-IDs in das Cleanup-Log geschrieben — der
Lauf soll keine Identifier persistierter Patient-Submissions in den
Log-Aggregator tragen. Wer im Detail wissen muss, welche Sessions ein Lauf
trifft, soll vorher den Dry-Run direkt am Server ansehen.

---

## Cleanup-Runbook

Voraussetzung: `DATABASE_URL` und `DIRECT_DATABASE_URL` korrekt gesetzt
(siehe `.env.example`). Das Skript verwendet die normale Prisma-Verbindung.

```bash
# 1. Dry-Run: zeigt Kandidaten, löscht nichts.
node scripts/cleanup-unconfirmed-website-submits.mjs

# 2. Tatsächlich löschen.
node scripts/cleanup-unconfirmed-website-submits.mjs --apply
```

Bedingungen für die Löschung — alle MÜSSEN erfüllt sein:

- `source = "website"`
- `status = "awaiting_email_confirmation"`
- `confirmed_at IS NULL`
- `confirm_token_expires_at < now()`

Damit sind ausgeschlossen:

- bestätigte / `completed` Sessions,
- interne Sessions (`source != "website"`),
- Sessions, deren Token noch gültig ist.

Empfehlung für den Pilotbetrieb: einmal pro Woche manuell. **Kein** Cron-Job
in dieser Phase.

## Verweise

- Mail-Doku: [`website-forms-mail.md`](./website-forms-mail.md)
- E2E-Checkliste: [`website-forms-e2e-checklist.md`](./website-forms-e2e-checklist.md)
