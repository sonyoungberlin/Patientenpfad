# Checkpoint-Architektur – Kanonische Regeln

> **Dieses Dokument ist die einzige maßgebliche Quelle für fachliche Checkpoint-Regeln.**
> Alle anderen Dokumente im Repository, die Checkpoint-Semantik beschreiben, sind diesem
> Dokument nachgeordnet. Widersprüche zu anderen Dateien sind als Inkonsistenz zu werten
> und im Rahmen von Refactoring-Tickets zu beheben.

---

## 1. Achsen eines Checkpoints

Jeder Checkpoint wird über vier unabhängige Achsen beschrieben. Die Achsen sind
vollständig orthogonal: keine Kombination ist per Definition ausgeschlossen, außer
wo unten explizit anders angegeben.

---

### 1.1 `type` – Art des Checkpoints

Beschreibt, welche fachliche Rolle der Checkpoint im Workflow spielt.

| Wert | Bedeutung |
|---|---|
| `DECISION` | Standard-Checkpoint zur Vorbereitung einer ärztlichen Entscheidung. Kann Vorbereitung haben, hat M3-Status, kann M4 erzeugen, erzeugt M5. |
| `MULTI_SELECT` | Checkpoint für strukturierte Zusatzangaben (Mehrfachauswahl) in M3. Keine Vorbereitung, kein Status, kein M4, erzeugt M5 als Auswahlliste. |
| `ASSESSMENT` | Checkpoint zur strukturierten Lageeinschätzung / Einordnung. Kann Vorbereitung haben, hat M3-Status, kann bewusst kein M4 haben, erzeugt M5. |

**Hinweis zum Ist-Stand (2026-04):** Das `CheckpointType`-Enum in `lib/types.ts` verwendet
noch die älteren Bezeichnungen `PRESENCE_CHECK`, `NACHWEIS`, `VERIFIKATION`,
`PROZESS_VORLAUF`, `BEDARF` und `ZIEL`. Diese Bezeichnungen entsprechen nicht der hier
definierten Taxonomie. Eine Umbenennung ist als eigenes Refactoring-Ticket geplant.

Vorläufige Zuordnung der Ist-Werte zur neuen Taxonomie:

| Alter Enum-Wert | Neuer Typ | Checkpoints |
|---|---|---|
| `PRESENCE_CHECK` | `DECISION` | K01 |
| `NACHWEIS` | `DECISION` | K03 |
| `VERIFIKATION` | `DECISION` | K04, K08, K09 |
| `PROZESS_VORLAUF` | `DECISION` | K05 |
| `BEDARF` (Standard) | `DECISION` | K02, K06, K07 |
| `BEDARF` (MULTI_SELECT) | `MULTI_SELECT` | K10, K11 |
| `BEDARF` (Einschätzung) | `ASSESSMENT` | K12 |
| `ZIEL` | – | _nicht verwendet_ |

---

### 1.2 `category` – Entscheidungslogik in M3

Beschreibt, welche Statusoptionen dem Arzt in M3 zur Verfügung stehen.

| Wert | Bedeutung | Erlaubte Status in M3 |
|---|---|---|
| `O` | Organisatorisch: Arzt muss sich entscheiden, kein Aufschub möglich | `OK` \| `TO_DO` |
| `M` | Medizinisch: Aufschub via ZURÜCKSTELLEN ist erlaubt | `OK` \| `TO_DO` \| `ZURÜCKSTELLEN` |

`ZURÜCKSTELLEN` führt in M5 zu einem „unklar"-Satz.

---

### 1.3 `relevance` – Vorbereitungsperspektive

Beschreibt, ob ein Checkpoint Vorbereitungsperspektiven (M2) hat oder ausschließlich
in M3 vorkommt.

| Wert | Bedeutung |
|---|---|
| `P` | Der Checkpoint hat Vorbereitungsperspektive(n) und erscheint in M2. |
| `A` | Der Checkpoint hat keine Vorbereitung und erscheint nur in M3. |

**Hinweis zum Ist-Stand:** In älteren Dokumenten (insbesondere `docs/checkpoint-classification.md`
in der ursprünglichen Fassung und einigen `docs/checkpoints/CP-K*.md`-Dateien) wurden P/A
mit „Pflicht / additiv" erklärt. Diese Bedeutung ist nicht mehr gültig. Maßgeblich ist
die obige Definition.

---

### 1.4 `m4_behavior` – M4-Erzeugungsverhalten

Beschreibt explizit, ob und in welcher Form ein Checkpoint M4-Output erzeugen darf.

| Wert | Bedeutung |
|---|---|
| `ACTION` | M4 erzeugt eine konkrete Handlungsaufforderung. |
| `NOTICE` | M4 erzeugt einen Hinweis, aber keine eigentliche Handlungsanweisung. |
| `NONE` | Der Checkpoint erzeugt kein M4. |

**Hinweis zum Ist-Stand:** Das Feld `m4_behavior` existiert im Code noch nicht als eigenständiges
Feld. Stattdessen wird das Verhalten aktuell durch das Feld `m4.type` (`"ACTION" | "NOTICE"`)
und implizit durch einen leeren `m4.text` (`""`) gesteuert. K12 ist der einzige Checkpoint,
der diesen impliziten Mechanismus nutzt (`m4.text = ""` → kein M4-Output). Eine Einführung
von `m4_behavior` als explizites Feld ist als Refactoring-Ticket geplant.

---

## 2. Perspektivregeln

Es gibt fachlich nur zwei Vorbereitungsperspektiven:

| Perspektive | Beschreibung |
|---|---|
| `MFA` | Fragen aus Sicht der medizinischen Fachangestellten / Praxis |
| `PATIENT` | Fragen aus Sicht des Patienten |

