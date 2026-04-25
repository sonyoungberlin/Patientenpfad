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

## 7. M1–M5-Flow

### M1
Anliegen auswählen.

### M2
Alle gebundenen Checkpoints dedupliziert abfragen.

### M3
Pro Anliegen Entscheidung treffen.
Globale Checkpoints liefern Kontext / Prefill.

### M4
Antwortabschnitte bilden:
- pro Anliegen ein Abschnitt
- Entscheidung + relevante Erklärungen

### M5
Gemeinsame Wege / Sammelhinweise unten einmal ausgeben.
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

## 12. AU-Beispiel

AU:
- decision: AU_DECISION
- specific:
  - AU_BACKDATE_ALLOWED
  - AU_DURATION_ALLOWED
  - AU_PATIENT_KNOWN
- boundGlobals:
  - IN_GERMANY
  - DOCTOR_ASSESSMENT_REQUIRED
- actions:
  - DIGITAL_REQUEST
  - ONLINE_ANAMNESIS
  - BOOK_APPOINTMENT

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
