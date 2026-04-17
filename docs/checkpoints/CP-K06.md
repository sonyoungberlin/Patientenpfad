# CP-K06 – Externe Mitbehandler geklärt

- **checkpoint_id:** `CP-K06`
- **block_id:** `externe_mitbehandler`
- **block_title:** Externe Mitbehandler
- **typ:** STATUS_KLAERUNG
- **category:** `A` (administrativ)
- **relevance:** `A` (Aufnahme)

---

## Entscheidungsfrage

Ist die externe Mitbehandlungssituation ausreichend nachvollziehbar?

---

## M2-Fragen

| ID     | Frage                                                                                              |
|--------|----------------------------------------------------------------------------------------------------|
| M2-01  | Waren Sie in den letzten 4 Wochen bei einem Facharzt, im Krankenhaus oder bei einem anderen Behandler? |
| M2-02  | Sind Sie dauerhaft bei Fachärzten oder anderen Behandlern in Behandlung?                           |
| M2-03  | Haben Sie aktuell Termine bei anderen Behandlern geplant?                                          |
| M2-04  | Erhalten Sie Unterstützung durch einen Pflegedienst oder ähnliche Hilfe?                           |

---

## Aggregationslogik

| Ergebnis                             | Bedingung                                                                           |
|--------------------------------------|-------------------------------------------------------------------------------------|
| **ausreichend** (DONE)               | Externe Mitbehandlung ist nachvollziehbar                                           |
| **eingeschränkt ausreichend** (DONE) | Teilweise nachvollziehbar, kleinere Lücken vorhanden                                |
| **nicht ausreichend** (OPEN)         | Keine verlässliche Übersicht über externe Mitbehandlung                             |
| **unklar** (UNCLEAR)                 | Angaben fehlen oder sind widersprüchlich                                            |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu ausreichend (DONE), eingeschränkt ausreichend (DONE) oder nicht ausreichend (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob die externe Mitbehandlungssituation ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### DONE
Die externe Mitbehandlungssituation ist ausreichend nachvollziehbar. Auch wenn keine externe Mitbehandlung vorliegt, kann der Checkpoint DONE sein.

### OPEN
Die externe Mitbehandlungssituation ist aktuell nicht ausreichend nachvollziehbar.

### UNCLEAR
Angaben zur externen Mitbehandlung fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## To-dos

| Status  | To-do                            |
|---------|----------------------------------|
| OPEN    | Mitbehandlungssituation klären   |
| UNCLEAR | Angaben zur Mitbehandlung klären |

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