Patientengespräch in der Praxis (`preparation_mode = "conversation"`) und externer
Fragebogen-Link (`preparation_mode = "patient"`) sind **keine eigenen Perspektiven**.
Sie sind zwei verschiedene Erhebungswege derselben Patienten-Perspektive und teilen
sich den Fragenkatalog `M2_QUESTIONS` in `lib/logic/m2Questions.ts`.

### Pflichtperspektiven nach type × relevance

| type | relevance | Pflichtperspektiven |
|---|---|---|
| `DECISION` | `P` | MFA **und** PATIENT |
| `ASSESSMENT` | `P` | Mindestens eine Perspektive (MFA oder PATIENT) |
| `MULTI_SELECT` | `A` | Keine – ausschließlich M3 |

---

## 3. Kombinationstabelle aller aktiven Checkpoints (Ist-Stand)

| ID | Titel | type (Ist) | type (neu) | category | relevance | m4_behavior | MFA-Fragen | Patient-Fragen |
|---|---|---|---|---|---|---|---|---|
| K01 | Erreichbarkeit des Patienten | `PRESENCE_CHECK` | `DECISION` | O | P | ACTION | 3 | 4 |
| K02 | Praktische Möglichkeit der Terminwahrnehmung | `BEDARF` | `DECISION` | M | P | NOTICE | 2 | 3 |
| K03 | Diagnosenlage | `NACHWEIS` | `DECISION` | M | P | ACTION | 2 | 4 |
| K04 | Medikation | `VERIFIKATION` | `DECISION` | M | P | ACTION | 1 | 5 |
| K05 | Medizinische Mitbehandlung | `PROZESS_VORLAUF` | `DECISION` | M | A | NOTICE | 2 | 4 |
| K06 | Unterstützung im Alltag | `BEDARF` | `DECISION` | O | P | NOTICE | 4 | 4 |
| K07 | Vorübergehender Unterstützungsbedarf | `BEDARF` | `DECISION` | M | A | NOTICE | 3 | 4 |
| K08 | Nutzung digitaler Praxisleistungen | `VERIFIKATION` | `DECISION` | O | P | ACTION | 1 | 4 |
| K09 | Mitwirkung | `VERIFIKATION` | `DECISION` | O | A | ACTION | 2 | 0 |
| K10 | Besonderer Versorgungsaufwand | `BEDARF` | `MULTI_SELECT` | O | A | NONE | 0 | 0 |
| K11 | Formularanliegen | `BEDARF` | `MULTI_SELECT` | O | A | NONE | 0 | 0 |
| K12 | Alltagssituation / Pflegeeinschätzung | `BEDARF` | `ASSESSMENT` | M | P | NONE | 0 | 14 |

**Anmerkungen zur Tabelle:**
- Spalte „type (Ist)" = aktueller Wert im `CheckpointType`-Enum.
- Spalte „type (neu)" = Zuordnung nach dieser Dokumentation.
- „m4_behavior" für K12 ist `NONE`, obwohl das Feld im Code nicht existiert; es wird implizit durch `m4.text = ""` gesteuert.
- K05 hat `relevance = A` und somit keine Pflichtperspektiven; dennoch existieren sowohl MFA- als auch Patient-Fragen im Code.
- K09 hat `relevance = A` und nur MFA-Fragen (keine Patientenfragen).

---

## 4. Bekannte Inkonsistenzen (Ist-Stand)

Diese Inkonsistenzen wurden aus dem Code abgeleitet und sind noch nicht bereinigt.
Sie stellen offene Punkte für Refactoring-Tickets dar.

| # | Betroffene Stelle | Beschreibung |
|---|---|---|
| 1 | `lib/types.ts` → `CheckpointType` | Enum-Werte entsprechen nicht der neuen Taxonomie (DECISION / MULTI_SELECT / ASSESSMENT). Umbenennung bricht bestehende Datenbankeinträge. |
| 2 | `lib/types.ts` → `m4.type` | Kein `"NONE"`-Wert vorhanden. NONE wird implizit über leeren `m4.text` gesteuert (K12). |
| 3 | `lib/logic/checkpointCatalog.ts` → K12 | `m4.type = "NOTICE"` + `text = ""` statt explizitem `m4_behavior = "NONE"`. |
| 4 | `docs/checkpoints/CP-K*.md` | Felder `typ`, `block_id` und `relevance` in den Checkpoint-Einzeldokumenten weichen vom Code ab (veraltete Entwurfsdokumentation). |
| 5 | `docs/checkpoint-classification.md` | P/A-Semantik war als „Pflicht/additiv" beschrieben (veraltet). Wurde im Zuge dieser Überarbeitung korrigiert. |
| 6 | K05 (`PROZESS_VORLAUF`, relevance=A) | Hat sowohl MFA- als auch Patientenfragen, obwohl `relevance = A` (keine Pflichtperspektiven). |
| 7 | K09 (`VERIFIKATION`, relevance=A) | Hat keine Patientenfragen; `M2_QUESTIONS.K09` existiert nicht. Wenn K09 aktiv und `mode = "patient"`, rendert M2 den Checkpoint leer. |
| 8 | K12 (`BEDARF`/ASSESSMENT) | `relevance = P`, aber keine MFA-Fragen (`M2_QUESTIONS_MFA.K12` nicht definiert). MFA-Modus zeigt K12 leer. |
| 9 | K12 Patientenfragen | 14 Fragen in Beobachtungsformulierung (Dritte Person, „Wirkt…"), aber der Katalog wird auch für `mode = "conversation"` genutzt (Patientenselbstauskunft). |
