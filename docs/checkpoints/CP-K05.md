# CP-K05 – Diagnosenlage geklärt

> ⚠️ **Hinweis:** Dieses Dokument ist eine Entwurfsdokumentation und weicht an mehreren
> Stellen vom aktuellen Code ab. Maßgeblich sind der `CHECKPOINT_CATALOGUE` in
> `lib/logic/checkpointCatalog.ts` und die kanonischen Regeln in
> `docs/architecture/checkpoints.md`.
>
> Bekannte Abweichungen in diesem Dokument:
> - `block_id: "diagnosenlage"` → im Code gibt es keinen Block `"diagnosenlage"`;
>   K05 (Medizinische Mitbehandlung) liegt in `"medizinische_lage"`.
> - Dieser Entwurf beschreibt einen Checkpoint „Diagnosenlage"; im Code entspricht K03
>   dem Inhalt (Diagnosenlage, block `medizinische_lage`), nicht K05.
> - `typ: STATUS_KLAERUNG` → Code K05: `CheckpointType.PROZESS_VORLAUF`, neue Taxonomie: `DECISION`
> - `relevance: P` → Code K05: `relevance = A` (keine Pflicht-Perspektiven)
> - `relevance: P` bedeutet in der neuen Semantik „hat Vorbereitungsperspektiven"

- **checkpoint_id:** `CP-K05` _(Code-ID: `K05`, Titel im Code: „Medizinische Mitbehandlung")_
- **block_id:** `diagnosenlage` _(Code: `medizinische_lage`)_
- **block_title:** Diagnosenlage
- **typ:** STATUS_KLAERUNG _(Code: `PROZESS_VORLAUF`, neu: `DECISION`)_
- **category:** `M` (medizinisch)
- **relevance:** `P` (Pflicht) _(Code: `A`)_

---

## Entscheidungsfrage

Ist die Erkrankungssituation ausreichend nachvollziehbar?

---

## M2-Fragen

| ID     | Frage                                                                                                          |
|--------|----------------------------------------------------------------------------------------------------------------|
| M2-01  | Sind Sie aktuell wegen einer Erkrankung in ärztlicher Behandlung?                                             |
| M2-02  | Waren Sie in letzter Zeit wegen einer Erkrankung beim Arzt oder im Krankenhaus?                               |
| M2-03  | Gibt es Erkrankungen, wegen denen Sie regelmäßig Medikamente einnehmen?                                       |
| M2-04  | Gibt es etwas an Ihrer gesundheitlichen Situation, das unklar ist oder sich noch in Abklärung befindet?       |

---

## MFA-Fragen

| ID            | Frage                                                                                  |
|---------------|----------------------------------------------------------------------------------------|
| MFA-K05-01    | Ist bekannt, bei welchen Fachärzten der Patient aktuell in Behandlung ist?             |
| MFA-K05-02    | Ist die fachärztliche Mitbehandlung strukturiert und nachvollziehbar?                  |

---

## Aggregationslogik

| Ergebnis                           | Bedingung                                                                                   |
|------------------------------------|---------------------------------------------------------------------------------------------|
| **ausreichend** (OK)               | Krankheits- bzw. Diagnosenkontext ist nachvollziehbar                                       |
| **eingeschränkt ausreichend** (OK) | Teilweise nachvollziehbar, kleinere Lücken vorhanden; Weiterarbeit ist möglich            |
| **nicht ausreichend** (TO_DO)      | Die Erkrankungssituation ist aktuell nicht ausreichend nachvollziehbar.             |
| **unklar** (ZURÜCKSTELLEN)         | Angaben fehlen oder sind widersprüchlich                                                    |

> ZURÜCKSTELLEN kennzeichnet einen sichtbaren Klärbedarf: Angaben fehlen oder widersprechen sich. Eine sichere Bewertung ist aktuell nicht möglich. Klärung soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **ausreichend** (OK), **eingeschränkt ausreichend** (OK) oder **nicht ausreichend** (TO_DO).

> M2 liefert nur Kontext. Die Entscheidung, ob die Diagnosenlage ausreichend geklärt ist, erfolgt ausschließlich auf M3-Ebene durch den Arzt.

---

## Status-Definitionen

### OK
Die Diagnosenlage ist ausreichend nachvollziehbar, um den Fall medizinisch einzuordnen. Auch bei kleineren Lücken ist eine Weiterarbeit möglich.

### TO_DO
Die Diagnosenlage ist aktuell nicht ausreichend nachvollziehbar.

### ZURÜCKSTELLEN
Angaben zur Diagnosenlage fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                                              |
|-----------------|-------------------------------------------------------------------|
| OK              | „Diagnosenlage ist ausreichend geklärt"                   |
| TO_DO           | „Diagnosenlage ist aktuell nicht ausreichend geklärt"     |
| ZURÜCKSTELLEN   | „Diagnosenlage ist unklar"                                        |

---

## To-dos

| Status  | To-do                            |
|---------|----------------------------------|
| TO_DO         | Diagnosenlage klären             |
| ZURÜCKSTELLEN | Angaben zur Diagnosenlage klären |

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte informieren Sie uns über Ihre aktuellen Fachärzte und halten Sie diese Angaben aktuell."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Arztbriefe, Vorbefunde)
