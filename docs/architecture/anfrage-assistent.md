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

## 4. Grundprinzip: Keine automatische Entscheidung

**Der Anfrage-Assistent trifft keine fachliche Entscheidung automatisch.**

M2-Fragen (spezifische Checkpoints) dienen ausschließlich als strukturierte Entscheidungshilfe
und als Prefill für M3.
Die Entscheidung (möglich / nicht möglich / deaktiviert) bleibt immer manuell in M3.

Dieses Prinzip gilt für alle Anliegen: AU, Rezept, Labor und alle zukünftigen Anliegen.

## 5. Checkpoint-Arten (Details)

### DECISION
- themengebunden
- erzeugt Hauptsatz
- Status: möglich / nicht möglich / deaktiviert
- M2-Klärungsfragen zu diesem Checkpoint sind nur interne Entscheidungshilfe / Prefill.
  Sie lösen selbst nichts aus.
- Die Entscheidung (möglich / nicht möglich) wird manuell in M3 getroffen.

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

## 6. Scope

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

Semantik eines globalen Checkpoints:
- Er ist eine einmalige Frage in M2 (reiner Schalter: ja / nein).
- Er erzeugt selbst keinen Antworttext.
- Der Hinweistext bei „ja" ist im jeweiligen Anliegen-Profil definiert, nicht im Checkpoint.
- Derselbe globale Checkpoint kann bei AU einen anderen Hinweis auslösen als bei Rezept.
- Ist kein Anliegen ausgewählt, das diesen Checkpoint bindet, wird er nicht abgefragt.

## 7. Binding-Regel
Jedes Anliegen definiert:
- decisionCheckpoint
- boundGlobalCheckpointIds
- specificCheckpointIds
- availableActions
- globalHints: pro gebundenem globalem Checkpoint ein anliegenspezifischer Hinweistext,
  der sichtbar wird, wenn der globale Checkpoint mit „ja" beantwortet wurde

Wenn mehrere Anliegen denselben globalen Checkpoint binden, erscheint er in M2 nur einmal.

## 8. M1–M5-Flow

### M1
Anliegen auswählen.

### M2
Alle gebundenen Checkpoints dedupliziert abfragen.

Für jeden gebundenen **globalen** Checkpoint: genau eine Ja/Nein-Frage (Schalter).
Für jeden **spezifischen** Checkpoint: Klärungsfragen als Entscheidungshilfe / Prefill für M3.

### M3
Pro Anliegen Entscheidung treffen (Decision-Checkpoint: möglich / nicht möglich / deaktiviert).
Spezifische Klärungsfragen aus M2 dienen als Entscheidungshilfe / Prefill.
Globale Checkpoints sind zu diesem Zeitpunkt bereits durch M2 beantwortet;
sie wirken im Output als Schalter und werden in M3 nicht erneut entschieden.
Allgemeine Hinweise / Multi-Checkpoints können in M3 manuell zugeschaltet werden.

