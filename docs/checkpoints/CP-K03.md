# CP-K03 – Informationsbasis ausreichend

> ⚠️ **Hinweis:** Dieses Dokument ist eine Entwurfsdokumentation und weicht an mehreren
> Stellen vom aktuellen Code ab. Maßgeblich sind der `CHECKPOINT_CATALOGUE` in
> `lib/logic/checkpointCatalog.ts` und die kanonischen Regeln in
> `docs/architecture/checkpoints.md`.
>
> Bekannte Abweichungen in diesem Dokument:
> - `block_id: "dokumentenlage"` → Code: `"medizinische_lage"`
> - `typ: STATUS_KLAERUNG` → Code: `CheckpointType.NACHWEIS`, neue Taxonomie: `DECISION`
> - `relevance: P` bedeutet jetzt „hat Vorbereitungsperspektiven" (nicht „Pflicht")
> - Dieser Entwurf beschreibt den Checkpoint unter dem Titel „Informationsbasis ausreichend";
>   im Code lautet der Titel „Diagnosenlage" (K03).

- **checkpoint_id:** `CP-K03` _(Code-ID: `K03`)_
- **block_id:** `dokumentenlage` _(Code: `medizinische_lage`)_
- **block_title:** Dokumentenlage / Informationsbasis
- **typ:** STATUS_KLAERUNG _(Code: `NACHWEIS`, neu: `DECISION`)_
- **category:** `M` (medizinisch)
- **relevance:** `P` (hat Vorbereitungsperspektiven)

---

## Entscheidungsfrage

Reicht die vorhandene oder zugängliche Informationsbasis aus, um die weitere Behandlung sinnvoll zu planen?

---

## M2-Fragen

| ID     | Frage                                                                                   |
|--------|-----------------------------------------------------------------------------------------|
| M2-01  | Haben Sie medizinische Unterlagen zu Ihren bisherigen Behandlungen?                     |
| M2-02  | Waren Sie in letzter Zeit im Krankenhaus oder bei Fachärzten?                           |
| M2-03  | Sind Sie aktuell regelmäßig in fachärztlicher Behandlung?                               |
| M2-04  | Wissen Sie, wo Sie Ihre medizinischen Unterlagen finden oder bekommen können?           |

---

## MFA-Fragen

| ID            | Frage                                                                       |
|---------------|-----------------------------------------------------------------------------|
| MFA-K03-01    | Liegen aktuelle Befunde/Unterlagen vor?                                     |
| MFA-K03-02    | Sind die Diagnosen im Krankenblatt nachvollziehbar dokumentiert?            |

---

## Aggregationslogik

| Ergebnis                           | Bedingung                                                                                                          |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| **ausreichend** (OK)               | Informationen sind vorhanden oder zuverlässig zugänglich – auch ohne aktuelle Unterlagen möglich                   |
| **eingeschränkt ausreichend** (OK) | Informationen nur teilweise verfügbar oder verzögert zugänglich; Weiterarbeit ist möglich                        |
| **nicht ausreichend** (TO_DO)      | Die Informationsbasis ist aktuell nicht ausreichend.                                                               |
| **unklar** (ZURÜCKSTELLEN)         | Angaben fehlen oder sind widersprüchlich                                                                           |

> ZURÜCKSTELLEN kennzeichnet einen sichtbaren Klärbedarf: Informationen fehlen oder sind widersprüchlich, eine sichere Bewertung ist aktuell nicht möglich. Klärung ist sinnvoll und soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **ausreichend** (OK), **eingeschränkt ausreichend** (OK) oder **nicht ausreichend** (TO_DO).

> M2 liefert nur Kontext. Die Entscheidung, ob die Informationsbasis ausreicht, erfolgt ausschließlich auf M3-Ebene durch den Arzt.

---

## Status-Definitionen

### OK
Die Informationsbasis ist vorhanden oder zuverlässig zugänglich. Eingeschränkt ausreichende Informationen (z. B. nur teilweise verfügbar oder mit Verzögerung zugänglich) gelten ebenfalls als OK: eine sinnvolle Weiterplanung ist möglich, auch wenn nicht alle Informationen sofort vorliegen.

### TO_DO
Die Informationsbasis ist aktuell nicht ausreichend.

### ZURÜCKSTELLEN
Angaben zur Informationslage fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## Dokumentationsausgaben (M5)

| Status          | Satz                                              |
|-----------------|---------------------------------------------------|
| OK              | „Informationsbasis ist ausreichend geklärt"               |
| TO_DO           | „Informationsbasis ist aktuell nicht ausreichend geklärt" |
| ZURÜCKSTELLEN   | „Informationsbasis ist unklar"                    |

---

## To-dos

| Status  | To-do                          |
|---------|--------------------------------|
| TO_DO         | Informationsbasis vervollständigen |
| ZURÜCKSTELLEN | Informationslage klären        |

---

## M4-Output

```json
{
  "m4": {
    "type": "ACTION",
    "text": "Bitte bringen Sie die für Ihre Behandlung relevanten Befunde zum nächsten Termin mit."
  }
}
```

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Zuweiser, Fachärzte)
