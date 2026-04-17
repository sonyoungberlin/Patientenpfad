# CP-K05 – Diagnosenlage geklärt

- **checkpoint_id:** `CP-K05`
- **block_id:** `diagnosenlage`
- **block_title:** Diagnosenlage
- **typ:** STATUS_KLAERUNG
- **category:** `M` (medizinisch)
- **relevance:** `P` (Pflicht)

---

## Entscheidungsfrage

Ist die Erkrankungssituation ausreichend nachvollziehbar?

---

## M2-Fragen

| ID     | Frage                                                                                                          |
|--------|----------------------------------------------------------------------------------------------------------------|
| M2-01  | Sind Sie aktuell wegen einer Erkrankung in ärztlicher Behandlung?                                             |
| M2-02  | Waren Sie in letzter Zeit wegen einer Erkrankung beim Arzt oder im Krankenhaus?                               |
| M2-03  | Gibt es Erkrankungen, wegen denen Sie regelmäßig Medikamente einnehmen?                                       |
| M2-04  | Gibt es etwas an Ihrer gesundheitlichen Situation, das unklar ist oder sich noch in Abklärung befindet?       |

---

## Aggregationslogik

| Ergebnis                           | Bedingung                                                                                   |
|------------------------------------|---------------------------------------------------------------------------------------------|
| **ausreichend** (DONE)             | Krankheits- bzw. Diagnosenkontext ist nachvollziehbar                                       |
| **eingeschränkt ausreichend** (DONE) | Teilweise nachvollziehbar, kleinere Lücken vorhanden; Weiterarbeit ist möglich            |
| **nicht ausreichend** (OPEN)       | Die Erkrankungssituation ist aktuell nicht ausreichend nachvollziehbar.             |
| **unklar** (UNCLEAR)               | Angaben fehlen oder sind widersprüchlich                                                    |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **ausreichend** (DONE), **eingeschränkt ausreichend** (DONE) oder **nicht ausreichend** (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob die Diagnosenlage ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene durch den Arzt.

---

## Status-Definitionen

### DONE
Die Diagnosenlage ist ausreichend nachvollziehbar, um den Fall medizinisch einzuordnen. Auch bei kleineren Lücken ist eine Weiterarbeit möglich.

### OPEN
Die Diagnosenlage ist aktuell nicht ausreichend nachvollziehbar.

### UNCLEAR
Angaben zur Diagnosenlage fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## Dokumentationsausgaben (M5)

| Status  | Satz                                                              |
|---------|-------------------------------------------------------------------|
| DONE    | „Diagnosenlage ist ausreichend geklärt"                   |
| OPEN    | „Diagnosenlage ist aktuell nicht ausreichend geklärt"     |
| UNCLEAR | „Diagnosenlage ist unklar"                                        |

---

## To-dos

| Status  | To-do                            |
|---------|----------------------------------|
| OPEN    | Diagnosenlage klären             |
| UNCLEAR | Angaben zur Diagnosenlage klären |

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Arztbriefe, Vorbefunde)
