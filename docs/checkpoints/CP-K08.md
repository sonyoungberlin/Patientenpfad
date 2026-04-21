# CP-K08 – Nutzung digitaler Praxisleistungen

- **checkpoint_id:** `CP-K08`
- **block_id:** `versorgungskanaele`
- **block_title:** Nutzung digitaler Praxisleistungen
- **typ:** STATUS_KLAERUNG
- **category:** `O` (organisatorisch)
- **relevance:** `A` (optional)

---

## Entscheidungsfrage

Werden digitale Praxisangebote vom Patienten aktiv genutzt?

---

## M2-Fragen

| ID     | Frage                                                                                              |
|--------|----------------------------------------------------------------------------------------------------|
| M2-01  | Können Sie Videosprechstunden selbst oder mit Unterstützung nutzen?                                |
| M2-02  | Können Sie Nachrichten oder Dokumente digital senden oder empfangen (selbst oder mit Unterstützung)? |
| M2-03  | Möchten Sie Unterstützung bei der Nutzung digitaler Angebote?                                      |

---

## MFA-Fragen

| ID            | Frage                                                  |
|---------------|--------------------------------------------------------|
| MFA-K08-01    | Nutzt der Patient digitale Praxisangebote aktiv?       |

---

## Aggregationslogik

| Ergebnis                             | Bedingung                                                                             |
|--------------------------------------|---------------------------------------------------------------------------------------|
| **ausreichend** (OK)                 | Digitale Praxisangebote werden aktiv und verlässlich genutzt                          |
| **eingeschränkt ausreichend** (OK)   | Nutzung ist möglich, aber nur eingeschränkt oder nicht für alle Angebote              |
| **nicht ausreichend** (TO_DO)        | Digitale Praxisangebote werden nicht genutzt                                          |

> M2 liefert nur Kontext. Die Entscheidung, ob digitale Praxisleistungen ausreichend genutzt werden, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Digitale Praxisangebote werden vom Patienten aktiv genutzt – unabhängig davon, ob dies selbstständig oder mit Unterstützung erfolgt.

### TO_DO
Digitale Praxisangebote werden aktuell nicht ausreichend genutzt.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                                |
|-----------------|---------------------------------------------------------------------|
| OK              | „Nutzung digitaler Praxisleistungen ist ausreichend gegeben."       |
| TO_DO           | „Nutzung digitaler Praxisleistungen ist nicht ausreichend gegeben." |

---

## To-dos

| Status  | To-do                                            |
|---------|--------------------------------------------------|
| TO_DO   | Nutzung digitaler Praxisleistungen klären        |

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte beachten Sie, dass einige Leistungen nur über digitale Praxisangebote angeboten werden können."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
