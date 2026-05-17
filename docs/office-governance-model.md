# Office Governance Model

Status: Fachlich-architektonische Konsolidierung
Zweck: Gemeinsames, stabiles Verstaendnis fuer Checkpoints und Governance-Entscheidungen im Office-System.

Hinweis zur Lesart dieser Dokumentation:
- Diese Dokumentation beschreibt das fachliche Zielmodell.
- Die aktuelle Runtime ist in Teilen noch in einer Uebergangslogik mit Fallbacks.
- Insbesondere checkpointType, failureEffect und outcomeAudience sind fachlich gesetzt, werden technisch aber derzeit teilweise noch additiv/neutral befuellt.

## 1) Was ein Office-Checkpoint ist

Ein Office-Checkpoint ist eine atomare Governance-Aussage.

Das bedeutet:
- Ein Checkpoint enthaelt genau eine fachliche Information.
- Ein Checkpoint beantwortet genau eine pruefbare Frage.
- Ein Checkpoint ist kein Sammelbehaelter fuer mehrere Bedingungen.
- Ein Checkpoint enthaelt keine versteckten Mehrfachkriterien.

Leitfrage:
- Kann eine Person aus Praxisleitung oder Backoffice den Punkt in einem Satz bestaetigen oder verneinen?

Gute Beispiele:
- "Liegt eine gueltige Approbation vor?"
- "Ist die zustaendige externe Stelle eindeutig bestimmt?"

Keine guten Beispiele:
- "Ist alles fuer die Anstellung geklaert?" (Sammel-Checkpoint)
- "Sind Unterlagen vollstaendig und Fristen eingehalten und Verantwortung klar?" (Mehrfachbedingung)

## 2) Unterschied zwischen checkpointType, failureEffect und optionaler Prozess-/Steuerungslogik

checkpointType beschreibt die Art der fachlichen Information.
- Worum geht es inhaltlich?
- Welche Art von Aussage wird getroffen?

failureEffect beschreibt die fachliche Auswirkung einer negativen/offenen Bewertung.
- Was bedeutet ein Defizit fuer den Fall?
- Wie stark wirkt sich das auf die weitere Bearbeitung aus?

Optionale Prozess-/Steuerungslogik beschreibt, wie Organisation und Bearbeitung reagieren.
- Wer wird informiert?
- Welche Nachverfolgung passiert?
- Welche Priorisierung oder Eskalation ist sinnvoll?

Merksatz:
- checkpointType = "Was wird geprueft?"
- failureEffect = "Welche Tragweite hat ein Problem?"
- Prozesslogik = "Wie wird damit im Alltag umgegangen?"

Runtime-Stand heute:
- Das Zielmodell ist vorhanden, aber noch nicht durchgaengig explizit pro Checkpoint ausmodelliert.
- Teile der Befuellung erfolgen aktuell noch ueber Uebergangs-/Fallback-Logik.

## 3) Was keine Checkpoint-Typen sind

BLOCKER, GATEKEEPER und RISIKO/RISK sind keine Informationstypen.
Sie sind Auswirkungen oder Prozessrollen.

## M2-Fragen — Sprach- und UX-Regeln

### Grundsatz

M2 ist die Arbeitsoberfläche für MFA und Praxismanagement — kein Rechtsgutachten und kein Audit-Bogen.
Wer eine M2-Frage liest, muss sie sofort verstehen und sofort mit Ja, Nein oder Unklar beantworten können.
Wenn eine MFA die Frage erklären müsste, bevor sie sie beantwortet, ist die Frage falsch formuliert.

### Rolle von M2 und M3 — klare Abgrenzung

#### M2 — Fallklärung und operative Informationssammlung

M2 ist **nicht**:
- reine Compliance-Checkliste
- reine Dokumentationsprüfung
- Governance- oder Prozesssprech
- juristische Verdichtung

M2 **ist**:
- konkrete Fallklärung
- situationsbezogene Hilfestellung
- operative Informationssammlung
- Vorbereitung der fachlichen Bewertung in M3

M2 **soll**:
- helfen, den Fall zu verstehen
- die entscheidenden Informationen sichtbar machen
- fehlende Informationen identifizieren
- den Nutzer durch die fachliche Situation führen
- konkrete praktische Probleme sichtbar machen
- fachliche Schwachstellen aufdecken

M2 **darf**:
- konkrete medizinische oder organisatorische Situationen ansprechen
- typische Problemkonstellationen benennen
- nach realen Nachweisen, Befunden oder Dokumentationen fragen
- typische Regress-, Melde- oder Genehmigungsprobleme konkretisieren

