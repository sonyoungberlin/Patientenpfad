# CP-K07 – Versorgungsumfeld geklärt

- **checkpoint_id:** `CP-K07`
- **block_id:** `versorgungsumfeld`
- **block_title:** Versorgungsumfeld
- **typ:** STATUS_KLAERUNG
- **category:** `A` (administrativ)
- **relevance:** `A` (optional)

---

## Entscheidungsfrage

Ist die Versorgungssituation im Alltag ausreichend nachvollziehbar?

---

## M2-Fragen

| ID     | Frage                                                                       |
|--------|-----------------------------------------------------------------------------|
| M2-01  | Gibt es aktuell Situationen, in denen Sie Unterstützung benötigen?          |
| M2-02  | Erhalten Sie Unterstützung durch Familie oder Freunde?                      |
| M2-03  | Erhalten Sie Unterstützung durch einen Pflegedienst oder ähnliche Hilfe?   |

---

## Aggregationslogik

| Ergebnis                             | Bedingung                                                                                        |
|--------------------------------------|--------------------------------------------------------------------------------------------------|
| **ausreichend** (DONE)               | Versorgungssituation ist nachvollziehbar; vorhandener Unterstützungsbedarf ist abgedeckt oder nicht vorhanden |
| **eingeschränkt ausreichend** (DONE) | Teilweise Unterstützung vorhanden oder kleinere Lücken                                           |
| **nicht ausreichend** (OPEN)         | Unterstützungsbedarf besteht oder wird vermutet, aber keine oder unzureichende Unterstützung vorhanden |
| **unklar** (UNCLEAR)                 | Angaben fehlen oder sind widersprüchlich                                                         |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu ausreichend (DONE), eingeschränkt ausreichend (DONE) oder nicht ausreichend (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob die Versorgungssituation ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### DONE
Die Versorgungssituation ist ausreichend nachvollziehbar. Unterstützungsbedarf ist entweder nicht vorhanden oder ausreichend abgedeckt.

### OPEN
Die Versorgungssituation ist aktuell nicht ausreichend nachvollziehbar oder bestehender Unterstützungsbedarf ist nicht abgedeckt.

### UNCLEAR
Angaben zur Versorgungssituation fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## To-dos

| Status  | To-do                         |
|---------|-------------------------------|
| OPEN    | Versorgungssituation klären   |
| UNCLEAR | Angaben zur Versorgung klären |

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Pflege)
