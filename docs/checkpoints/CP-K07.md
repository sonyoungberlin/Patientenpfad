# CP-K07 – Versorgungsumfeld geklärt

- **checkpoint_id:** `CP-K07`
- **block_id:** `versorgungsumfeld`
- **block_title:** Versorgungsumfeld
- **typ:** STATUS_KLAERUNG
- **category:** `O` (organisatorisch)
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
| **ausreichend** (OK)                 | Versorgungssituation ist nachvollziehbar; vorhandener Unterstützungsbedarf ist abgedeckt oder nicht vorhanden |
| **eingeschränkt ausreichend** (OK)   | Teilweise Unterstützung vorhanden oder kleinere Lücken                                           |
| **nicht ausreichend** (TO_DO)        | Unterstützungsbedarf besteht oder wird vermutet, aber keine oder unzureichende Unterstützung vorhanden |

> M2 liefert nur Kontext. Die Entscheidung, ob die Versorgungssituation ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Die Versorgungssituation ist ausreichend nachvollziehbar. Unterstützungsbedarf ist entweder nicht vorhanden oder ausreichend abgedeckt.

### TO_DO
Die Versorgungssituation ist aktuell nicht ausreichend nachvollziehbar oder bestehender Unterstützungsbedarf ist nicht abgedeckt.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                              |
|-----------------|-------------------------------------------------------------------|
| OK              | „Versorgungsumfeld ist ausreichend geklärt"               |
| TO_DO           | „Versorgungsumfeld ist aktuell nicht ausreichend geklärt" |

---

## To-dos

| Status  | To-do                         |
|---------|-------------------------------|
| TO_DO   | Versorgungssituation klären   |

---

## M4-Output

```json
{
  "m4": {
    "type": "NOTICE",
    "text": "Für Ihre Behandlung ist es erforderlich, dass Ihre Versorgung im Alltag sichergestellt ist."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Pflege)
