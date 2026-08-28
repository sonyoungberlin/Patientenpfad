# Checkpoint-Bibliothek: Redaktionsrichtlinie

> **Geltungsbereich:** Dieses Dokument gilt ausschließlich für das **klinische
> Workflow-Modul** (Rezept, AU, Überweisung, Heilmittel, Hilfsmittel, Krankentransport).  
> Für `lib/practiceProcesses` (Arbeitsprozesse) gilt
> [`docs/workflow/practice-processes-architecture.md`](../workflow/practice-processes-architecture.md).
> Dieses Dokument dort **nicht** anwenden.
>
> **Status für klinisches Workflow-Modul:** Verbindlich.  
> Widersprüche zu anderen Dokumenten im klinischen Modul sind als Inkonsistenz zu behandeln und zu beheben.

---

## 1. Ziel der Checkpoint-Bibliothek

### Warum gibt es Checkpoints?

Eine Hausarztpraxis trifft täglich Entscheidungen auf der Grundlage gemeinsamer
Erfahrung. Mit der Zeit bleibt oft nur das Ergebnis erhalten — „Das machen wir
hier immer so" — während der ursprüngliche Denkprozess verloren geht.

Die Checkpoint-Bibliothek macht den Denkprozess einer Praxis nachvollziehbar.
Sie stellt benannte, fachlich definierte Informationseinheiten bereit, auf die
sich alle Praxisfälle beziehen können.

Die Bibliothek dokumentiert keine Prozesse.

Sie dokumentiert die fachlichen Überlegungen, aus denen Prozesse entstehen.

Dadurch bleibt nachvollziehbar, warum eine Praxis einen Prozess genau so definiert hat.

### Welches Problem lösen sie?

Ohne eine gemeinsame Bibliothek benennt jeder Praxisfall dieselben Sachverhalte
anders. Wissen dupliziert sich. Änderungen müssen an mehreren Stellen gepflegt
werden. Verknüpfungen zwischen Fällen werden unsichtbar.

Die Bibliothek löst dieses Problem, indem sie jeden Sachverhalt **einmal** und
**präzise** benennt. Praxisfälle greifen auf diese Einträge zurück, statt sie
neu zu erfinden.

---

## 2. Definition eines Checkpoints

### Was ist ein Checkpoint?

Ein Checkpoint ist die kleinste fachliche Informationseinheit im System.

Er beschreibt genau **einen** Sachverhalt, der in einem konkreten Praxisfall
entweder zutrifft (`JA`), nicht zutrifft (`NEIN`) oder noch nicht geklärt ist
(`OFFEN` / `UNKLAR`).

Beispiele:
- Patient bekannt
- Dauermedikation vorhanden
- Einwilligung vorhanden
- Krankenhausbrief vorhanden
- Kontrolle aktuell

### Welche Verantwortung hat ein Checkpoint?

Ein Checkpoint trägt ausschließlich **seine eigene fachliche Aussage**.

Er beschreibt, **was** eine Information ist — nicht wie sie erhoben wird,
nicht wer sie prüft, nicht was sie bedeutet, nicht was danach zu tun ist.

### Welche Verantwortung hat er ausdrücklich NICHT?

Ein Checkpoint kennt nicht:

- den Praxisfall, in dem er verwendet wird
- andere Checkpoints
- Rollen oder Zuständigkeiten
- Regeln oder Entscheidungslogik
- Prozessschritte oder Reihenfolgen
- Konsequenzen seines Zustands
- Folgemaßnahmen bei `NEIN` oder `UNKLAR`

Alles davon gehört in die Schichten oberhalb der Bibliothek.

---

## 3. Grundprinzipien

### Atomar

Ein Checkpoint beschreibt genau eine Information.

Er kann nicht in zwei unabhängige Teile zerlegt werden, die jeweils für sich
einen eigenen Zustand haben könnten. Sobald eine Zerlegung möglich ist, sind
es zwei Checkpoints.

### Kontextfrei

Ein Checkpoint versteht sich ohne Kenntnis eines Praxisfalls.

Wer den Titel liest, soll sofort verstehen, welche Information gemeint ist —
ohne zu wissen, ob es sich um eine Rezeptanfrage, eine Laborkontrolle oder
eine Überweisung handelt.

### Wiederverwendbar

Ein Checkpoint gehört zur globalen Bibliothek, weil er grundsätzlich geeignet
ist, in mehreren unterschiedlichen Praxisfällen dieselbe Bedeutung zu haben.
Er wird nicht für einen einzelnen Fall erfunden.

### Fachlicher Zustand statt Prozess