M2 **soll klingen wie**:
„Ein erfahrener Kollege schaut mit auf den Fall und fragt nach den entscheidenden Punkten."

#### M3 — Verdichtung und Entscheidungsebene

M3 ist:
- fachliche Bewertung des in M2 geklärten Sachverhalts
- Risiko- und Compliance-Einordnung
- strukturierte Handlungsempfehlung
- formalisierte Zusammenfassung

M3 beantwortet:
- Wie ist der Fall fachlich zu bewerten?
- Welche Risiken bestehen?
- Welche Schritte sind jetzt erforderlich?
- Ist die Dokumentation ausreichend?
- Ist externe Eskalation nötig?

**Konsequenz für die Fragengestaltung:**
Prozessfragen (Fristen, Zuständigkeiten, Versandwege) gehören in M2, aber sie sind *nachgelagert* zur fachlichen Fallklärung.
Zuerst muss in M2 klar sein, worum es inhaltlich geht — dann können M3 die Lage fachlich einordnen.

### Fachlicher Anspruch: M2 als Fallklärung, nicht als Checkliste

M2-Fragen dürfen nicht nur prüfen, ob etwas „dokumentiert", „hinterlegt" oder „geprüft" wurde.
Sie müssen die konkreten Informationen sammeln, die für die M3-Entscheidung, die Stellungnahme oder die nächste Handlung gebraucht werden.

**Prüffrage beim Formulieren einer M2-Frage:**
Kann jemand diese Frage mit Ja beantworten, ohne den Fall inhaltlich zu kennen?
Wenn ja — die Frage ist zu abstrakt und muss konkretisiert werden.

**Eine gute M2-Frage muss mindestens eines leisten:**
- fachlichen Kontext klären
- konkrete Unsicherheit reduzieren
- fehlende Begründung sichtbar machen
- echte Handlung vorbereiten

**Schlechte Richtung** — fragt nur, ob etwas formal vorhanden ist:

| Schlecht | Warum |
|---|---|
| „Sind Nachweise vorhanden?" | Beantwortet nichts über den Inhalt des Falles |
| „Ist die externe Stelle dokumentiert?" | Kann mit Ja beantwortet werden ohne Fallkenntnis |
| „Ist der Prüfzeitraum erfasst?" | Sagt nichts darüber, ob der Fall fachlich verstanden wurde |
| „Ist die Frist dokumentiert?" | Zu abstrakt — welche Frist, welche Konsequenz? |

**Gute Richtung** — fragt nach dem fachlichen Kern:

| Gut | Warum |
|---|---|
| „Gibt es Befunde oder Dokumentation, die erklären, warum genau dieses Medikament verordnet wurde?" | Deckt die medizinische Begründung auf |
| „Ist aus dem Bescheid klar, welche Verordnung oder Leistung beanstandet wird?" | Stellt sicher, dass der Gegenstand des Verfahrens bekannt ist |
| „Gibt es Diagnosen oder Befunde, die die beanstandete Verordnung begründen?" | Zeigt, ob eine Verteidigung möglich ist |
| „Ist bekannt, bis wann spätestens auf das Schreiben reagiert werden muss?" | Konkret handlungsrelevant, keine Abstraktion |
| „Sind Praxisbesonderheiten (z. B. besondere Patientengruppe, Schwerpunkt) dokumentiert?" | Benennt das stärkste Gegenargument im Regressfall |

### Pflichtregeln

- **Jede Frage = genau ein prüfbarer Zustand.**
  Nicht: „Sind Fristen bekannt und Unterlagen vollständig?"
  Sondern zwei getrennte Fragen.

- **Jede Frage muss direkt mit Ja / Nein / Unklar beantwortbar sein.**
  Fragen, die eine Recherche, eine Bewertung oder eine Liste als Antwort erfordern, sind unzulässig.

- **Keine W-Fragen.**
  W-Fragen (Was, Welche, Wer, Wodurch, Woraus) erzwingen eine offene Antwort. Sie gehören in den Fallkommentar, nicht in M2.

- **Keine Mehrfachfragen.**
  Erkennbar an „und", „oder" und mehreren Subjekten in einem Satz.

- **Keine Fachabkürzungen ohne kurze Erklärung.**
  LANR, RLV, QZV, GOP, CE müssen entweder ausgeschrieben oder mit einem Klammerzusatz versehen sein.
  Ausnahme: Begriffe, die im direkten Arbeitsumfeld der Praxis allgemein bekannt sind (z. B. PVS, KV).

