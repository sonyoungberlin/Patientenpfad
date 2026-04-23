# CP-K04 – Medikation geklärt

> ⚠️ **Hinweis:** Dieses Dokument ist eine Entwurfsdokumentation und weicht an mehreren
> Stellen vom aktuellen Code ab. Maßgeblich sind der `CHECKPOINT_CATALOGUE` in
> `lib/logic/checkpointCatalog.ts` und die kanonischen Regeln in
> `docs/architecture/checkpoints.md`.
>
> Bekannte Abweichungen in diesem Dokument:
> - `block_id: "medikation"` → Code: `"medizinische_lage"`
> - `typ: STATUS_KLAERUNG` → Code: `CheckpointType.VERIFIKATION`, neue Taxonomie: `DECISION`
> - `relevance: P` bedeutet jetzt „hat Vorbereitungsperspektiven" (nicht „Pflicht")

- **checkpoint_id:** `CP-K04` _(Code-ID: `K04`)_
- **block_id:** `medikation` _(Code: `medizinische_lage`)_
- **block_title:** Medikation
- **typ:** STATUS_KLAERUNG _(Code: `VERIFIKATION`, neu: `DECISION`)_
- **category:** `M` (medizinisch)
- **relevance:** `P` (hat Vorbereitungsperspektiven)

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
| **ausreichend** (OK)               | Medikation ist nachvollziehbar und Einnahme erfolgt zuverlässig                             |
| **eingeschränkt ausreichend** (OK) | Kleinere Unsicherheiten oder Unregelmäßigkeiten vorhanden; Weiterarbeit ist möglich       |
| **nicht ausreichend** (TO_DO)      | Kein verlässlicher Überblick über Medikation und Einnahme vorhanden                        |
| **unklar** (ZURÜCKSTELLEN)         | Angaben fehlen oder sind widersprüchlich                                                    |

> ZURÜCKSTELLEN kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **ausreichend** (OK), **eingeschränkt ausreichend** (OK) oder **nicht ausreichend** (TO_DO).

> M2 liefert nur Kontext. Die Entscheidung, ob die Medikation ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene durch den Arzt.

---

## Status-Definitionen

### OK
Die Medikation ist ausreichend nachvollziehbar und wird zuverlässig umgesetzt. Auch bei kleineren Unsicherheiten oder Einschränkungen ist eine Weiterarbeit möglich.

### TO_DO
Die Medikation ist aktuell nicht ausreichend nachvollziehbar oder wird nicht zuverlässig umgesetzt.

### ZURÜCKSTELLEN
Angaben zur Medikation fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                          |
|-----------------|---------------------------------------------------------------|
| OK              | „Medikation ist ausreichend geklärt"                  |
| TO_DO           | „Medikation ist aktuell nicht ausreichend geklärt"    |
| ZURÜCKSTELLEN   | „Medikation ist unklar"                                       |

---

## To-dos

| Status  | To-do                         |
|---------|-------------------------------|
| TO_DO         | Medikamentenstatus klären     |
| ZURÜCKSTELLEN | Angaben zur Medikation klären |

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte bringen Sie eine aktuelle Liste Ihrer Medikamente zum nächsten Termin mit."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Arztbriefe, Apotheke)
