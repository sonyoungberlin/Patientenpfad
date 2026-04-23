# CP-K02 – Praktische Möglichkeit der Terminwahrnehmung

> ⚠️ **Hinweis:** Dieses Dokument ist eine Entwurfsdokumentation und weicht an mehreren
> Stellen vom aktuellen Code ab. Maßgeblich sind der `CHECKPOINT_CATALOGUE` in
> `lib/logic/checkpointCatalog.ts` und die kanonischen Regeln in
> `docs/architecture/checkpoints.md`.
>
> Bekannte Abweichungen in diesem Dokument:
> - `block_id: "zugang_versorgung"` → Code: `"versorgung_im_alltag"`
> - `category: O` → Code: `CheckpointCategory.M`
> - `typ: STATUS_KLAERUNG` → Code: `CheckpointType.BEDARF`, neue Taxonomie: `DECISION`
> - `relevance: P` bedeutet jetzt „hat Vorbereitungsperspektiven" (nicht „pflichtrelevant")

- **checkpoint_id:** `CP-K02` _(Code-ID: `K02`)_
- **block_id:** `zugang_versorgung` _(Code: `versorgung_im_alltag`)_
- **block_title:** Zugang zur Versorgung
- **typ:** STATUS_KLAERUNG _(Code: `BEDARF`, neu: `DECISION`)_
- **category:** `O` (organisatorisch) _(Code: `M`)_
- **relevance:** `P` (hat Vorbereitungsperspektiven)

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

## MFA-Fragen

| ID            | Frage                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------|
| MFA-K02-01    | Ist es dem Patienten praktisch möglich, persönliche Termine wahrzunehmen?                                   |
| MFA-K02-02    | Gibt es erkennbare Einschränkungen bei der Terminwahrnehmung (z. B. Mobilität, Entfernung, Organisation)?   |

> **Abgrenzung zu K09:** K02 beschreibt die *praktische Möglichkeit* (Fähigkeit/Voraussetzungen) zur Terminwahrnehmung. K09 beschreibt das *tatsächliche Verhalten* (Termin- und Absprachetreue, Einhaltung von Praxisabläufen).

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

| Status          | Satz                                                                  |
|-----------------|-----------------------------------------------------------------------|
| OK              | „Zugang zur Versorgung ist möglich"                                   |
| TO_DO           | „Zugang zur Versorgung ist aktuell nicht ausreichend möglich"         |

---

## To-dos

| Status  | To-do                             |
|---------|-----------------------------------|
| TO_DO   | Zugang zur Versorgung klären      |

---

## M4-Output

```json
{
  "m4": {
    "type": "NOTICE",
    "text": "Für eine verlässliche Betreuung ist es notwendig, dass Termine in unserer Praxis wahrgenommen werden können."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
