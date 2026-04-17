# CP-K08 – Versorgungskanäle geklärt

- **checkpoint_id:** `CP-K08`
- **block_id:** `versorgungskanaele`
- **block_title:** Versorgungskanäle
- **typ:** STATUS_KLAERUNG
- **category:** `A` (administrativ)
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
| **ausreichend** (DONE)               | Mindestens ein verlässlicher Versorgungskanal ist nutzbar (z. B. Video oder digitale Kommunikation) |
| **eingeschränkt ausreichend** (DONE) | Nutzung ist möglich, aber nur eingeschränkt oder nicht für alle Kanäle                |
| **nicht ausreichend** (OPEN)         | Keine Versorgungskanäle sind nutzbar                                                  |
| **unklar** (UNCLEAR)                 | Angaben fehlen oder sind widersprüchlich                                              |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu ausreichend (DONE), eingeschränkt ausreichend (DONE) oder nicht ausreichend (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob geeignete Versorgungskanäle nutzbar sind, erfolgt ausschließlich auf M3-Ebene.

---

## Status-Definitionen

### DONE
Mindestens ein geeigneter Versorgungskanal ist verlässlich nutzbar – unabhängig davon, ob dies selbstständig oder mit Unterstützung erfolgt.

### OPEN
Es ist aktuell kein geeigneter Versorgungskanal nutzbar.

### UNCLEAR
Angaben zu den Versorgungskanälen fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich.

---

## Dokumentationsausgaben (M5)

| Status  | Satz                                                          |
|---------|---------------------------------------------------------------|
| DONE    | „Versorgungskanäle sind ausreichend geklärt"                  |
| OPEN    | „Versorgungskanäle sind aktuell nicht ausreichend geklärt"    |
| UNCLEAR | „Versorgungskanäle sind unklar"                               |

---

## To-dos

| Status  | To-do                                |
|---------|--------------------------------------|
| OPEN    | Versorgungskanäle klären             |
| UNCLEAR | Angaben zu Versorgungskanälen klären |

---

## Typische Antwortgeber

- `patient`
- `praxis`