- **Keine juristische oder abstrakte Governance-Sprache.**
  Die Frage soll den Praxisalltag abbilden, nicht eine Compliance-Prüfung simulieren.

### Verbotene Formulierungen

Die folgenden Begriffe und Konstruktionen sind in M2-Fragen nicht erlaubt:

| Verboten | Grund |
|---|---|
| „regelkonform" | juristisch, kein klares Kriterium |
| „Compliance" / „compliant" | englisch-deutsches Governance-Wort, zu abstrakt |
| „belastbar" | juristischer Qualitätsbegriff ohne konkreten Prüfpunkt |
| „ableitbar" | logische Schlussfolgerung, kein prüfbarer Zustand |
| „maßgeblich" | formal-juristisch, unklar für Backoffice |
| „sichergestellt" | ohne konkretes Kriterium nicht beantwortbar |
| „Existiert …?" | Softwaresprache, klingt nach Systemprüfung |
| „Wurde bewertet …?" | Bewertung ist keine abgeschlossene Handlung, die man ablesen kann |

### Schlechte Beispiele

Fragen aus dem Officepfad, die gegen die Regeln verstoßen:

1. **„Liegt ein belastbarer Verfahrensstand vor, aus dem die Genehmigungsfaehigkeit ableitbar ist?"**
   Problem: „belastbar", „ableitbar", „Genehmigungsfaehigkeit" — drei abstrakte Begriffe in einer Frage. Kein Ja/Nein möglich.

2. **„Ist belastbar nachgewiesen, dass die Berufspflichten-Compliance fuer die Taetigkeitsaufnahme gesichert ist?"**
   Problem: „Berufspflichten-Compliance", „Taetigkeitsaufnahme", „sichergestellt" — juristisch, unverständlich für MFA.

3. **„Liegt eine Plausibilitätsmaßnahme vor?"**
   Problem: KV-Fachbegriff, den nur Abrechnungsexperten kennen. MFA kann nicht Ja/Nein antworten ohne zu wissen, was gemeint ist.

4. **„Gibt es auffällige Quartalszeitwerte?"**
   Problem: „Quartalszeitwerte" ist ein technischer KV-Abrechnungsbegriff ohne Alltagsbedeutung.

5. **„Existiert eine Erinnerungsfunktion?"**
   Problem: Klingt nach Software-Feature-Test. Wer oder was soll erinnert werden? Woran? Unklar.

### Gute Beispiele

Fragen aus dem Officepfad, die die Regeln einhalten:

1. **„Ist die Approbation mit gueltigem Stand dokumentiert?"**
   Konkret, ein Zustand, sofort mit Ja/Nein beantwortbar.

2. **„Ist die Stellungnahmefrist intern hinterlegt?"**
   Klar: Ja = Frist steht irgendwo. Nein = nicht gefunden. Kein Interpretationsspielraum.

3. **„Liegen alle fuer die Einreichung benoetigten Nachweise vollstaendig vor?"**
   Leicht lang, aber konkret handlungsbezogen — MFA weiß genau, was geprüft werden soll.

4. **„Ist eine externe Bestaetigung durch KV Berlin oder Aerztekammer erforderlich?"**
   Benennt die zuständige Stelle explizit. Kein Abstrakt-Begriff. Ja/Nein eindeutig.

5. **„Ist das Regelleistungsvolumen (RLV) fuer das Quartal geprueft?"**
   Abkürzung vorhanden, aber mit Klammererklärung — ausreichend verständlich auch ohne KV-Vorwissen.


Klarstellung:
- BLOCKER beschreibt eine blockierende Bearbeitungsluecke.
- GATEKEEPER beschreibt einen harten fachlichen Stopp.
- RISIKO beschreibt ein relevantes, aber nicht zwingend sofort blockierendes Risiko.

Begriffsklarheit deutsch/englisch:
- RISIKO ist der fachliche Begriff in dieser Dokumentation.
- RISK ist der technische Enum-Wert in der Runtime.

Diese Begriffe gehoeren zur Wirkungsebene (failureEffect), nicht zur Informationsebene (checkpointType).

## 4) Zielmodell: stabile Informationsklassen (checkpointType)

