# CP-K07 – Vorübergehender Unterstützungsbedarf

- **checkpoint_id:** `CP-K07`
- **block_id:** `versorgung_im_alltag`
- **block_title:** Versorgung im Alltag
- **typ:** BEDARF
- **category:** `M` (medizinisch/versorgungsbezogen)
- **relevance:** `A` (optional)

---

## Beschreibung

Es besteht ein vorübergehender Unterstützungsbedarf (z. B. nach Operation oder akuter Erkrankung), und die notwendige Unterstützung ist organisiert.

---

## Entscheidungsfrage

Besteht ein vorübergehender Unterstützungsbedarf, und ist die notwendige Unterstützung für diese Phase organisiert?

---

## M2-Fragen

| ID     | Frage                                                                                              |
|--------|----------------------------------------------------------------------------------------------------|
| M2-01  | Hatten Sie in letzter Zeit einen Krankenhausaufenthalt, eine Operation oder einen Unfall?          |
| M2-02  | Benötigen Sie vorübergehend Hilfe im Alltag (z. B. nach einem Eingriff oder einer Erkrankung)?     |
| M2-03  | Haben Sie für diese Zeit Unterstützung organisiert (z. B. durch Angehörige oder andere Personen)?  |

---

## MFA-Fragen

| ID            | Frage                                                            |
|---------------|------------------------------------------------------------------|
| MFA-K07-01    | Ist ein vorübergehender Unterstützungsbedarf bekannt?            |
| MFA-K07-02    | Ist die notwendige Unterstützung für diese Phase organisiert?    |
| MFA-K07-03    | Ist nachvollziehbar, wer die Unterstützung übernimmt?            |

---

## Aggregationslogik

| Ergebnis                       | Bedingung                                                                                       |
|--------------------------------|-------------------------------------------------------------------------------------------------|
| **ausreichend** (OK)           | Kein vorübergehender Bedarf vorhanden, oder Bedarf besteht und die Unterstützung ist organisiert |
| **nicht ausreichend** (TO_DO)  | Vorübergehender Bedarf besteht, aber die Unterstützung ist nicht oder nur unklar organisiert     |
| **unklar** (ZURÜCKSTELLEN)     | Es ist nicht erkennbar, ob ein vorübergehender Bedarf besteht oder wie er gedeckt wird           |

> M2 liefert nur Kontext. Die Entscheidung, ob der vorübergehende Unterstützungsbedarf ausreichend gedeckt ist, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Es besteht entweder kein vorübergehender Unterstützungsbedarf, oder ein bestehender Bedarf ist organisatorisch abgedeckt.

### TO_DO
Ein vorübergehender Unterstützungsbedarf besteht, ist aber nicht ausreichend organisiert.

### ZURÜCKSTELLEN
Es ist aktuell nicht beurteilbar, ob ein vorübergehender Unterstützungsbedarf besteht oder wie er gedeckt wird.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                                              |
|-----------------|-----------------------------------------------------------------------------------|
| OK              | „Vorübergehender Unterstützungsbedarf ist ausreichend geklärt."                   |
| TO_DO           | „Vorübergehender Unterstützungsbedarf ist aktuell nicht ausreichend geklärt."     |
| ZURÜCKSTELLEN   | „Vorübergehender Unterstützungsbedarf ist unklar."                                |

---

## To-dos

| Status  | To-do                                                |
|---------|------------------------------------------------------|
| TO_DO   | Organisation der vorübergehenden Unterstützung klären |

---

## M4-Output

```json
{
  "m4": {
    "type": "NOTICE",
    "text": "Bitte teilen Sie uns mit, ob Ihre Versorgung für die nächste Zeit sichergestellt ist."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Angehörige, Pflege)
