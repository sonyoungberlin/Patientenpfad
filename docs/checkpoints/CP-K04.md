# CP-K04 – Medikation geklärt

- **checkpoint_id:** `CP-K04`
- **block_id:** `medikation`
- **block_title:** Medikation
- **typ:** STATUS_KLAERUNG
- **category:** `M` (medizinisch)
- **relevance:** `P` (Pflicht)

---

## Entscheidungsfrage

Ist die Medikation ausreichend nachvollziehbar und wird die Einnahme zuverlässig umgesetzt?

---

## M2-Fragen

| ID     | Frage                                                                              |
|--------|------------------------------------------------------------------------------------|
| M2-01  | Haben Sie einen aktuellen Medikamentenplan oder eine Übersicht?                    |
| M2-02  | Nehmen Sie Ihre Medikamente regelmäßig ein?                                        |
| M2-03  | Fällt es Ihnen leicht, die Medikamente wie vorgesehen einzunehmen?                 |
| M2-04  | Nehmen Sie auch Medikamente ein, die nicht auf Ihrem Plan stehen?                  |
| M2-05  | Haben Sie Probleme oder Beschwerden im Zusammenhang mit Ihren Medikamenten?        |

---

## Aggregationslogik

| Ergebnis                           | Bedingung                                                                                   |
|------------------------------------|---------------------------------------------------------------------------------------------|
| **ausreichend** (DONE)             | Medikation ist nachvollziehbar und Einnahme erfolgt zuverlässig                             |
| **eingeschränkt ausreichend** (DONE) | Kleinere Unsicherheiten oder Unregelmäßigkeiten vorhanden; Weiterarbeit ist möglich       |
| **nicht ausreichend** (OPEN)       | Kein verlässlicher Überblick über Medikation und Einnahme vorhanden                        |
| **unklar** (UNCLEAR)               | Angaben fehlen oder sind widersprüchlich                                                    |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **ausreichend** (DONE), **eingeschränkt ausreichend** (DONE) oder **nicht ausreichend** (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob die Medikation ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene durch den Arzt.

---

## Status-Definitionen

### DONE
Die Medikation ist ausreichend nachvollziehbar und wird zuverlässig umgesetzt. Auch bei kleineren Unsicherheiten oder Einschränkungen ist eine Weiterarbeit möglich.

### OPEN
Die Medikation ist aktuell nicht ausreichend nachvollziehbar oder wird nicht zuverlässig umgesetzt.

### UNCLEAR
Angaben zur Medikation fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## To-dos

| Status  | To-do                         |
|---------|-------------------------------|
| OPEN    | Medikamentenstatus klären     |
| UNCLEAR | Angaben zur Medikation klären |

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Arztbriefe, Apotheke)