Einordnung zum Runtime-Stand:
- Die folgenden Klassen sind das fachliche Zielmodell.
- In der aktuellen Runtime sind sie noch nicht in allen Checkpoints vollstaendig explizit verdrahtet.
- Es existieren weiterhin Uebergangs-/Fallback-Befuellungen.

### NACHWEIS_PFLICHT
Definition:
- Eine fachliche Aussage ist nur mit belastbarem Nachweis tragfaehig.

Typische Quelle:
- Interne Dokumentenablage, Kammer-/Behoerdenunterlagen, verifizierte Bescheinigungen.

Typische Evidenz:
- Urkunde, Bescheinigung, Police, offizieller Auszug, gueltiger Nachweisstand.

Typische Beispiele (Praxis/MVZ):
- Approbationsnachweis liegt gueltig vor.
- Berufshaftpflicht ist nachgewiesen.
- Fortbildungsnachweise sind dokumentiert.

### EXTERNE_BESTAETIGUNG
Definition:
- Die Aussage benoetigt eine verbindliche Bestaetigung von ausserhalb der eigenen Organisation.

Typische Quelle:
- KV, Zulassungsausschuss, Aerztekammer, Behoerden, externer Kostentraeger.

Typische Evidenz:
- Schriftliche Rueckmeldung, Bescheid, Registereintrag, dokumentierte Auskunft einer externen Stelle.

Typische Beispiele (Praxis/MVZ):
- Genehmigungsstatus ist extern bestaetigt.
- Zustaendige externe Stelle ist verbindlich geklaert.
- Meldeweg wurde extern abgestimmt.

### INTERNE_ENTSCHEIDUNG
Definition:
- Die Aussage basiert auf einer verbindlichen internen Festlegung der Praxis/MVZ-Organisation.

Typische Quelle:
- Praxisleitung, Geschaeftsfuehrung, intern freigegebene Entscheidung.

Typische Evidenz:
- Protokollierte Entscheidung, interne Freigabe, dokumentierte Verantwortungszuweisung.

Typische Beispiele (Praxis/MVZ):
- Vorgehen zur Rueckmeldung ist entschieden.
- Verantwortlichkeit fuer den Fall ist festgelegt.
- Reihenfolge der Verfahrensschritte ist intern freigegeben.

### REGEL_PARAMETER
Definition:
- Die Aussage prueft, ob ein fachlicher Parameter, eine Pflicht oder eine Frist regelkonform erfuellt ist.

Typische Quelle:
- Gesetzliche/regulatorische Vorgaben, interne Compliance-Regeln, Verfahrensvorgaben.

Typische Evidenz:
- Fristenstatus, formale Vorgaben, dokumentierte Regelpruefung, Parameterwerte.

Typische Beispiele (Praxis/MVZ):
- Frist und Formvorgaben sind geprueft.
- Meldepflichten und Einreichungsregeln sind geprueft.
- Taetigkeitsumfang entspricht den relevanten Rahmenbedingungen.

### VERFAHRENSWEG
Definition:
- Die Aussage betrifft Reihenfolge und Struktur eines formalen Bearbeitungswegs.

Typische Quelle:
- Verfahrensleitfaden, externe Vorgaben zum Ablauf, abgestimmte Prozessroute.

Typische Evidenz:
- Dokumentierter Ablaufpfad, nachvollziehbare Schrittfolge, belegte Zustandsuebergaenge im Verfahren.

Typische Beispiele (Praxis/MVZ):
- Antragsweg ist eindeutig festgelegt.
- Kommunikationsweg zur externen Stelle ist definiert.

### KONTEXT_INFORMATION
Definition:
- Die Aussage liefert fachlichen Kontext, der Einordnung und Verstaendnis verbessert.

Typische Quelle:
- Falldarstellung, Anlassbeschreibung, Organisationskontext.

Typische Evidenz:
- Dokumentierte Ausgangslage, betroffener Zeitraum, betroffene Einheit.

Typische Beispiele (Praxis/MVZ):
- Anlass und gepruefter Zeitraum sind dokumentiert.
- Betroffene Leistungen oder Rollen sind benannt.
- Antragstyp und Zielbild sind beschrieben.

## 5) Definition der failureEffects

Einordnung zum Runtime-Stand:
- Die failureEffects sind fachlich definiert.
- Die technische Wirkung im Laufzeitverhalten ist derzeit noch nicht vollstaendig als automatische Steuerlogik umgesetzt.

### NONE
Fachliche Bedeutung:
- Ein Defizit ist primaer Informationsluecke ohne unmittelbare Stop- oder Hochrisikowirkung.