Ein Checkpoint beschreibt einen **Zustand** — nicht eine Handlung, nicht einen
Schritt, nicht ein Ereignis.

- Korrekt: „Einwilligung vorhanden" (Zustand)
- Falsch: „Einwilligung eingeholt" (Handlung)

### Eine Information pro Checkpoint

Jeder Checkpoint enthält eine einzige, ungeteilte fachliche Aussage.
Konjunktionen im Titel sind ein Warnsignal.

### Bibliothekswachstum durch Praxisfälle

Die Checkpoint-Bibliothek entsteht nicht durch theoretische Planung, sondern
ausschließlich durch konkrete Praxisfälle.

So viele Checkpoints wie nötig. So wenige wie möglich.

Neue Checkpoints werden niemals auf Vorrat angelegt. Jeder neue Eintrag
benötigt einen konkreten Praxisfall als Anlass. Vor jedem neuen Checkpoint
wird aktiv geprüft, ob die benötigte fachliche Information bereits durch einen
bestehenden Checkpoint ausreichend beschrieben wird. Nur wenn das nicht der
Fall ist, wird ein neuer Checkpoint angelegt.

Praxisfälle bauen die Bibliothek. Nicht umgekehrt.

---

## 4. Redaktionsregeln

### Wann wird ein neuer Checkpoint angelegt?

Ein neuer Eintrag ist gerechtfertigt, wenn **alle** folgenden Bedingungen erfüllt sind:

1. Ein Checkpoint muss grundsätzlich geeignet sein, in mehreren unterschiedlichen
   Praxisfällen wiederverwendet zu werden. Die aktuelle Anzahl der Verwendungen
   ist kein Aufnahmekriterium.
2. Er lässt sich nicht durch einen bestehenden Checkpoint abdecken.
3. Er ist nicht die Kombination bestehender Checkpoints.
4. Er beschreibt einen Zustand, keine Handlung und kein Urteil.

Ist auch nur eine Bedingung nicht erfüllt, wird kein neuer Checkpoint angelegt.

### Wann wird ein bestehender Checkpoint verwendet?

Bevor ein neuer Eintrag erstellt wird, muss aktiv nach einem semantisch
äquivalenten Checkpoint gesucht werden — nicht nur nach identischen Titeln,
sondern nach identischer **Bedeutung**.

Wenn ein bestehender Checkpoint denselben Sachverhalt beschreibt, wird er
verwendet. Formulierungsvarianten sind kein Grund für einen neuen Eintrag.

### Wie werden Titel formuliert?

| Regel | Erläuterung |
|---|---|
| **Nominalphrase** | Kein Satz, keine Frage, keine Aufforderung |
| **Positiv** | Beschreibt das Vorhandensein, nicht die Abwesenheit |
| **Zustandsverb** | vorhanden, bekannt, aktuell, dokumentiert — nicht ausgestellt, besprochen, erledigt |
| **Kein Kontext** | Kein Praxisfall, keine Rolle, kein Anlass im Titel |
| **Keine Konjunktion** | Kein „und", kein „oder" |
| **Kurz und eindeutig** | So kurz wie möglich, so präzise wie nötig |

### Verbotene Formulierungen

| Muster | Grund | Beispiel |
|---|---|---|
| Konjunktion | compound | „Diagnose und Medikation bekannt" |
| Prozessverb | Handlung statt Zustand | „Überweisung ausgestellt" |
| Negation als Grundzustand | kognitive Last | „Keine akuten Beschwerden" |
| Urteil oder Bewertung | nicht messbar | „Diagnose ausreichend dokumentiert" |
| Kontext im Titel | nicht kontextfrei | „Rezept wurde besprochen" |
| Catchall | zu unspezifisch | „Alles vollständig" |
| Prozessschritt | keine Information | „Termin vereinbaren" |

### Antipatterns

**Kontexteinbettung**: Der Titel enthält den Namen eines Praxisfalls oder einer
Behandlungssituation. Folge: der Checkpoint kann nicht wiederverwendet werden.

