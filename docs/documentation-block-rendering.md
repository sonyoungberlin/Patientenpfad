# Produktvertrag für Dokumentationsbausteine

Diese Datei beschreibt die fachlich sichtbaren Bausteinmuster der Praxisbibliothek. Maßgeblich bleiben die vorhandenen `QuestionDefinition`-, `SemanticDocument`- und XML-v2-Verträge. Die fachlichen Namen im Editor sind eine verständliche Sicht auf diese vorhandenen technischen Typen, keine neue Backend-Struktur.

## Plaintext-Grundregel

Alle normalen Dokumentationsbausteine behandeln ihre Inhalte exakt als Plaintext. Das gilt für Festtext, Freitext, Hinweise, Auswahltexte, gemeinsame Einleitungstexte sowie Repeatable-/Detailfelder.

Diese Inhalte werden weder als Markdown interpretiert noch automatisch in URL-, E-Mail-, KIM- oder HTML-Links umgewandelt. Insbesondere wird kein `mailto:` erzeugt und eine Adresse wie `mvzkreuzberg.723236900@i-motion.kim.telematik` erscheint in der Dokumentation exakt als dieser Text.

Ein echter klickbarer Link ist eine separate zukünftige generische Funktion. Dafür wären ein expliziter Linkmechanismus sowie neue Unterstützung in `SemanticDocument`, XML v2 und `AppTextImport.bas` erforderlich. Normale Textbausteine dürfen keine Markdown-Linksyntax oder `mailto:`-Syntax als Linkvertrag verwenden.

## Mapping

| Fachlicher Typ | Formular | Technischer Vertrag | SemanticDocument / XML v2 | Word |
| --- | --- | --- | --- | --- |
| Festtext | Text wird angezeigt, kein Eingabefeld | `paragraph`; `textarea` mit `documentationText`, `omitDocumentationLabel` | `bodyText`; technische Blockgrenze als `heading visibility="spacingOnly"` | normaler Fließtext, technische Überschrift unsichtbar |
| Freitext | `textarea` mit verständlicher Eingabeaufforderung | `text`; Selbstreferenz in `documentationSegments`, `omitDocumentationLabel` | `bodyText` mit ausschließlich der Eingabe | normaler Fließtext ohne Präfix, Label oder Einrückung |
| Hinweis | `textarea` mit verständlicher Eingabeaufforderung | `hint`; Selbstreferenz in `documentationSegments`, `omitDocumentationLabel` | `freeText` mit ausschließlich der Eingabe | abgesetzt als `Hinweis: <Eingabe>`; der Präfix entsteht im Word-Renderer |
| Detailblock | wiederholbare, strukturierte Felder | `repeatable` / `repeatable_group` | ein `listItem` pro Datensatz; Feldzeilen innerhalb dieses Items | kompakt und eingerückt; Datensätze bleiben gruppiert |
| Auswahlblock | `multi_select` | `list` mit `sharedDocumentationText` und Optionsausgaben | Einleitung als `bodyText`, jede gewählte Option als `listItem` | Einleitung normal, Punkte darunter kompakt und eingerückt |

XML v2 bleibt unverändert bei Version `2.0`. Verwendet werden nur die vorhandenen Item-Typen `heading`, `bodyText`, `freeText` und `listItem`. Die Word-Darstellung folgt den bestehenden Regeln in `AppTextImport.bas`: `freeText` erhält den fachlichen Präfix `Hinweis:`, `listItem` wird kompakt und eingerückt dargestellt, `bodyText` als normaler Fließtext.

## 1. Festtext

**Zweck:** Ein standardisierter Satz oder Absatz, zum Beispiel: „Die weitere Behandlung erfolgt ambulant hausärztlich.“

- Der Inhalt ist im Formular sichtbar und nicht editierbar.
- Es erscheint kein Eingabefeld.
- Der Inhalt wird auch ohne Antwort ausgegeben.
- Der Bibliothekstitel bleibt nur eine unsichtbare semantische Blockgrenze und wird nicht als technische Überschrift in Word angezeigt.

## 2. Freitext

**Zweck:** Ein individueller zusätzlicher Satz oder Absatz.

- Das Formular zeigt die konfigurierte Eingabeaufforderung und ein Textfeld.
- Im Dokument erscheint ausschließlich die Eingabe.
- Weder Bibliothekstitel noch Feldbezeichnung werden vorangestellt.
- Eine leere Eingabe erzeugt keinen Dokumentinhalt.

