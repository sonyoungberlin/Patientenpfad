# CP-K01 – Kommunikation geklärt

- **checkpoint_id:** `CP-K01`
- **block_id:** `kommunikation`
- **block_title:** Kommunikation & Erreichbarkeit
- **typ:** PRESENCE_CHECK
- **category:** `O` (organisatorisch)
- **relevance:** `P` (Pflicht)

---

## Entscheidungsfrage

Ist ein verlässlicher Kommunikationsweg zum Patienten vorhanden?

---

## M2-Fragen

| ID     | Frage                                                                 |
|--------|-----------------------------------------------------------------------|
| M2-01  | Ist der Patient direkt erreichbar (Telefon, E-Mail oder persönlich)?  |
| M2-02  | Gibt es eine Person, die stellvertretend erreichbar ist?              |
| M2-03  | Welcher Kommunikationsweg ist bevorzugt oder realistisch nutzbar?     |
| M2-04  | Bestehen Sprachbarrieren oder Verständigungseinschränkungen?          |

---

## Aggregationslogik

| Ergebnis                    | Bedingung                                                                                                             |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **erreichbar** (DONE)        | Direkter Kommunikationsweg vorhanden ODER stabiler indirekter Kommunikationsweg vorhanden                            |
| **eingeschränkt erreichbar** (DONE) | Kommunikation möglich, aber mit Einschränkungen (z. B. nur über Dritte oder mit Sprachbarriere)              |
| **nicht erreichbar** (OPEN)  | Kein verlässlicher direkter oder indirekter Kommunikationsweg vorhanden                                              |
| **unklar** (UNCLEAR)         | Angaben fehlen oder sind widersprüchlich                                                                              |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Informationen fehlen oder sind widersprüchlich, eine sichere Bewertung ist aktuell nicht möglich. Klärung ist sinnvoll und soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **erreichbar** (DONE), **eingeschränkt erreichbar** (DONE) oder **nicht erreichbar** (OPEN).

---

## Status-Definitionen

### DONE
Mindestens ein verlässlicher Kommunikationsweg ist bekannt – direkt oder über eine stellvertretende Person. Eingeschränkte Erreichbarkeit (z. B. nur über Dritte oder mit Sprachbarriere) gilt ebenfalls als DONE: Kommunikation ist ausreichend möglich, auch wenn nicht optimal.

### OPEN
Kein verlässlicher Kommunikationsweg vorhanden. Es fehlt sowohl ein direkter Weg zum Patienten als auch ein indirekter über Dritte.

### UNCLEAR
Angaben zur Erreichbarkeit fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt bei Arzt oder Praxis. Klärung soll im weiteren Verlauf erfolgen.

---

## To-dos

| Status  | To-do                                                                                                           |
|---------|-----------------------------------------------------------------------------------------------------------------|
| OPEN    | Telefonnummer oder erreichbare Kontaktperson klären                                                             |
| UNCLEAR | Fehlende oder widersprüchliche Angaben zur Erreichbarkeit klären (Patient / Angehörige / Zuweiser)              |

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Angehörige, Zuweiser)
