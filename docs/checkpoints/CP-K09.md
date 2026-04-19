# CP-K09 – Mitwirkung

- **checkpoint_id:** `CP-K09`
- **block_id:** `kommunikation`
- **block_title:** Kommunikation & Erreichbarkeit
- **typ:** VERIFIKATION
- **category:** `O` (organisatorisch)
- **relevance:** `A` (additiv – nur M3)

---

## Entscheidungsfrage

Ist die Mitwirkung des Patienten ausreichend gegeben?

---

## M2-Fragen

Keine. Dieser Checkpoint ist ausschließlich auf M3-Ebene relevant.

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
