# Anfrage-Assistent – Architekturregeln

## 1. Zweck
Der Anfrage-Assistent beantwortet Praxisanfragen strukturiert.
Er erzeugt:
- Antworttext für Patient / Kontaktperson
- kurze Dokumentation fürs Krankenblatt

Keine freie KI-Generierung im Runtime-Pfad.

## 2. Grundprinzip
Eine Antwort besteht aus:
1. Entscheidung: Geht das Anliegen grundsätzlich?
2. Erklärung: Warum / warum nicht / unter welcher Bedingung?
3. Weg: Wie geht es weiter?

## 3. Anliegen / Block
Ein Anliegen ist z. B.:
- AU
- Rezept
- Impfung
- Wundversorgung

Das Anliegen trägt die konkrete Hauptfrage.

## 4. Checkpoint-Arten

### DECISION
- themengebunden
- erzeugt Hauptsatz
- Status: möglich / nicht möglich / deaktiviert

### EXPLANATION
- erklärt Ursache oder Bedingung
- kann spezifisch oder global sein
- Status: ja / nein / unklar

### ACTION / WAY
- beschreibt nächsten Schritt
- z. B. digitale Anfrage, Termin buchen, Bericht hochladen
- Status: aktiv / inaktiv

### PREPARATION / COLLECT
- sammelt Mitbring- oder Vorbereitungshinweise
- z. B. Impfpass, Gesundheitskarte, Befund
- Status: aktiv / inaktiv oder Auswahl mehrerer Items

## 5. Scope

### SPECIFIC
Checkpoint gehört nur zu einem Anliegen.
Beispiele:
- AU-Rückdatierung
- Rezeptart Kassenrezept / Privatrezept
- BtM-Rezept
- Pille / gynäkologische Verordnung

### GLOBAL
Checkpoint ist wiederverwendbar, aber nicht immer aktiv.
Er wird durch Anliegen gebunden.
Beispiele:
- Patient im Ausland
- ärztliche Vorstellung erforderlich
- Daten unvollständig
- Bericht hochladen
- Termin buchen

Wichtig:
GLOBAL bedeutet nicht „immer anzeigen".
GLOBAL bedeutet „wiederverwendbar".

## 6. Binding-Regel
Jedes Anliegen definiert:
- decisionCheckpoint
- boundGlobalCheckpointIds
- specificCheckpointIds
- availableActions

Wenn mehrere Anliegen denselben globalen Checkpoint binden, erscheint er in M2 nur einmal.

## 7. M2-Facts vs. M3-OutputBlocks (Kerntrennung)

### Regel
M2-Facts sammeln Informationen. Sie erzeugen **keinen** Patiententext.
M3-OutputBlocks erzeugen Patiententext. Sie werden vom Arzt/MFA explizit gewählt.

### InquiryFact (M2)
- id, label, scope
- Status: YES / NO / UNKNOWN
- Kein `text`-Feld
- Dienen als Kontext/Prefill für M3-Entscheidung
- Beispiele: AU_BACKDATE_IN_RANGE, AU_PATIENT_KNOWN, IN_GERMANY

### InquiryOutputBlock (M3)
- id, label, kind, scope, placement, text, docText?
- Werden explizit vom Arzt/MFA ausgewählt
- Placement: ATTACHED (am Anliegen) oder SHARED_BOTTOM (einmal unten)
- Beispiele: AU_DECISION_POSSIBLE, AU_REASON_TOO_LATE, BOOK_APPOINTMENT

## 8. M1–M5-Flow

### M1
Anliegen auswählen.

### M2
Alle gebundenen Facts (specificFactIds + boundGlobalFactIds) dedupliziert abfragen.
Facts sind Ja/Nein/Unklar.
Sie liefern Kontext – kein Patiententext.

### M3
Pro Anliegen:
1. Entscheidung treffen (möglich / nicht möglich → wählt Entscheidungs-OutputBlock).
2. Relevante Begründungs-/Info-OutputBlocks manuell auswählen (ATTACHED).
3. Aktions-OutputBlocks auswählen (SHARED_BOTTOM).

