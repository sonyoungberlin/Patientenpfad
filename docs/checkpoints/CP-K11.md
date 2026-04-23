# CP-K11 – Formularanliegen

> ℹ️ **Hinweis:** Die Felder in diesem Dokument stimmen weitgehend mit dem Code überein.
> Abweichungen betreffen nur Terminologie:
> - `typ: BEDARF` entspricht `CheckpointType.BEDARF`; neue Taxonomie: `MULTI_SELECT`.
> - `relevance: A` bedeutet jetzt „nur M3, keine Vorbereitung" (früher: „additiv").
>   ✓ Übereinstimmung mit Code K11 (`relevance = A`).
>
> Maßgebliche Gesamtdokumentation: `docs/architecture/checkpoints.md`.

- **checkpoint_id:** `CP-K11` _(Code-ID: `K11`)_
- **block_id:** `medizinische_lage`
- **typ:** BEDARF _(Code: `CheckpointType.BEDARF`, neu: `MULTI_SELECT`)_
- **mode:** `MULTI_SELECT`
- **category:** `O` (organisatorisch)
- **relevance:** `A` (nur M3, keine Vorbereitung)
- **sichtbar:** **nur Arztseite**

---

## Zweck

Dokumentation des **administrativen Anlasses**, aus dem die strukturierte Prüfung / Durchsicht erfolgt ist.

Beispiele: Pflegegradantrag, Reha-Antrag, Jobcenter, Attest, Versicherungs­gutachten.

> Reine ärztliche Dokumentation. Der Checkpoint hat **keinen Einfluss auf Status, Locking oder Waiting**.

---

## Verhalten

- **kein M2** – keine Patientenfragen
- **kein M4** – kein Patientenhinweis
- **kein Status** (kein OK / TO_DO / ZURÜCKSTELLEN), keine Bewertung
- **nur M5** – die getroffene Auswahl wird in der ärztlichen Dokumentation sichtbar
- gleicher technischer Mechanismus wie K10 („Besonderer Versorgungsaufwand"):
  - Eintrag in `MULTI_SELECT_CATALOGUE` (`lib/logic/checkpointCatalog.ts`)
  - in `ALWAYS_PRESENT_MULTI_SELECT_IDS` enthalten → wird unabhängig von der M1-Blockauswahl auf Arztseite gerendert
  - Hydration mit `enabled: false` und leeren `selections`
  - Update über `PATCH /api/cases/[id]/checkpoint/update` mit `enabled` + `selections`
  - Rendering im M3-Client als `data-checkpoint-multi="K11"` mit Toggle + Checkboxen

---

## Optionen

| Option                                |
|---------------------------------------|
| Pflegegrad / Höherstufung             |
| Reha-Antrag                           |
| Jobcenter / Sozialleistungen          |
| Attest / Bescheinigung                |
| Versicherung / Gutachten              |
| Sonstiger Antrag / Formular           |

> Keine Freitexteingabe.

---

## Dokumentationsausgabe (M5)

Wird in `deriveM5Output` / `deriveM5OutputCondensed` über die generische
MULTI_SELECT-Logik erzeugt (gleiche Logik wie K10):

- **deaktiviert oder ohne Auswahl:** kein Text (leerer M5-Eintrag)
- **aktiviert mit Auswahl:** `Formularanliegen: <Auswahl 1>, <Auswahl 2>, …`

Beispiele:

| Zustand                                                           | M5-Text                                              |
|-------------------------------------------------------------------|------------------------------------------------------|
| `enabled=false`                                                   | *(leer)*                                             |
| `enabled=true`, `selections=[]`                                   | *(leer)*                                             |
| `enabled=true`, `selections=["Reha-Antrag"]`                      | `Formularanliegen: Reha-Antrag`                       |
| `enabled=true`, `selections=["Pflegegrad / Höherstufung", "Attest / Bescheinigung"]` | `Formularanliegen: Pflegegrad / Höherstufung, Attest / Bescheinigung` |

K11 nimmt – wie K10 – nicht an der Block-Kondensierung teil und wird immer
als eigene Zeile geführt.

---

## Abgrenzung

- **K10 (Besonderer Versorgungsaufwand):** dokumentiert organisatorische
  Versorgungs­schwerpunkte (z. B. Multimedikation, postoperative Nachsorge).
- **K11 (Formularanliegen):** dokumentiert den **administrativen Anlass**
  der strukturierten Prüfung. Kein Versorgungsstatus, kein Patientenbezug.
