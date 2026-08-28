# practiceProcesses — Verbindliche Redaktions- und Klassifikationsarchitektur

> **Status:** Verbindlich für alle Inhalte in `lib/practiceProcesses`.  
> Diese Datei ist die alleinige Architekturgrundlage für `lib/practiceProcesses`.  
> Abweichende Regeln in anderen Dokumenten — insbesondere
> `docs/architecture/checkpoint-guidelines.md` — gelten dort **nicht** für
> `lib/practiceProcesses`.

---

## Vierstufige Hierarchie

### 1. Praxisfall
**Leitfrage:** *Warum beginnt dieser Arbeitsprozess?*

Ein Praxisfall beschreibt einen eindeutig abgrenzbaren Anlass bzw. eine Situation,
für die eine Praxis einen eigenen Arbeitsstandard benötigt.

Er beschreibt **nicht** einzelne Prüfungen innerhalb dieses Ablaufs.

### 2. Checkpoint
**Leitfrage:** *Was muss innerhalb dieses Praxisfalls eigenständig geklärt, geprüft,
entschieden oder getan werden?*

Ein Checkpoint trägt genau **einen** fachlichen Sachverhalt.

Ein Inhalt gehört insbesondere dann auf Checkpoint-Ebene, wenn sein Ergebnis eine
eigenständige fachliche Entscheidung, Handlung, Verantwortlichkeit oder eine
Änderung des weiteren Vorgehens auslösen kann.

Wichtig: Der vorhandene Checkpoint-Katalog ist Ausgangsmaterial und keine fachliche
Vorgabe. Ein vorhandener Checkpoint darf verändert, aufgeteilt, zusammengeführt
oder entfernt werden, wenn die fachliche Herleitung dies ergibt.

### 3. Orientierungsanker
**Leitfrage:** *Woran wird dieser Checkpoint konkret erkannt, geprüft oder näher
bestimmt?*

Ein Orientierungsanker beschreibt genau **einen auswählbaren Aspekt**, der zur
Beurteilung oder Konkretisierung genau dieses Checkpoints beiträgt.

Der Begriff `orientationAnchor` ist bewusst neutral. Ein Orientierungsanker kann
sprachlich beispielsweise sein:
- eine Frage: „Ist das Medikament im aktuellen Medikationsplan dokumentiert?"
- ein Kriterium: „Aktueller Medikationsplan vorhanden"
- ein Prüfpunkt: „Bereits wiederholt durch die Praxis verordnet"
- eine Bedingung oder ein kurzer beschreibender Aspekt

Es gibt **keine** zusätzliche fachliche oder technische Ebene „Orientierungsfrage".
Das technische Feld `orientationAnchors` bleibt bestehen und wird nicht in
unterschiedliche Typen aufgeteilt.

Ein Orientierungsanker trägt möglichst genau **eine** Information bzw. Dimension.

Er muss:
- eindeutig zu seinem Checkpoint gehören
- zusätzliche Information liefern (den Checkpoint-Titel nicht lediglich wiederholen)
- nicht selbst einen vollständig eigenständigen Prozessschritt darstellen
- im Anwenderflow sinnvoll auswählbar sein

**Bedeutung der Auswahl in M2:**  
Die Auswahl eines Orientierungsankers bedeutet nicht, dass die Praxis eine Frage
mit „Ja" beantwortet. Sie bedeutet:
> „Dieser Aspekt gehört zu unserem Praxisstandard und soll bei diesem Checkpoint
> berücksichtigt bzw. geprüft werden."

### 4. Umsetzung
**Leitfrage:** *Wie machen wir das in unserer Praxis konkret?*

Hierhin gehören praxisindividuelle Durchführung, interne Wege, Zuständigkeiten und
Konkretisierungen — sofern daraus nicht selbst ein eigenständiger Checkpoint wird.

---

## Verbindlicher Klassifikationstest

Bei jedem Inhalt immer von grob nach fein prüfen:

