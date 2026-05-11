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