M2-Facts dienen als Prefill/Kontext für M3-Auswahl, erscheinen aber nicht im Antworttext.

### M4
Antwortabschnitte bilden:
- pro Anliegen ein Abschnitt
- Entscheidungs-OutputBlock + gewählte ATTACHED-OutputBlocks

### M5
Gewählte SHARED_BOTTOM-OutputBlocks einmal unten ausgeben (dedupliziert).
Dokumentation erzeugen.

## 8. Placement

### ATTACHED
Baustein hängt am jeweiligen Anliegen-Abschnitt.

### SHARED_BOTTOM
Baustein wird einmal unten in der Nachricht gesammelt.

Regel:
- Entscheidungen und Erklärungen meist ATTACHED
- Wege und Sammelhinweise meist SHARED_BOTTOM

## 9. Deduplizierung
Globale Checkpoints werden nur einmal abgefragt.
SHARED_BOTTOM-Bausteine werden nur einmal ausgegeben.
Eine Ursache soll nicht mehrfach erklärt werden.

## 10. Ja/Nein-Logik
Standard-Checkpoints sollen möglichst als Ja/Nein/Unklar formuliert werden.
Keine unnötigen Auswahlfelder, wenn mehrere Antworten dieselbe Konsequenz haben.

Beispiel:
Nicht: GKV / privat / ausländisch
Sondern: eGK vorhanden? ja/nein/unklar
Nein → Identitäts- oder Versicherungsnachweis nachreichen.

## 11. Textregel
Jeder Checkpoint-Text muss für sich alleine verständlich sein.
Keine Formulierungen wie:
- „auch"
- „dann"
- „danach"
wenn sie einen vorherigen Satz voraussetzen.

## 13. AU-Beispiel (M2/M3-Schnitt)

AU:
- specificFacts:
  - AU_BACKDATE_IN_RANGE
  - AU_DURATION_IN_RANGE
  - AU_PATIENT_KNOWN
- boundGlobalFacts:
  - IN_GERMANY
  - DOCTOR_ASSESSMENT_CONTEXT
- decisionOutputBlocks:
  - AU_DECISION_POSSIBLE
  - AU_DECISION_NOT_POSSIBLE
- availableOutputBlocks (ATTACHED):
  - AU_REASON_TOO_LATE
  - AU_REASON_ABROAD
  - AU_REASON_DOCTOR_REQUIRED
  - AU_INFO_KNOWN_PATIENT_5_DAYS
  - AU_INFO_NEW_PATIENT_3_DAYS
- availableActions (SHARED_BOTTOM):
  - DIGITAL_REQUEST
  - ONLINE_ANAMNESIS
  - BOOK_APPOINTMENT

Beispielausgabe – AU nicht möglich + Ausland-Begründung + Termin buchen:
> Eine Arbeitsunfähigkeitsbescheinigung kann nicht ausgestellt werden.
> Bestimmte Leistungen können wir nur durchführen, wenn sich die Person in Deutschland befindet.
> —
> Termine können über den Online-Kalender vereinbart werden.

## 13. Rezept-Beispiel

Rezept:
- decision: PRESCRIPTION_DECISION
- specific:
  - PRESCRIPTION_TYPE
  - PRESCRIPTION_MEDICATION_DOCUMENTED
  - PRESCRIPTION_LONG_TERM_MEDICATION
  - PRESCRIPTION_CONTROL_REQUIRED
  - PRESCRIPTION_BTM
  - PRESCRIPTION_GYN_MEDICATION
- boundGlobals:
  - DOCTOR_ASSESSMENT_REQUIRED
- actions:
  - DIGITAL_REQUEST
  - BOOK_APPOINTMENT
  - UPLOAD_REPORT
  - PICKUP_IN_PRACTICE

## 14. Noch offen
- genaue Texte werden später geschliffen
- zunächst zählt Architektur / Schnitt
- Testumgebung bleibt stateless, bis der Schnitt stabil ist