**Überoperationalisierung**: Die Bibliothek enthält operationalisierte
Zeitgrenzen, die praxisspezifisch variieren (z. B. „Letzter Besuch < 90 Tage").
Korrekt ist die abstrakte Form: „Kontrolle aktuell". Die Praxis legt in ihrer
Bewertung fest, was das für sie bedeutet.

**Urteilsverb**: Checkpoints wie „Diagnose ausreichend gesichert" enthalten das
Wort „ausreichend" als verstecktes Urteil. Zwei Personen können denselben
Sachverhalt unterschiedlich bewerten — das verletzt die Messbarkeit.

**Bibliotheksinflation**: Für jeden neuen Praxisfall werden neue Checkpoints
angelegt, auch wenn bestehende passen würden. Die Bibliothek wächst, obwohl sie
konsolidiert werden sollte.

**Granularitätsmischung**: Die Bibliothek enthält gleichzeitig sehr feine
(„Vorname vollständig", „Nachname vollständig") und sehr grobe Einträge
(„Patientendaten vollständig"). Der Granularitätslevel muss konsistent sein.

---

## 5. Qualitätsprüfungen

Jeder Checkpoint muss vor der Aufnahme in die Bibliothek alle fünf Prüfungen
bestehen. Eine nicht bestandene Prüfung ist ein Aufnahmehindernis.

### Atomaritätstest

**Frage**: Kann dieser Checkpoint in zwei Teile zerlegt werden, die unabhängig
voneinander `JA` oder `NEIN` sein könnten?

Wenn ja → aufteilen.

**Frage**: Enthält der Titel „und" oder „oder"?

Wenn ja → aufteilen.

### Wiederverwendbarkeitstest

**Frage**: Ist dieser Checkpoint grundsätzlich geeignet, in mehreren
unterschiedlichen Praxisfällen wiederverwendet zu werden?

Die aktuelle Anzahl der Verwendungen ist kein Aufnahmekriterium. Entscheidend
ist die prinzipielle Eignung zur Wiederverwendung — unabhängig davon, ob der
Checkpoint heute bereits in mehr als einem Praxisfall vorkommt.

Wenn die prinzipielle Eignung nicht gegeben ist → kein Bibliothekseintrag.
Der Sachverhalt gehört in die Beschreibung des Praxisfalls.

### Kontexttest

**Frage**: Versteht jemand, der den Titel liest, den Checkpoint ohne Kenntnis
des Praxisfalls?

Wenn nein → der Titel trägt versteckten Kontext. Überarbeiten.

**Frage**: Würde dieser Checkpoint in einem völlig anderen Praxisfall dieselbe
Bedeutung haben?

Wenn nein → er ist zu kontextspezifisch.

### Duplikatstest

**Frage**: Gibt es bereits einen Checkpoint, der denselben Sachverhalt beschreibt
— möglicherweise unter einem anderen Titel?

Wenn ja → keinen neuen Eintrag anlegen. Den bestehenden verwenden.

**Erkennungstest**: Würde man beide Checkpoints in jedem denkbaren Fall immer
mit demselben Zustand beantworten? Wenn ja → Duplikat.

### Granularitätstest

**Frage**: Passt die Feinheit dieses Checkpoints zu den anderen Einträgen der
Bibliothek?

Checkpoints, die deutlich feiner oder gröber sind als der Durchschnitt der
Bibliothek, sind Kandidaten für Zusammenführung oder Aufspaltung.

---

## 6. Beziehung zu M2

M2 bezeichnet den Klärungsschritt, in dem Fragen gestellt werden, um den Zustand
eines Checkpoints zu ermitteln.

### Grundregel

**Fragen gehören immer zu genau einem Checkpoint.**

Eine Frage ohne zugehörigen Checkpoint existiert nicht. Eine Frage, die zwei
Checkpoints gleichzeitig klärt, ist falsch zugeordnet.

### Fragenblöcke

Ein Checkpoint kann einen oder mehrere Fragenblöcke besitzen. Fragenblöcke
können unterschiedliche Perspektiven abbilden, zum Beispiel:

- **MFA-Block**: Fragen, die die medizinische Fachangestellte stellt
- **Patienten-Block**: Fragen, die dem Patienten gestellt werden
- **Arzt-Block**: Fragen, die der Arzt beantwortet

Alle Fragenblöcke eines Checkpoints dienen ausschließlich dazu, denselben
Checkpoint zu klären. Sie sind Erhebungswege, keine inhaltlichen Varianten.
Der Checkpoint selbst ist neutral gegenüber der Perspektive.

### Fachliche Identität von Fragen

Fragen besitzen außerhalb ihres Checkpoints keine fachliche Identität.

Eine Frage wie „Hat der Patient eine Dauermedikation?" ist nur im Kontext des
Checkpoints „Dauermedikation vorhanden" bedeutsam. Außerhalb dieses Checkpoints
ist sie fachlich nicht definiert.

Es gibt keine eigenständige Fragenbibliothek. Fragen werden ausschließlich als
Bestandteil eines Checkpoints erfasst und gepflegt.

### Was Fragen nicht entscheiden

Fragen erheben den Zustand eines Checkpoints. Sie **bewirken** keinen Zustand.
Der Zustand (`JA` / `NEIN` / `UNKLAR`) wird durch die Praxis gesetzt, nicht
durch die Fragen berechnet.

---

## 7. Orientierungsanker

Ein **Orientierungsanker** ist ein fachlicher Ankerpunkt, der den Denkprozess
einer Praxis bei der Einschätzung eines Checkpoints strukturiert.

Orientierungsanker erinnern an typische Überlegungen erfahrener Mitarbeitender.
Sie sind kein Interview, keine Checkliste und kein Pflichtfeld. Sie werden weder
beantwortet noch bewertet noch ausgewertet.

Ein Orientierungsanker gehört zu genau einem Checkpoint. Er besitzt außerhalb
dieses Checkpoints keine fachliche Identität.

---

## 8. Beispiele

### Gute Checkpoints

| Titel | Warum gut |
|---|---|
| Patient bekannt | Atomar, positiv, kontextfrei, Zustand |
| Dauermedikation vorhanden | Atomar, positiv, wiederverwendbar |
| Einwilligung vorhanden | Atomar, klar messbar |
| Krankenhausbrief vorhanden | Atomar, kontextfrei |
| Kontrolle aktuell | Atomar, abstrakt genug für praxisspezifische Operationalisierung |
| Versicherungsnachweis vorhanden | Atomar, kontextfrei, wiederverwendbar |
| Diagnose dokumentiert | Atomar, Zustand statt Handlung |

### Schlechte Checkpoints und ihre Korrektur

| Titel | Problem | Korrektur |
|---|---|---|
| Patient bekannt und Versicherungsdaten aktuell | Konjunktion — zwei Checkpoints | Aufteilen |
| Überweisung ausgestellt | Prozessverb | „Überweisung vorhanden" |
| Aufklärung durchgeführt | Handlung | „Aufklärung dokumentiert" |
| Keine akuten Beschwerden | Negation als Grundzustand | „Akute Beschwerden vorhanden" |
| Diagnose ausreichend gesichert | Urteil | „Diagnose dokumentiert" |
| Rezept wurde besprochen | Kontext im Titel | „Medikation bekannt" |
| Alles in Ordnung | Catchall | Aufteilen in relevante Einzelaspekte |
| Arzttermin notwendig | Entscheidung, kein Sachverhalt | Kein Checkpoint — das ist eine Regel |
| Patient kooperativ | Subjektive Bewertung | Kein Checkpoint — nicht messbar |
| Letzter Besuch < 90 Tage | Überoperationalisiert | „Kontrolle aktuell" |

### Typische Fehler in der Praxis

**Fehler: Checkpoint für eine einzelne Situation**

„Blutdruckmedikation vorhanden" statt „Dauermedikation vorhanden".

Der spezifische Kontext (Blutdruck) gehört in den Praxisfall, nicht in den
Checkpoint. Die Bibliothek hält den allgemeinen Begriff.

**Fehler: Checkpoint beschreibt einen Prozessschritt**

„Termin vereinbaren" oder „Arzt informieren" sind Aufgaben, keine Zustände.
Das entsprechende Informationsobjekt wäre: „Termin vorhanden".

**Fehler: Identische Einträge unter verschiedenen Titeln**

„Patient bekannt" und „Bestandspatient" bedeuten dasselbe. Nur einer darf
in der Bibliothek existieren; der andere wird als Synonym dokumentiert,
aber nicht als eigenständiger Eintrag geführt.

**Fehler: Checkpoint beschreibt ein Ergebnis statt einen Sachverhalt**

„Behandlung erfolgreich abgeschlossen" ist kein Checkpoint — es ist eine
Zusammenfassung. Checkpoints beschreiben Sachverhalte, die im Verlauf eines
Praxisfalls relevant sind, nicht das Gesamtergebnis.

---

## Anhang: Checkliste vor Aufnahme eines neuen Checkpoints

- [ ] Nominalphrase ohne Konjunktion?
- [ ] Positiv formuliert?
- [ ] Zustandsverb (nicht Handlungsverb)?
- [ ] Kein Praxisfallkontext im Titel?
- [ ] Grundsätzlich geeignet zur Wiederverwendung in mehreren Praxisfällen?
- [ ] Kein semantisch äquivalenter Eintrag bereits vorhanden?
- [ ] Nicht zerlegbar in zwei unabhängige Sachverhalte?
- [ ] Kein verstecktes Urteil im Titel?
- [ ] Granularität konsistent mit bestehenden Einträgen?
- [ ] Beschreibung kontextfrei und ohne Praxisfallbezug?
