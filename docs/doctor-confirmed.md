# Status „Ärztlich bestätigt" (M3-Lock)

## Zweck

Der M3-Workflow endet mit einem expliziten **ärztlichen Bestätigungs­schritt**.
Mit diesem Klick erklärt die Ärztin / der Arzt die Bewertung als
abgeschlossen, **friert M3 ein** und macht damit klar: das Krankenblatt-/
Patientenhinweis-Material kann ab jetzt unverändert übernommen oder kopiert
werden.

> Ersetzt den vormaligen Button „Fall abschließen". Der Fall wird **nicht**
> geschlossen oder versteckt – er bleibt vollständig öffenbar.

---

## Datenmodell

`CaseSession` (Prisma):

| Feld                  | Typ        | Default | Beschreibung                                         |
|-----------------------|------------|---------|------------------------------------------------------|
| `doctor_confirmed`    | `Boolean`  | `false` | `true`, sobald „Ärztlich bestätigt" geklickt wurde.  |
| `doctor_confirmed_at` | `DateTime?`| `null`  | Zeitpunkt der Bestätigung (gesetzt mit dem Flag).    |

`stage_status` wird beim selben Schritt weiterhin auf `CLOSED` gesetzt –
damit bleibt das bestehende Status-Label „Abgeschlossen" in der Fallliste
erhalten.

---

## API

`PATCH /api/cases/[id]/close`

- Setzt `stage_status = CLOSED`, `doctor_confirmed = true`,
  `doctor_confirmed_at = now()`.
- Idempotent: erneutes Aufrufen bei bereits bestätigtem Fall liefert
  `200 { ok: true, already_confirmed: true }` ohne DB-Update.

`PATCH /api/cases/[id]/checkpoint/update`

- **Guard:** liefert `409` zurück, wenn `doctor_confirmed === true`.
- Schützt sowohl Standard- als auch MULTI_SELECT-Updates serverseitig vor
  nachträglichen Änderungen.

---

## UI-Verhalten

- Button ist mit `Ärztlich bestätigt` beschriftet (vorher: „Fall abschließen").
- Nach Klick:
  - `doctor_confirmed` wird gesetzt
  - **kein Redirect** – der Fall bleibt offen
  - der Bestätigungs-Banner wird sichtbar
  - der Button wechselt zu `Ärztlich bestätigt ✓` und wird deaktiviert
- M3-Bedienelemente (Status-Buttons, MULTI_SELECT-Toggle und -Optionen)
  werden über das bestehende `isLocked` deaktiviert (`disabled` + visuelles
  Dimming via `opacity`).
- M4 („Patientenhinweise / To-dos") und M5 („Dokumentation für das
  Krankenblatt") bleiben **unverändert sichtbar**, inkl. aller
  Copy-Buttons (Text kopieren, Nachricht kopieren, Dokumentation kopieren).

---

## Was bleibt nutzbar

- Lesen aller M3-Auswahlen, M4-Texte und M5-Dokumentation
- Kopieren von M4-Block, M4-Nachricht (mit Signatur) und M5-Dokumentation
- Externes Weiterverarbeiten durch die MFA
- Löschen des Falls (bestehende Funktion in der Fallübersicht)

## Was nicht mehr möglich ist

- Bewertung von Standard-Checkpoints (`OK` / `TO_DO` / `ZURÜCKSTELLEN`)
- Aktivieren / Deaktivieren von MULTI_SELECT-Checkpoints (z. B. K10, K11)
- Setzen / Entfernen von MULTI_SELECT-Auswahloptionen
- Jegliche Neuberechnung aus M3 heraus (M4 / M5 sind fix)

> Die gesamte Seite wird **nicht** als read-only gerendert – nur die
> M3-Eingaben sind blockiert. M4-, M5- und Copy-Bereiche bleiben aktiv.

---

## Bestandsfälle

Bestehende Fälle bekommen `doctor_confirmed = false` per DB-Default. Sie
verhalten sich unverändert. Erst der nächste Klick auf „Ärztlich bestätigt"
aktiviert den Lock.
