# CP-K08 – Versorgungskanäle geklärt

- **checkpoint_id:** `CP-K08`
- **block_id:** `versorgungskanaele`
- **block_title:** Versorgungskanäle
- **typ:** STATUS_KLAERUNG
- **category:** `O` (organisatorisch)
- **relevance:** `A` (optional)

---

## Entscheidungsfrage

Sind geeignete Versorgungskanäle nutzbar?

---

## M2-Fragen

| ID     | Frage                                                                                              |
|--------|----------------------------------------------------------------------------------------------------|
| M2-01  | Können Sie Videosprechstunden selbst oder mit Unterstützung nutzen?                                |
| M2-02  | Können Sie Nachrichten oder Dokumente digital senden oder empfangen (selbst oder mit Unterstützung)? |
| M2-03  | Möchten Sie Unterstützung bei der Nutzung digitaler Angebote?                                      |

---

## Aggregationslogik

| Ergebnis                             | Bedingung                                                                             |
|--------------------------------------|---------------------------------------------------------------------------------------|
| **ausreichend** (OK)                 | Mindestens ein verlässlicher Versorgungskanal ist nutzbar (z. B. Video oder digitale Kommunikation) |
| **eingeschränkt ausreichend** (OK)   | Nutzung ist möglich, aber nur eingeschränkt oder nicht für alle Kanäle                |
| **nicht ausreichend** (TO_DO)        | Keine Versorgungskanäle sind nutzbar                                                  |

> M2 liefert nur Kontext. Die Entscheidung, ob geeignete Versorgungskanäle nutzbar sind, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### OK
Mindestens ein geeigneter Versorgungskanal ist verlässlich nutzbar – unabhängig davon, ob dies selbstständig oder mit Unterstützung erfolgt.

### TO_DO
Es ist aktuell kein geeigneter Versorgungskanal nutzbar.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                          |
|-----------------|---------------------------------------------------------------|
| OK              | „Versorgungskanäle sind ausreichend nutzbar"                  |
| TO_DO           | „Versorgungskanäle sind aktuell nicht ausreichend nutzbar"    |

---

## To-dos

| Status  | To-do                                |
|---------|--------------------------------------|
| TO_DO   | Versorgungskanäle klären             |

---

## M4-Output

```json
{
  "m4": {
    "type": "NOTICE",
    "text": "Bitte beachten Sie, dass einige Leistungen nur über digitale Kommunikationswege möglich sind."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