Typische Konsequenz:
- Nachdokumentation oder Klarstellung im regulaeren Verlauf.

Beispiele:
- Kontext ist unpraezise, der Fall kann aber geordnet weiterbearbeitet werden.

### RISK
Fachliche Bedeutung:
- Ein Defizit erzeugt ein relevantes Risiko (z. B. dokumentations-, frist-, regress- oder haftungsbezogen).

Typische Konsequenz:
- Sichtbare Risikodokumentation, priorisierte Nachverfolgung, ggf. Management-Hinweis.

Beispiele:
- Haftungsnachweis ist unklar.
- Regressrelevante Einschaetzung ist nicht belastbar.
- Fristnahe Pflicht ist nicht sauber abgesichert.

### BLOCKER
Fachliche Bedeutung:
- Ein Defizit blockiert die sachgerechte Weiterbearbeitung, ist aber prinzipiell aufloesbar.

Typische Konsequenz:
- Bearbeitung wird bis Klaerung angehalten oder auf wartend gesetzt.

Beispiele:
- Externe Zustaendigkeit ist ungeklaert.
- Pflichtunterlagen fehlen.
- Frist-/Formvorgaben sind nicht geprueft.

### GATEKEEPER
Fachliche Bedeutung:
- Ein Defizit fuehrt zu einem harten fachlichen Stopp des Falls.

Typische Konsequenz:
- Keine Fortfuehrung in der Sache, bis eine grundlegende Zulassungsvoraussetzung erfuellt ist.

Runtime-Stand heute:
- GATEKEEPER ist derzeit vor allem fachliche Bewertungssemantik.
- Eine automatische Runtime-Sperre fuer den gesamten Fall ist aktuell noch nicht durchgaengig implementiert.

Beispiele:
- Keine gueltige Approbation fuer taetigkeitsrelevante Rolle.
- Kernvoraussetzung fuer die fachliche Zulaessigkeit ist nicht erfuellt.

## 6) Klare Abgrenzungen

### BLOCKER vs GATEKEEPER
- BLOCKER: Bearbeitung ist blockiert, aber durch Nachreichen/Klaerung regulaer wieder aufnehmbar.
- GATEKEEPER: Der Fall darf fachlich nicht fortgesetzt werden, solange die Grundvoraussetzung fehlt.

### RISK vs BLOCKER
- RISK: Risiko ist hoch oder relevant, Bearbeitung kann jedoch unter Sichtbarkeit/Steuerung weiterlaufen.
- BLOCKER: Bearbeitung kann nicht sinnvoll weiterlaufen, bis die Luecke geschlossen ist.

### KONTEXT_INFORMATION vs REGEL_PARAMETER
- KONTEXT_INFORMATION: Beschreibt Ausgangslage und Einordnung.
- REGEL_PARAMETER: Prueft konkrete Regel-/Frist-/Parameterkonformitaet.

### EXTERNE_BESTAETIGUNG vs NACHWEIS_PFLICHT
- EXTERNE_BESTAETIGUNG: Verbindlichkeit entsteht durch Rueckmeldung einer externen Stelle.
- NACHWEIS_PFLICHT: Verbindlichkeit entsteht durch belastbaren Nachweis, der intern vorliegen und geprueft sein muss.

## 7) Prinzipien fuer M2

M2 dient nur der Vorbereitung.

Prinzipien:
- M2 erhebt nur einfache Vorabklaerung.
- M2-Antworten sind strikt JA/NEIN/UNKLAR.
- M2 ist kein Formularsystem.
- M2 enthaelt keine Freitextpflicht als Kernlogik.
- M2 bildet keine juristischen Konstruktionen.
- Nicht jeder Checkpoint braucht M2.

Runtime-Stand heute:
- Technisch koennen aktuell zusaetzliche strukturierte Felder mitgefuehrt werden.
- Diese Felder gehoeren nicht zur langfristigen M2-Kernlogik und sind als Uebergangsrealitaet zu lesen.
- Die aktuelle Runtime/Testlage erwartet derzeit fuer viele Themen noch eine flaechendeckende M2-Fragenabdeckung.

Zielbild:
- M2 reduziert Rueckfragen in M3, ersetzt M3 aber nicht.

## 8) Prinzipien fuer M3

M3 ist die sichtbare Governance-Ebene.

