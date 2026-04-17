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
| **ausreichend** (OK)                 | Termine können grundsätzlich ohne relevante Einschränkungen wahrgenommen werden   |
| **eingeschränkt ausreichend** (OK)   | Termine sind grundsätzlich möglich, aber mit Einschränkungen oder Schwierigkeiten |
| **nicht ausreichend** (TO_DO)        | Termine können grundsätzlich nicht wahrgenommen werden                           |

> M2 liefert nur Kontext. Die Entscheidung, ob der Zugang zur Versorgung ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Der Zugang zur Versorgung ist grundsätzlich möglich. Auch bei bestehenden, nicht relevanten Einschränkungen ist eine Versorgung möglich.

### TO_DO
Der Zugang zur Versorgung ist aktuell nicht ausreichend möglich.

---

## Dokumentationsausgaben (M5)

| Status  | Satz                                                                  |
|---------|-----------------------------------------------------------------------|
| DONE    | „Zugang zur Versorgung ist möglich"                                   |
| OPEN    | „Zugang zur Versorgung ist aktuell nicht ausreichend möglich"         |
| UNCLEAR | „Zugang zur Versorgung ist unklar"                                    |

---

## To-dos

| Status  | To-do                             |
|---------|-----------------------------------|
| TO_DO   | Zugang zur Versorgung klären      |

---

## Typische Antwortgeber

- `patient`
- `praxis`
