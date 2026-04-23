# CP-K09 – Mitwirkung

> ℹ️ **Hinweis:** Die Felder `block_id`, `category` und `typ` stimmen mit dem Code überein.
> Eine Abweichung betrifft nur die `relevance`-Semantik:
> - `relevance: A` bedeutet in der neuen Semantik „nur M3, keine Vorbereitung"
>   (früher: „additiv – nur M3"). ✓ Übereinstimmung mit Code K09.
> - `typ: VERIFIKATION` entspricht `CheckpointType.VERIFIKATION`; neue Taxonomie: `DECISION`.
>
> Maßgebliche Gesamtdokumentation: `docs/architecture/checkpoints.md`.

- **checkpoint_id:** `CP-K09` _(Code-ID: `K09`)_
- **block_id:** `kommunikation`
- **block_title:** Kommunikation & Erreichbarkeit
- **typ:** VERIFIKATION _(Code: `CheckpointType.VERIFIKATION`, neu: `DECISION`)_
- **category:** `O` (organisatorisch)
- **relevance:** `A` (nur M3, keine Vorbereitung)

---

## Entscheidungsfrage

Ist die Mitwirkung des Patienten ausreichend gegeben?

---

## M2-Fragen (Patientenfragebogen)

**Patientenfragebogen ist hier bewusst leer.**

K09 ist ein reiner Beobachtungs-Checkpoint und wird ausschließlich durch MFA/Praxis bewertet. K09 bleibt technisch im bestehenden Flow (kein Architekturwechsel) – der Checkpoint wird auf M2-Ebene auf Patientenseite nicht abgefragt.

---

## MFA-Fragen

| ID            | Frage                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------|
| MFA-K09-01    | Hält der Patient Termine und Absprachen zuverlässig ein?                                                    |
| MFA-K09-02    | Hält sich der Patient an Praxisabläufe (z. B. Terminvereinbarung statt spontanes Erscheinen)?               |

---

## Status-Definitionen

### OK
Die Mitwirkung des Patienten ist ausreichend gegeben. Termine werden wahrgenommen, Absprachen eingehalten.

### TO_DO
Die Mitwirkung des Patienten ist nicht ausreichend gegeben. Es bestehen Defizite bei Termintreue oder Einhaltung von Absprachen.

---

## Dokumentationsausgaben (M5)

| Status   | Satz                                           |
|----------|------------------------------------------------|
| OK       | „Mitwirkung ist ausreichend gegeben."          |
| TO_DO    | „Mitwirkung ist nicht ausreichend gegeben."    |

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte vereinbaren Sie Termine, damit wir uns ausreichend Zeit für Sie nehmen können. Falls Sie verhindert sind, sagen Sie Termine bitte rechtzeitig ab und beachten Sie getroffene Absprachen. Nur so können wir eine gute Versorgung gewährleisten."
  }
}
```

---

## Typische Antwortgeber

- `praxis`
