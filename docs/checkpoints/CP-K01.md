# CP-K01 – Kommunikation geklärt

- **checkpoint_id:** `CP-K01`
- **block_id:** `kommunikation`
- **block_title:** Kommunikation & Erreichbarkeit
- **typ:** STATUS_KLAERUNG
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
| M2-03  | Welcher Kommunikationsweg ist aktuell nutzbar?                        |
| M2-04  | Bestehen Sprachbarrieren oder Verständigungseinschränkungen?          |

---

## Aggregationslogik

| Ergebnis                    | Bedingung                                                                                                             |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **erreichbar** (OK)                 | Direkter Kommunikationsweg vorhanden ODER stabiler indirekter Kommunikationsweg vorhanden                            |
| **eingeschränkt erreichbar** (OK)   | Kommunikation möglich, aber mit Einschränkungen (z. B. nur über Dritte oder mit Sprachbarriere)              |
| **nicht erreichbar** (TO_DO)        | Kein verlässlicher direkter oder indirekter Kommunikationsweg vorhanden                                              |

> M2 liefert nur Kontext. Die Entscheidung, ob ein verlässlicher Kommunikationsweg vorhanden ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Mindestens ein verlässlicher Kommunikationsweg ist bekannt – direkt oder über eine stellvertretende Person. Eingeschränkte Erreichbarkeit (z. B. nur über Dritte oder mit Sprachbarriere) gilt ebenfalls als OK: Kommunikation ist ausreichend möglich, auch wenn nicht optimal.

### TO_DO
Es ist aktuell kein verlässlicher Kommunikationsweg erkennbar – weder direkt zum Patienten noch indirekt über Dritte.

---

## Dokumentationsausgaben (M5)

| Status  | Satz                                                          |
|---------|---------------------------------------------------------------|
| DONE    | „Kommunikation ist ausreichend möglich"                       |
| OPEN    | „Kommunikation ist aktuell nicht ausreichend möglich"         |
| UNCLEAR | „Kommunikation ist unklar"                                    |

---

## To-dos

| Status  | To-do                                                                                                           |
|---------|-----------------------------------------------------------------------------------------------------------------|
| TO_DO   | Telefonnummer oder erreichbare Kontaktperson klären                                                             |

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Angehörige, Zuweiser)
