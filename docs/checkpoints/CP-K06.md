# CP-K06 – Externe Mitbehandler geklärt

- **checkpoint_id:** `CP-K06`
- **block_id:** `externe_mitbehandler`
- **block_title:** Externe Mitbehandler
- **typ:** STATUS_KLAERUNG
- **category:** `A` (administrativ)
- **relevance:** `A` (optional)

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

| Status  | Satz                                                                                  |
|---------|---------------------------------------------------------------------------------------|
| DONE    | „Externe Mitbehandlungssituation ist ausreichend geklärt"                     |
| OPEN    | „Externe Mitbehandlungssituation ist aktuell nicht ausreichend geklärt"       |
| UNCLEAR | „Externe Mitbehandlungssituation ist unklar"                                          |

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

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern`