| Test | Ebene |
|---|---|
| A. Erzeugt der Inhalt überhaupt erst den Anlass für einen eigenen Ablauf? | → Praxisfall |
| B. Muss der Sachverhalt innerhalb dieses Ablaufs eigenständig geprüft, entschieden oder durchgeführt werden? | → Checkpoint |
| C. Beschreibt der Inhalt lediglich einen einzelnen Aspekt, anhand dessen dieser Checkpoint beurteilt oder konkretisiert wird? | → Orientierungsanker |
| D. Beschreibt der Inhalt die konkrete lokale Vorgehensweise der Praxis? | → Umsetzung |

---

## Verschiebetest

**Anker → Checkpoint:**  
Wenn ein vermeintlicher Orientierungsanker bei unterschiedlichem Ergebnis eine
eigenständige neue fachliche Entscheidung, Handlung oder einen anderen Prozessweg
erzeugt, muss geprüft werden, ob er eigentlich ein eigener Checkpoint ist.

**Checkpoint → Anker:**  
Wenn ein vermeintlicher Checkpoint lediglich eine Dimension eines anderen Checkpoints
beschreibt und keine eigenständige Entscheidung oder Handlung trägt, muss geprüft
werden, ob er eigentlich ein Orientierungsanker ist.

---

## Atomaritätsregeln

| Ebene | Regel |
|---|---|
| Praxisfall | ein abgrenzbarer Anlass |
| Checkpoint | ein eigenständig prüfbarer / entscheidbarer Sachverhalt |
| Orientierungsanker | ein Aspekt / möglichst eine Information |
| Umsetzung | praxisindividuelle Konkretisierung |

Kein Sammelanker mit mehreren Informationen in einem Satz:  
*„Ist das Medikament bekannt, unverändert und verträglich?"* enthält drei
Informationen und muss in drei Anker getrennt werden.

---

## Abgrenzungsregel

Thematische Nähe reicht nicht für die Zuordnung eines Orientierungsankers.

Für jeden Anker muss der Satz sinnvoll funktionieren:

> „Dieser Aspekt hilft konkret dabei, **genau diesen** Checkpoint zu beurteilen
> oder zu konkretisieren."

Wenn das nicht funktioniert, ist Ebene oder Zuordnung zu überprüfen.

---

## Arbeitsrichtung bei der Bibliotheksüberarbeitung

**Nicht:** vorhandenen Checkpoint nehmen → passende Anker dazu erfinden.

**Immer:**

```
Praxisfall verstehen
→ notwendige eigenständige Prüfungen / Entscheidungen / Handlungen bestimmen
→ daraus Checkpoints ableiten
→ jeden Checkpoint in sinnvolle Orientierungsanker zerlegen
→ erst anschließend mit dem bestehenden Katalog vergleichen
```

Der bestehende Katalog ist Ausgangsmaterial und darf die fachliche Herleitung
nicht vorgeben.

---

## Dokumentationstest

Ein ausgewählter Orientierungsanker muss in der späteren Praxisdokumentation
sinngemäß unter dieser Aussage stehen können:

> „Bei diesem Checkpoint berücksichtigt/prüft unsere Praxis: …"

Wenn das semantisch nicht funktioniert, ist Formulierung, Ebene oder Zuordnung
zu überprüfen.

---

## Medizinische und rechtliche Grenze

Medizinische, rechtliche oder regulatorische Anforderungen dürfen nicht erfunden
werden. Wenn für einen Inhalt externe fachliche Prüfung notwendig wäre, ist er
bei der Katalogarbeit als **`EXTERNAL_REVIEW_NEEDED`** zu kennzeichnen.

---

## Verhältnis zu anderen Dokumenten

| Dokument | Geltungsbereich |
|---|---|
| `docs/architecture/checkpoint-guidelines.md` | Klinisches Workflow-Modul (Rezept, AU, Überweisung usw.) — nicht `lib/practiceProcesses` |
| `docs/workflow/workflow-principles.md` | Klinisches Workflow-Modul |
| `docs/workflow/internal-protocol-checkpoint-analysis.md` | Älteres Fachmodell (InternalProtocol-Pilot „Patienten ohne Termin") — gilt nicht für `lib/practiceProcesses` |
| **dieses Dokument** | `lib/practiceProcesses` — verbindlich, überschreibt abweichende Regeln |