Beispiel: Die Eingabe `Kontrolle in vier Wochen.` wird als normaler `bodyText` `Kontrolle in vier Wochen.` ausgegeben.

## 3. Hinweis

**Zweck:** Eine bewusst hervorgehobene Zusatzinformation.

- Das Formular zeigt die konfigurierte Eingabeaufforderung und ein Textfeld.
- XML v2 enthält ausschließlich den eingegebenen Text als `freeText`.
- Word stellt daraus `Hinweis: <Eingabe>` her. `Hinweis:` ist ein fachlicher Präfix, nicht das technische Feldlabel.
- Eine leere Eingabe erzeugt keinen Dokumentinhalt.

## 4. Detailblock

**Zweck:** Wiederholbare strukturierte Angaben, etwa Fachrichtung, Praxis, Name und Adresse.

Jeder Datensatz wird als ein zusammenhängendes `listItem` ausgegeben. Die Feldzeilen bleiben dadurch gruppiert; mehrere Datensätze sind getrennte kompakte Items. Technische Bezeichnungen wie `1. Eintrag` oder `2. Eintrag` gehören nicht in das fertige Dokument.

Beispiel:

```text
Fachrichtung: Orthopädie
Praxis: Beispielpraxis
Name des Arztes: Dr. Beispiel
Adresse: Beispielstraße 1, 10115 Berlin
```

Die Nummerierung `Eintrag 1` im Formular ist ausschließlich eine Bedienhilfe zum Bearbeiten mehrerer Datensätze und kein Dokumentinhalt.

## 5. Auswahlblock

**Zweck:** Ein fester Einleitungssatz mit mehreren ausgewählten Punkten.

- Das Formular zeigt eine Mehrfachauswahl.
- `sharedDocumentationText` wird genau einmal als `bodyText` ausgegeben, sobald mindestens eine Option gewählt ist.
- Jede gewählte Optionsausgabe wird anschließend als eigenes `listItem` ausgegeben.
- Ohne Auswahl entsteht keine Ausgabe.

## Einordnung bestehender Bausteine

Diese Einordnung ändert keine gespeicherten Definitionen:

| Bestehendes Beispiel | Einordnung unter dem Vertrag |
| --- | --- |
| Ambulante hausärztliche Behandlung | Festtext |
| Anforderung Facharzt | Auswahlblock mit Einleitung |
| Konkrete Fragestellung / insbesondere | Festtext plus separater optionaler Freitext, sofern der Einleitungssatz immer erscheinen soll |
| KIM-Rücksendung und Schluss | Festtext |
| Facharzt/Praxis Repeatable | Detailblock |

Festtext plus optionaler Freitext wird bewusst aus zwei Bausteinen zusammengesetzt. Dadurch bleiben Sichtbarkeit und Leerverhalten eindeutig, ohne einen neuen Misch- oder Spezialtyp einzuführen.

## Anti-Patterns

- Festtext nicht als `text`-Textarea modellieren.
- Technische Titel oder Feldlabels nicht automatisch in den Dokumentinhalt übernehmen.
- Keine Ausgaben wie `1. Eintrag` oder `2. Eintrag` in fertigen Briefen erzeugen.
- Keine Dummy-Leerzeichen oder Leerabsätze zur Darstellung speichern.
- Normale Textbausteine nicht mit Markdown-Linksyntax speichern.
- Keine automatische Linkinterpretation von URLs, E-Mail- oder KIM-Adressen erwarten.
- Keine `mailto:`-Syntax in Festtexten verwenden.
- Keine neuen Spezialtypen einführen, wenn `paragraph`, `text`, `hint`, `repeatable`, `list` und die vorhandenen SemanticDocument-Typen ausreichen.
- Den Präfix `Hinweis:` nicht in Eingaben oder XML duplizieren; er gehört zur Word-Darstellung von `freeText`.

## Pflege- und Kompatibilitätsregel

Praxisbausteine werden mit ihrer Definition in Sessions eingefroren. Änderungen am Builder gelten für neu erstellte oder künftig bearbeitete Definitionen und migrieren weder bestehende Sessions noch gespeicherte Praxisbausteine automatisch. Änderungen an diesem Vertrag müssen SemanticDocument, XML v2 und Word gemeinsam testen; das XML-v2-Schema darf dafür nicht erweitert werden.