### M4
Antwortabschnitte bilden:
- pro Anliegen ein Abschnitt: Hauptentscheidung + anliegenspezifische Hinweise
  (inkl. Hinweise aus gebundenen globalen Checkpoints, falls „ja" beantwortet)
- danach einmalig: allgemeine Hinweise / Wege (SHARED_BOTTOM, keine Dopplungen)

### M5
Gemeinsame Wege / Sammelhinweise unten einmal ausgeben.
Dokumentation erzeugen.

## 9. Placement

### ATTACHED
Baustein hängt am jeweiligen Anliegen-Abschnitt.

### SHARED_BOTTOM
Baustein wird einmal unten in der Nachricht gesammelt.

Regel:
- Entscheidungen und Erklärungen meist ATTACHED
- Wege und Sammelhinweise meist SHARED_BOTTOM

## 10. Allgemeine Hinweise / Multi-Checkpoints

Allgemeine Hinweise sind unabhängig von einzelnen Anliegen.
Sie erscheinen einmalig global am Ende der Antwort (SHARED_BOTTOM).
Sie sind nicht Teil der anliegenspezifischen Entscheidungslogik.
Sie werden manuell in M3 zugeschaltet.
Beispiele: allgemeine Wege (Termin buchen, digitale Anfrage), sammelhinweise.

## 11. Deduplizierung
Globale Checkpoints werden nur einmal abgefragt.
SHARED_BOTTOM-Bausteine werden nur einmal ausgegeben.
Eine Ursache soll nicht mehrfach erklärt werden.

## 12. Ja/Nein-Logik
Standard-Checkpoints sollen möglichst als Ja/Nein/Unklar formuliert werden.
Keine unnötigen Auswahlfelder, wenn mehrere Antworten dieselbe Konsequenz haben.

Beispiel:
Nicht: GKV / privat / ausländisch
Sondern: eGK vorhanden? ja/nein/unklar
Nein → Identitäts- oder Versicherungsnachweis nachreichen.

## 13. Textregel
Jeder Checkpoint-Text muss für sich alleine verständlich sein.
Keine Formulierungen wie:
- „auch"
- „dann"
- „danach"
wenn sie einen vorherigen Satz voraussetzen.

## 14. AU-Beispiel

AU:
- decision: AU_DECISION
  - questions (Klärungsfragen / Sammelinfos, keine eigenständigen Checkpoints):
    - Soll die AU rückwirkend ausgestellt werden?
    - Welchen Zeitraum soll die AU umfassen?
    - Handelt es sich um eine Wiederholung ohne neue Untersuchung?
- specific: (keine)
- boundGlobals:
  - IS_NEW_PATIENT
  - PATIENT_NOT_IN_GERMANY
  - DOCTOR_REVIEW_REQUIRED
  - DATA_INCOMPLETE
- actions:
  - DIGITAL_REQUEST
  - ONLINE_ANAMNESIS
  - BOOK_APPOINTMENT
  - OPEN_CONSULTATION

**Begründung:** Rückdatierung, Dauer und wiederholte digitale AU werden fachlich nicht als
eigenständige entscheidbare Checkpoints modelliert. Sie erscheinen stattdessen als
Klärungsfragen (`questions`) am `AU_DECISION`-Checkpoint. Zur Modellierung von Klärungsfragen
als Fragenblock ohne eigenen Entscheidungsstatus → siehe Abschnitt 18.

## 15. Rezept-Beispiel (Platzhalter)

> **Hinweis:** Die Checkpoint-IDs dieses Beispiels entsprechen dem implementierten Stand.

Rezept:
- decision: PRESCRIPTION_DECISION
- specific:
  - PRESCRIPTION_KNOWN_MEDICATION
  - PRESCRIPTION_FOLLOW_UP
  - PRESCRIPTION_SPECIALIST_REQUIRED
  - PRESCRIPTION_CONTROL_OVERDUE
  - PRESCRIPTION_SPECIAL_TYPE
- boundGlobals:
  - IS_NEW_PATIENT
  - PATIENT_NOT_IN_GERMANY
  - DOCTOR_REVIEW_REQUIRED
  - DATA_INCOMPLETE
  - IS_CHRONIC_PATIENT
- actions:
  - DIGITAL_REQUEST
  - ONLINE_ANAMNESIS
  - BOOK_APPOINTMENT
  - OPEN_CONSULTATION

## 16. Labor-Beispiel

Labor (LAB):
- decision: LAB_DECISION
- specific:
  - LAB_MEDICAL_INDICATION
  - LAB_CHECKUP_ELIGIBLE
  - LAB_VALUES_DEFINED
  - LAB_FASTING_REQUIRED
- boundGlobals:
  - IS_NEW_PATIENT
  - PATIENT_NOT_IN_GERMANY
  - DOCTOR_REVIEW_REQUIRED
  - DATA_INCOMPLETE
  - IS_CHRONIC_PATIENT
- actions:
  - ONLINE_ANAMNESIS
  - BOOK_APPOINTMENT
  - OPEN_CONSULTATION

### Semantische Abgrenzung: LAB_MEDICAL_INDICATION vs. DOCTOR_REVIEW_REQUIRED

`LAB_MEDICAL_INDICATION` (SPECIFIC) klärt den **Anlass / Kontext** für die Laboranforderung:
warum Labor gewünscht oder sinnvoll sein könnte (Beschwerden, Routinekontrolle,
externe Überweisung, Wunschleistung). Es ist ein reiner Kontext-Checkpoint.

`DOCTOR_REVIEW_REQUIRED` (GLOBAL) ist ein **Freigabe-Schalter**:
bedeutet, dass vor Terminvergabe oder Laboranforderung erst eine ärztliche
Klärung stattfinden muss. Er ist unabhängig davon, ob bereits ein Anlass vorliegt.

Beide Checkpoints können gleichzeitig aktiv sein: ein Anlass liegt vor
(LAB_MEDICAL_INDICATION = YES), aber vor Weiterbearbeitung ist trotzdem
ärztliche Klärung notwendig (DOCTOR_REVIEW_REQUIRED = YES).
Das ist kein Widerspruch – SPECIFIC-Kontext und GLOBAL-Schalter haben verschiedene Rollen.

## 17. Noch offen
- genaue Texte werden später geschliffen
- zunächst zählt Architektur / Schnitt
- Testumgebung bleibt stateless, bis der Schnitt stabil ist

---

## 18. SPECIFIC Explanation Checkpoint

### Definition

Ein **spezifischer Erklärungs-Checkpoint** ist ein anliegenspezifischer Checkpoint, der
keine Hauptentscheidung trifft, sondern eine fachliche Regel oder Tatsache abbildet und –
falls relevant – eine neutrale Erklärung im Antworttext erzeugt.

### Eigenschaften

#### 1. Zugehörigkeit
- Gehört immer genau zu einem Anliegen (z. B. AU, Rezept, Labor)

#### 2. Keine Entscheidungsautomatik
- Steht nicht in direkter Abhängigkeit zur Hauptentscheidung
- Darf keine automatische Entscheidung auslösen
- Unterstützt nur den menschlichen Entscheidungsprozess

#### 3. M2 (Denken / Sammlung)
- Wird in M2 abgefragt
- Wird dort aktiv gesetzt (z. B. Ja/Nein)
- Ist Teil des Sammel- und Denkprozesses

#### 4. M3 (Entscheidung)
- Wird als vorausgefüllter Status angezeigt (Prefill)
- Kann dort bei Bedarf geändert werden
- Ist kein primärer Entscheidungs-Checkpoint

#### 5. M4 (Antwort)
- Kann eine neutrale Erklärung ausgeben
- Erklärung darf keine Rechtfertigung oder Argumentation enthalten
- Keine Formulierungen wie „trotzdem", „deshalb", „weil du …"
- Muss unabhängig von der Hauptentscheidung funktionieren

#### 6. M5 (Dokumentation)
- Liefert eine kurze Dokumentation, wenn der Checkpoint relevant ist

#### 7. Bewusst stille Zustände
- Jeder Status muss bewusst definiert sein:
  - entweder mit Erklärung
  - oder explizit „keine Erklärung notwendig"
- Stille darf nicht durch fehlende Texte entstehen

### Merksatz
- **Decision-Checkpoint** entscheidet
- **Explanation-Checkpoint** erklärt
- **Global-Checkpoint** beschreibt eine fallbezogene Tatsache

### Abgrenzung zu Klärungsfragen (`questions`) am Decision-Checkpoint

Wenn fachliche Aspekte (z. B. Rückdatierung, Dauer, Wiederholung) ausschließlich als
Klärungshilfe für die Hauptentscheidung dienen und **keinen eigenen Ausgabetext** in M4
erzeugen sollen, werden sie nicht als Explanation-Checkpoints modelliert, sondern als
`questions`-Fragenblock direkt am Decision-Checkpoint.

Beispiel: `AU_DECISION` trägt die Fragen zu Rückdatierung, Dauer und Wiederholung als
`questions`-Array. Sie erscheinen in M2 als Sammelblock und in M3 als Kontext –
ohne eigenständigen Status oder M4-Output.

Ein SPECIFIC Explanation Checkpoint ist nur dann angemessen, wenn er:
- einen eigenen fachlichen Status hat (YES / NO / UNKNOWN), der bewusst gesetzt wird, **und**
- einen eigenen, anliegenspezifischen Ausgabetext in M4 erzeugen kann.

→ Zur Implementierung: `InquiryCheckpoint` in `lib/inquiries/types.ts`
