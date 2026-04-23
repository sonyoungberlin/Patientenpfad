# CP-K06 – Externe Mitbehandler geklärt

> ⚠️ **Hinweis:** Dieses Dokument ist eine Entwurfsdokumentation und weicht an mehreren
> Stellen vom aktuellen Code ab. Maßgeblich sind der `CHECKPOINT_CATALOGUE` in
> `lib/logic/checkpointCatalog.ts` und die kanonischen Regeln in
> `docs/architecture/checkpoints.md`.
>
> Bekannte Abweichungen in diesem Dokument:
> - `block_id: "externe_mitbehandler"` → Code K06 (`Unterstützung im Alltag`): `"versorgung_im_alltag"`
> - Dieser Entwurf beschreibt einen anderen inhaltlichen Checkpoint als K06 im Code.
>   K06 im Code heißt „Unterstützung im Alltag" (Pflegebedarf), nicht „Externe Mitbehandler".
> - `typ: STATUS_KLAERUNG` → Code K06: `CheckpointType.BEDARF`, neue Taxonomie: `DECISION`
> - `relevance: A` → Code K06: `relevance = P`
> - `relevance: A` bedeutet in der neuen Semantik „nur M3, keine Vorbereitung"

- **checkpoint_id:** `CP-K06` _(Code-ID unklar: K06 im Code hat abweichenden Inhalt)_
- **block_id:** `externe_mitbehandler` _(Code K06: `versorgung_im_alltag`)_
- **block_title:** Externe Mitbehandler
- **typ:** STATUS_KLAERUNG _(Code: `BEDARF`, neu: `DECISION`)_
- **category:** `O` (organisatorisch)
- **relevance:** `A` (nur M3) _(Code K06: `P`)_

---

## Entscheidungsfrage

Ist die externe Mitbehandlungssituation ausreichend nachvollziehbar?

---

## M2-Fragen

| ID     | Frage                                                                                              |
|--------|----------------------------------------------------------------------------------------------------|
| M2-01  | Waren Sie in den letzten 4 Wochen bei einem Facharzt, im Krankenhaus oder bei einem anderen Behandler? |
| M2-02  | Sind Sie dauerhaft bei Fachärzten oder anderen Behandlern in Betreuung?                            |
| M2-03  | Haben Sie aktuell Termine bei anderen Behandlern geplant?                                          |
| M2-04  | Sind Sie durch einen Pflegedienst oder andere externe Stellen in Betreuung?                        |

---

## Aggregationslogik

| Ergebnis                             | Bedingung                                                                           |
|--------------------------------------|-------------------------------------------------------------------------------------|
| **ausreichend** (OK)                 | Externe Mitbehandlung ist nachvollziehbar                                           |
| **eingeschränkt ausreichend** (OK)   | Teilweise nachvollziehbar, kleinere Lücken vorhanden                                |
| **nicht ausreichend** (TO_DO)        | Keine verlässliche Übersicht über externe Mitbehandlung                             |

> M2 liefert nur Kontext. Die Entscheidung, ob die externe Mitbehandlungssituation ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Die externe Mitbehandlungssituation ist ausreichend nachvollziehbar. Auch wenn keine externe Mitbehandlung vorliegt, kann der Checkpoint OK sein.

### TO_DO
Die externe Mitbehandlungssituation ist aktuell nicht ausreichend nachvollziehbar.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                                                  |
|-----------------|---------------------------------------------------------------------------------------|
| OK              | „Externe Mitbehandlungssituation ist ausreichend geklärt"                     |
| TO_DO           | „Externe Mitbehandlungssituation ist aktuell nicht ausreichend geklärt"       |

---

## To-dos

| Status  | To-do                            |
|---------|----------------------------------|
| TO_DO   | Mitbehandlungssituation klären   |

---

## Hinweis für M3-Anzeige

Wenn keine externe Mitbehandlung vorliegt, kann optional folgender Hinweis angezeigt werden:

„Keine externe Mitbehandlung – ggf. prüfen"

> Nur Hinweis – kein Statuswechsel, kein To-do.

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte teilen Sie uns die Kontaktdaten Ihrer behandelnden Ärzte mit."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern`
