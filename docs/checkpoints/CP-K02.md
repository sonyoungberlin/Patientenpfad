# CP-K02 – Zugang zur Versorgung geklärt

- **checkpoint_id:** `CP-K02`
- **block_id:** `zugang_versorgung`
- **block_title:** Zugang zur Versorgung
- **typ:** STATUS_KLAERUNG
- **category:** `A` (administrativ)
- **relevance:** `P` (pflichtrelevant)

---

## Entscheidungsfrage

Ist der Zugang zur Versorgung grundsätzlich möglich?

---

## M2-Fragen

| ID     | Frage                                                              |
|--------|--------------------------------------------------------------------|
| M2-01  | Können Sie Termine in der Praxis grundsätzlich wahrnehmen?         |
| M2-02  | Ist es für Sie schwierig, Termine in der Praxis wahrzunehmen?      |

---

## Aggregationslogik

| Ergebnis                             | Bedingung                                                                        |
|--------------------------------------|----------------------------------------------------------------------------------|
| **ausreichend** (DONE)               | Termine können grundsätzlich ohne relevante Einschränkungen wahrgenommen werden   |
| **eingeschränkt ausreichend** (DONE) | Termine sind grundsätzlich möglich, aber mit Einschränkungen oder Schwierigkeiten |
| **nicht ausreichend** (OPEN)         | Termine können grundsätzlich nicht wahrgenommen werden                           |
| **unklar** (UNCLEAR)                 | Angaben fehlen oder sind widersprüchlich                                         |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu ausreichend (DONE), eingeschränkt ausreichend (DONE) oder nicht ausreichend (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob der Zugang zur Versorgung ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### DONE
Der Zugang zur Versorgung ist grundsätzlich möglich. Auch bei bestehenden Schwierigkeiten ist eine Versorgung möglich.

### OPEN
Der Zugang zur Versorgung ist aktuell nicht ausreichend möglich.

### UNCLEAR
Angaben zum Zugang fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich.

---

## To-dos

| Status  | To-do                             |
|---------|-----------------------------------|
| OPEN    | Zugang zur Versorgung klären      |
| UNCLEAR | Angaben zur Erreichbarkeit klären |

---

## Typische Antwortgeber

- `patient`
- `praxis`