Prinzipien:
- Risiken muessen nachvollziehbar und eindeutig sichtbar sein.
- Pflichten muessen nachvollziehbar und eindeutig sichtbar sein.
- Entscheidungen muessen fachlich begruendet und auditierbar sein.
- Sprache bleibt fachlich aus Praxis-/Backoffice-Perspektive.
- Keine Backend-, Pipeline- oder Workflow-Engine-Sprache in der Fachdarstellung.

Einordnung zum Runtime-Stand:
- Diese Prinzipien sind fachlich leitend.
- Die Runtime setzt davon bereits Teile um, bildet aber noch nicht alle Governance-Wirkungen automatisch als Steuerlogik ab.

## 9) Was ausdruecklich NICHT gebaut werden soll

Nicht-Ziele dieses Modells:
- Keine generische Workflow-Engine.
- Kein allgemeines Formularsystem.
- Keine technische State-Maschine als fachliche Hauptabstraktion.
- Keine versteckte Backend-Logik, die fachliche Entscheidungen implizit trifft.
- Keine Verschiebung von Governance-Entscheidungen in intransparente technische Regeln.

## 10) Bewusst instabile/offene Teile der Typologie

Die folgende Ebene ist derzeit bewusst offen und soll iterativ fachlich geschaerft werden:
- Feingranulare Zuordnung einzelner Checkpoints zu checkpointType/failureEffect in allen Themenclustern.
- Einheitliche Schwellenwerte fuer den Uebergang zwischen RISK und BLOCKER in grenznahen Faellen.
- Einheitliche Kriterien, wann EXTERNE_BESTAETIGUNG zwingend ist und wann NACHWEIS_PFLICHT ausreicht.
- Einheitliche outcomeAudience-Profile pro Checkpoint-Familie.

Relativ stabil bleibt dabei:
- Die Grundtrennung zwischen Informationstyp (checkpointType), Wirkung (failureEffect) und optionaler Prozesssteuerung.
- Das Prinzip der atomaren Checkpoints.
- Die fachliche Lesbarkeit aus Sicht Praxisinhaber, Backoffice und Governance.

Wichtig:
- Diese Stabilitaet beschreibt primär das fachliche Modell.
- Sie bedeutet nicht, dass jede Zielaussage bereits vollstaendig in Runtime-Logik umgesetzt ist.

## HR-GOV-Aggregationsbegriffe (aktueller Stand)

HR-GOV-A bis HR-GOV-D werden aktuell als Aggregations- bzw. Verdichtungsbegriffe genutzt.
Sie stehen neben den NC-Checkpoints und werden derzeit außerhalb des primären NC-Katalogs verwendet.

Der primäre NC-Katalog liegt in [lib/office/checkpointCatalog.ts](lib/office/checkpointCatalog.ts).
Die HR-GOV-Logik ist im aktuellen Stand in [lib/office/hrGovernance.ts](lib/office/hrGovernance.ts) abgebildet.
Begleitende Frage-/Zuordnungsstrukturen liegen in [lib/office/m2Questions.ts](lib/office/m2Questions.ts).

### Einordnung der vier Begriffe

- HR-GOV-A: AND-artige Verdichtung mehrerer berufsrechtlicher Teilaspekte.
- HR-GOV-B: derzeit eher 1:1-View bzw. leichte Verdichtung eines Zulassungs-/Statusaspekts.
- HR-GOV-C: derzeit eher 1:1-View bzw. leichte Verdichtung eines Strukturaspekts.
- HR-GOV-D: derzeit eher 1:1-View bzw. leichte Verdichtung eines Compliance-/Pflichtaspekts.

### Wichtige fachliche Klarstellung

- Die aktuelle Form ist als Arbeitsstand zu lesen, nicht als finale Modellentscheidung.
- Aus der aktuellen Verwendung folgt keine endgültige Architekturfestlegung.
- Die langfristige Modellierung von HR-GOV-Begriffen bleibt offen.
- Eine spätere explizite Aggregations- oder View-Klasse ist möglich, aber derzeit nicht festgelegt.
- Es wird in diesem Schritt keine technische Ableitung oder neue Laufzeitregel eingeführt.
- Es wird in diesem Schritt keine zusätzliche Achse, kein neuer Enum-Wert und kein neues Checkpoint-Schema beschlossen.

### Zweck dieses Abschnitts

- Transparenz über den aktuellen Nutzungsstand von HR-GOV-A bis HR-GOV-D.
- Trennung zwischen aktuellem Ist-Stand und späterer Zielmodell-Entscheidung.
- Dokumentation ohne Vorgriff auf Runtime- oder Datenstrukturänderungen.
