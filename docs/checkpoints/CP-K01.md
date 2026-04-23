# CP-K01 – Kommunikation geklärt

> ⚠️ **Hinweis:** Dieses Dokument ist eine Entwurfsdokumentation und weicht an mehreren
> Stellen vom aktuellen Code ab. Maßgeblich sind der `CHECKPOINT_CATALOGUE` in
> `lib/logic/checkpointCatalog.ts` und die kanonischen Regeln in
> `docs/architecture/checkpoints.md`.
>
> Bekannte Abweichungen in diesem Dokument:
> - `typ: STATUS_KLAERUNG` entspricht nicht dem Code-Wert `CheckpointType.PRESENCE_CHECK`
> - In der neuen Taxonomie: `type = DECISION`
> - `relevance: P` bedeutet jetzt „hat Vorbereitungsperspektiven" (nicht „Pflicht")

- **checkpoint_id:** `CP-K01` _(Code-ID: `K01`)_
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

## MFA-Fragen

| ID            | Frage                                                                |
|---------------|----------------------------------------------------------------------|
| MFA-K01-01    | Ist der Patient für uns grundsätzlich erreichbar?                    |
| MFA-K01-02    | Sind die hinterlegten Kontaktdaten aktuell?                          |
| MFA-K01-03    | Ist bei Bedarf eine Kontaktperson/Vertrauensperson erreichbar?       |

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

| Status          | Satz                                                          |
|-----------------|---------------------------------------------------------------|
| OK              | „Kommunikation ist ausreichend möglich"                       |
| TO_DO           | „Kommunikation ist aktuell nicht ausreichend möglich"         |

---

## To-dos

| Status  | To-do                                                                                                           |
|---------|-----------------------------------------------------------------------------------------------------------------|
| TO_DO   | Telefonnummer oder erreichbare Kontaktperson klären                                                             |

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte vervollständigen Sie Ihre Kontaktdaten, damit wir Sie erreichen können."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Angehörige, Zuweiser)
