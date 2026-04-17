# CP-K03 – Informationsbasis ausreichend

- **checkpoint_id:** `CP-K03`
- **block_id:** `kommunikation`
- **block_title:** Kommunikation & Erreichbarkeit
- **typ:** VERIFIKATION
- **category:** `M` (medizinisch)
- **relevance:** `P` (Pflicht)

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

## Aggregationslogik

| Ergebnis                           | Bedingung                                                                                                          |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| **ausreichend** (DONE)             | Informationen sind vorhanden oder zuverlässig zugänglich – auch ohne aktuelle Unterlagen möglich                   |
| **eingeschränkt ausreichend** (DONE) | Informationen nur teilweise verfügbar oder verzögert zugänglich; Weiterarbeit ist möglich                        |
| **nicht ausreichend** (OPEN)       | Es ist aktuell keine ausreichende Informationsbasis erkennbar, um die weitere Behandlung sinnvoll zu planen        |
| **unklar** (UNCLEAR)               | Angaben fehlen oder sind widersprüchlich                                                                           |

> UNCLEAR kennzeichnet einen sichtbaren Klärbedarf: Informationen fehlen oder sind widersprüchlich, eine sichere Bewertung ist aktuell nicht möglich. Klärung ist sinnvoll und soll im weiteren Verlauf erfolgen. Nach Klärung führt der Status zu einem der drei definierten Ergebnisse: **ausreichend** (DONE), **eingeschränkt ausreichend** (DONE) oder **nicht ausreichend** (OPEN).

> M2 liefert nur Kontext. Die Entscheidung, ob die Informationsbasis ausreicht, erfolgt ausschließlich auf M3-Ebene durch den Arzt.

---

## Status-Definitionen

### DONE
Die Informationsbasis ist vorhanden oder zuverlässig zugänglich. Eingeschränkt ausreichende Informationen (z. B. nur teilweise verfügbar oder mit Verzögerung zugänglich) gelten ebenfalls als DONE: eine sinnvolle Weiterplanung ist möglich, auch wenn nicht alle Informationen sofort vorliegen.

### OPEN
Es ist aktuell keine ausreichende Informationsbasis erkennbar – weder direkt vorliegend noch verlässlich zugänglich.

### UNCLEAR
Angaben zur Informationslage fehlen oder widersprechen sich. Eine sichere Einschätzung ist aktuell nicht möglich. Der Checkpoint macht diesen Klärbedarf sichtbar – die Entscheidung über das weitere Vorgehen liegt beim Arzt. Klärung soll im weiteren Verlauf erfolgen.

---

## To-dos

| Status  | To-do                          |
|---------|--------------------------------|
| OPEN    | Informationsbasis vervollständigen |
| UNCLEAR | Informationslage klären        |

---

## Typische Antwortgeber

- `patient`
- `praxis`
- `extern` (z. B. Zuweiser, Fachärzte)
