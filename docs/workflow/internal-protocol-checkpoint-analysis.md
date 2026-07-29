# Checkpoint-Analyse: Pilotprozess „Patienten ohne Termin"

Stand: 2026-07-28  
Geltungsbereich: Architekturvalidierung – kein abgeschlossenes Produktionsdokument

> Dieses Dokument beschreibt den aktuellen Erkenntnisstand auf Basis des ersten Pilotprozesses.
> Formulierungen wie „Stand heute" oder „die Analyse deutet darauf hin" sind bewusst gewählt.
> Architekturentscheidungen gelten als vorläufig und werden durch weitere Prozesse validiert.

---

## 1. Bestehende Architektur

### 1.1 Begriffe

| Begriff | Definition | Abgrenzung |
|---|---|---|
| **Checkpoint** | Fachliche Anforderung, die in einem Prozess geklärt werden muss. Unabhängig von Formulierung und Perspektive. | ≠ Frage, ≠ UI-Gruppierung |
| **Fragenblock (M2-Block)** | Verständliche Erhebungsformulierung für einen Checkpoint. Kann je Prozess und Rolle unterschiedlich sein. | Darstellungsform des Checkpoints |
| **Visuelle Gruppierung** | UI-gebundene Zusammenfassung ohne eigenständige fachliche Bedeutung. | Kein eigenständiger Checkpoint |
| **Section** | Kombination aus OfficialRules und Questions für einen Checkpoint. Im Piloten 1:1 zur Checkpoint-ID. | Nicht dasselbe wie Checkpoint-Definition |

### 1.2 Module und ihre Checkpoint-Konzepte

| Modul | Checkpoint-Konzept | Status-Modell | Rollen-M2 | Cross-Prozess-Reuse |
|---|---|---|---|---|
| Klinische Workflows | 4 universelle IDs (WF-C01–C04), topic-übergreifend | ERKENNBAR / NICHT_ERFASST / UNKLAR | Ja: `MFA` vs. `ARZT` je Checkpoint | Vollständig: 6 Topics nutzen dieselben IDs |
| Office (Praxismanagement) | Topic-spezifische IDs (MF-01, HR-01, …) | YES / NO / OPEN | Keine (Audience: CHEF / BACKOFFICE) | Aktuell nicht vorhanden |
| Inquiries (Patientenklärung) | Profil-spezifische + globale Checkpoints | POSSIBLE / NOT_POSSIBLE / DISABLED | Audience: patient / contact_person | Globale Checkpoints (`SECTION_INTRO_*`, etc.) |
| Internal Protocol (Pilot) | 5 Section-Checkpoints (PC-C01–C05) | OPEN / CONFIRMED / NOT_APPLICABLE | Nicht vorhanden (aktuell) | Noch ein Prozess – keine belastbare Datenlage |

### 1.3 Bewährtes Muster: Klinisches Workflow-Modul

Das klinische Workflow-Modul trennt konsequent Checkpoint-Definitionen und M2-Fragen:

- `m3Checkpoints.ts`: IDs, Titel, `pointIdsByRole` (welche Process-Points zu welchem Checkpoint gehören)
- `m2Questions.ts`: separate Datei, indexiert nach `[topicId][checkpointId][role]`

```
WF-C01 „Formale Angaben"
  ├── AU-Topic / MFA:        [AU-P01..P06]
  ├── AU-Topic / ARZT:       [AU-P01..P03]
  ├── Rezept-Topic / beide:  [RZ-P01]
  └── Überweisung / beide:   [UE-P01]
```

Dieses Muster ist im Projekt etabliert und könnte künftig für das Internal Protocol Modul
relevant werden, wenn eine Rollentrennung in M2 erforderlich wird. Stand heute ist es
im Pilot noch nicht angewendet.

---

## 2. Checkpoint-Inventur

### 2.1 Klinische Workflows (`lib/workflow/m3Checkpoints.ts`)

Vier universelle Checkpoint-IDs, wiederverwendet über alle 6 Topics:

| ID | Titel | Fachliches Ziel | Wiederverwendung |
|---|---|---|---|
| WF-C01 | Formale Angaben | Formale Vollständigkeit der klinischen Dokumentation | AU, Rezept, Überweisung, Heilmittel, Hilfsmittel, Krankentransport |
| WF-C02 | Entscheidungsgrundlage | Hinreichende Grundlage für die klinische Entscheidung | Alle 6 Topics |
| WF-C03 | Verlauf und Kontext | Verlaufseinordnung im Behandlungskontext | Alle 6 Topics |
| WF-C04 | Weiteres Vorgehen | Nächster Schritt nach der Dokumentation | Alle 6 Topics |

**Bezug zum Piloten:** Die Analyse deutet darauf hin, dass diese Checkpoints auf das
klinische Falldokumentations-Szenario ausgerichtet sind. Eine direkte Übertragung auf
Prozess-Governance-Fragen erscheint nach aktuellem Kenntnisstand nicht naheliegend.
Konzeptuelle Überschneidungen auf Abstraktionsebene (z. B. „Entscheidungsgrundlage"
als Konzept) bestehen, wurden im Pilot aber eigenständig umgesetzt.

### 2.2 Office (`lib/office/checkpointCatalog.ts`, Auswahl)

Über 23 Topics mit je eigenen Checkpoint-IDs. Checkpoint-Arten: FACT, RULE, ASSESSMENT,
DECISION, SOURCE, DEPENDENCY. Aktuell keine Topic-übergreifende Wiederverwendung.

Beispiel-Topics mit fachlich angrenzenden Themen zum Piloten:

| Topic | Thema | Konzeptuelle Nähe zum Piloten |
|---|---|---|
| `arzt-anstellen-nachbesetzung` | Organisatorische Verantwortung, Einarbeitung | Entfernte Nähe zu PC-C02 (Zuständigkeit) |
| `mfa-einstellung` | Einarbeitung, Dokumentation | Entfernte Nähe zu PC-C05 (Dokumentation) |
| HR-Checkpoints allgemein | Vertretungsregelung, Zuständigkeiten | Konzeptuelle Nähe zu PC-C02 (Vertretungsregelung) |

**Bezug zum Piloten:** Stand heute konnte keine direkte 1:1-Wiederverwendung eines
Office-Checkpoints für den Piloten identifiziert werden. Es bestehen konzeptuelle
Überschneidungen (Zuständigkeit, Vertretung, Dokumentation), die künftig eine
stärkere Harmonisierung ermöglichen könnten.

### 2.3 Inquiries (`lib/inquiries/inquiryCheckpointCatalog.ts`, Auswahl)

Globale Checkpoints (scope: GLOBAL) sind als erste Form von Cross-Prozess-Reuse
im Projekt etabliert:

| Checkpoint-ID | Art | Thema | Nutzung |
|---|---|---|---|
| `SECTION_INTRO_*` (6 Stück) | ACTION / GLOBAL | Einleitungstexte für M2-Blöcke | Mehrere Profile |
| `DOCTOR_REVIEW_REQUIRED` | EXPLANATION / GLOBAL | Ärztliche Prüfung erforderlich | Mehrere Profile |
| `TERMIN_PREPARATION_REQUIRED` | ACTION / GLOBAL | Terminvorbereitung | Mehrere Profile |
| `MEDICAL_CONSULTATION_REQUIRED` | EXPLANATION / GLOBAL | Beratungsbedarf | Mehrere Profile |

**Bezug zum Piloten:** Inquiries-Checkpoints adressieren primär die patientengerichtete
Kommunikation (was antworten wir dem Patienten?). Der Pilot adressiert praxisinterne
Prozessregeln (wie handeln wir intern?). Die Klärungsziele und Zielgruppen sind
verschieden. Stand heute ist keine direkte Übertragung erkennbar.

### 2.4 Internal Protocol (`lib/workflow/internalProtocol/checkpoints.ts`)

Aktuell ein Prozess, fünf Checkpoints:

| ID | Titel | Fragen gesamt | davon required |
|---|---|---|---|
| PC-C01 | Geltungsbereich | 3 | 2 |
| PC-C02 | Zuständigkeit und Entscheidungsbefugnis | 4 | 4 |
| PC-C03 | Standardablauf | 3 | 3 |
| PC-C04 | Ausnahmen und Eskalation | 4 | 3 |
| PC-C05 | Dokumentation und Überprüfung | 3 | 2 |

---

## 3. Zuordnung Pilotprozess → bestehende Checkpoints

### 3.1 Methode

Für jede fachliche Anforderung des Pilotprozesses wurde geprüft: Gibt es einen
bestehenden Checkpoint – aus einem der vier Module – der diese Anforderung
direkt abdeckt?

### 3.2 Zuordnungsmatrix

| Fachliche Anforderung | Bereich | WF-Modul | Office-Modul | Inquiries-Modul | Internal Protocol |
|---|---|---|---|---|---|
| Anwendungsbereich definiert | Geltungsbereich | — | — | — | PC-C01 ✓ |
| Org. Erstaufnahme-Zuständigkeit festgelegt | Org. Verantwortung | — | Konzeptuelle Nähe | — | PC-C02 (Teil) |
| Entscheidung bei Dringlichkeitsunklarheit | Med. Verantwortung | Konzeptuelle Nähe WF-C02 | — | — | PC-C02 (Teil) |
| Zuständigkeiten schriftlich dokumentiert | QM-Governance | — | Konzeptuelle Nähe | — | PC-C02 (Teil) |
| Vertretungsregelung vorhanden | HR-Governance | — | Konzeptuelle Nähe | — | PC-C02 (Teil) |
| Informationserhebung definiert | Operativ (MFA) | Konzeptuelle Nähe WF-C01 | — | Konzeptuelle Nähe | PC-C03 (Teil) |
| Versorgungsweg / Standardmaßnahme | Prozessablauf | Konzeptuelle Nähe WF-C04 | — | — | PC-C03 (Teil) |
| Notfallerkennung | Operativ + Medizin | — | — | — | PC-C04 (Teil) |
| Eskalationsprotokoll | Operativ + Medizin | — | — | — | PC-C04 (Teil) |
| Entscheidungen dokumentiert | Dokumentation | Konzeptuelle Nähe WF-C01 | Konzeptuelle Nähe | — | PC-C03 + PC-C05 |
| Prozessüberprüfungsrhythmus | QM-Governance | — | Konzeptuelle Nähe | — | PC-C05 (Teil) |
| Prozessverantwortung festgelegt | Governance | — | Konzeptuelle Nähe | — | PC-C05 (Teil) |
| **Übergabepunkt MFA → Arzt** | Verantwortungsübergabe | — | — | — | **Nicht vorhanden** ⚠ |

**Legende:**
✓ Vollständige Abdeckung ·
(Teil) Teilabdeckung innerhalb einer Section ·
Konzeptuelle Nähe = fachliche Ähnlichkeit ohne direkte Übertragbarkeit ·
— Kein erkennbarer Bezug

### 3.3 Ergebnis

Stand heute konnte keine direkte 1:1-Wiederverwendung eines bestehenden Checkpoints
aus anderen Modulen für den Piloten identifiziert werden. Die Analyse deutet darauf hin,
dass die Module unterschiedliche primäre Klärungsziele verfolgen:

- **Klinische Workflows:** Klärung von Einzelfällen im laufenden Behandlungsbetrieb
- **Office:** Compliance- und HR-Prüfung für Praxismanagement
- **Inquiries:** Patientengerichtete Kommunikation bei eingehenden Anfragen
- **Internal Protocol:** Praxisinterne Prozessregelung und -governance

Konzeptuelle Überschneidungen bestehen und könnten in einer späteren Architekturphase
zur Harmonisierung genutzt werden. Der aktuelle Pilot nutzt vorhandene Konzepte
(Checkpoint-Struktur, M2-Fragen, M3-Status) eigenständig für seinen Anwendungsbereich.

---

## 4. Bewertung der aktuellen Sections

### PC-C01 – Geltungsbereich

**Einschätzung:** Für den aktuellen MVP ausreichend.

Die drei Fragen verfolgen dasselbe fachliche Ziel (Anwendungsbereich definieren).
Die optionale Frage POT-Q-C01-03 könnte mittelfristig als separater Checkpoint
bewertet werden, wenn die Praxis-QM-Überprüfung diesen Aspekt eigenständig
tracken möchte.

| Frage | Fachliches Ziel | Einschätzung |
|---|---|---|
| POT-Q-C01-01 | Situationen definieren | Kern des Checkpoints |
| POT-Q-C01-02 | Personeller Geltungsbereich | Ergänzend, kohärent |
| POT-Q-C01-03 | Ausnahmen schriftlich (optional) | Mittelfristig als eigener Checkpoint prüfenswert |

### PC-C02 – Zuständigkeit und Entscheidungsbefugnis

**Einschätzung:** Für den aktuellen MVP vertretbar. Mittelfristig prüfenswert.

Die Section bündelt vier fachlich unterschiedliche Klärungsziele. Das ist im MVP
handhabbar, weil M3 bereits zeigt, welche Fragen innerhalb des Checkpoints noch
offen sind. Für eine feinere Fortschrittsrückmeldung wäre eine Aufgliederung
längerfristig zu überdenken — sobald ein zweiter Prozess existiert und eine
Wiederverwendungsperspektive entsteht.

| Frage | Fachliches Ziel | Verantwortungsart |
|---|---|---|
| POT-Q-C02-01 | Wer führt Erstaufnahme durch? | Organisatorisch |
| POT-Q-C02-02 | Wer entscheidet bei Dringlichkeitsunklarheit? | Medizinisch |
| POT-Q-C02-03 | Zuständigkeiten schriftlich festgelegt? | QM-Governance |
| POT-Q-C02-04 | Vertretungsregelung vorhanden? | HR-Governance |

### PC-C03 – Standardablauf

**Einschätzung:** Für den aktuellen MVP vertretbar. Dokumentations-Überschneidung
mit PC-C05 mittelfristig schärfen.

| Frage | Fachliches Ziel | Einschätzung |
|---|---|---|
| POT-Q-C03-01 | Welche Infos werden erhoben? | Operativer Kernprozess |
| POT-Q-C03-02 | Wie wird standardmäßig verfahren? | Versorgungsweg-Entscheidung |
| POT-Q-C03-03 | Anliegen vor Entscheidung dokumentiert? | Überschneidung mit PC-C05-01 prüfen |

### PC-C04 – Ausnahmen und Eskalation

**Einschätzung:** Für den aktuellen MVP ausreichend. Die zwei Klärungsziele
(Notfallerkennung + Eskalationsprotokoll) sind fachlich eng verknüpft und im
MVP sinnvoll zusammen abgebildet.

| Frage | Fachliches Ziel | Einschätzung |
|---|---|---|
| POT-Q-C04-01 | Notfallkriterien definiert | Notfallerkennung |
| POT-Q-C04-02 | Eskalationsweg definiert | Eskalationsprotokoll |
| POT-Q-C04-03 | Warnsymptome (FREE_TEXT, optional) | Dokumentation der Kriterien |
| POT-Q-C04-04 | Eskalationsstufen bekannt? | Teambekanntheit |

### PC-C05 – Dokumentation und Überprüfung

**Einschätzung:** Für den aktuellen MVP ausreichend. POT-Q-C05-01 ist optional
und adressiert eine andere Dokumentationsebene als POT-Q-C03-03 — Abgrenzung
im Wording mittelfristig schärfen.

| Frage | Fachliches Ziel | Einschätzung |
|---|---|---|
| POT-Q-C05-01 | Entscheidungen dokumentiert (optional) | Empfehlung, kein Pflichtfeld |
| POT-Q-C05-02 | Überprüfungsrhythmus | QM-Governance | MULTI_SELECT (Mehrfachauswahl jetzt möglich) |
| POT-Q-C05-03 | Prozessverantwortung | Governance |

---

## 5. Fachliche Lücken (aktuell identifiziert)

### 5.1 Übergabepunkt MFA → Arzt (Stand heute nicht abgebildet)

**Beschreibung:** Stand heute enthält kein einziger Satz im Fragenkatalog eine
explizite Frage nach dem Übergabemoment: Welches Signal veranlasst die MFA,
sofort den Arzt hinzuzuziehen — nicht erst bei „Unklarheit", sondern als
definiertes Protokoll?

POT-Q-C02-02 fragt „Wer entscheidet bei Dringlichkeitsunklarheit?" — der Fokus
liegt auf der Entscheidungskompetenz, nicht auf dem konkreten Übergabeauslöser.

**Bewertung:** Echte inhaltliche Lücke. Stand heute lässt sich diese Anforderung
nicht sauber in einen bestehenden Checkpoint einordnen. Eine Ergänzung innerhalb
von PC-C02 oder als eigenständige Erweiterung wäre mittelfristig prüfenswert.

**Warum vorhandene Fragen nicht ausreichen:** Bestehende Fragen definieren *wer*
entscheidet, nicht *wann* die Übergabe erfolgt. Die Abgrenzung „Rücksprache bei
Unklarheit" vs. „sofortige Übergabe bei definierten Signalen" fehlt.

### 5.2 Keine Rollentrennung in M2 (strukturelle Einschränkung)

**Beschreibung:** Das klinische Workflow-Modul hat mit `pointIdsByRole: { MFA, ARZT }`
bereits eine etablierte Lösung für rollenspezifische M2-Fragen. Im Internal Protocol
Modul sehen alle Rollen dieselben Fragen.

**Bewertung:** Für den aktuellen Einzelprozess-Pilot vertretbar. Sobald unterschiedliche
Teamrollen erkennbar verschiedene Klärungsperspektiven haben oder mehrere Prozesse
parallel verwaltet werden, dürfte die Rollentrennung relevanter werden. Das
`pointIdsByRole`-Muster aus dem Workflow-Modul ist ein kandidierender Ansatz —
ob er für den Internal Protocol Kontext passt, müsste in einem nächsten Schritt
bewertet werden.

### 5.3 Dokumentations-Überlappung (Wording-Unschärfe)

**Beschreibung:** POT-Q-C03-03 (Anliegen vor Entscheidung dokumentiert?) und
POT-Q-C05-01 (Entscheidungen bei Verweisung dokumentiert?) adressieren beide das
Thema Dokumentation, sind auf verschiedene Sections verteilt und haben
unterschiedlichen Fokus.

**Bewertung:** Kein Blocker für den MVP. Mittelfristig sollte das Wording der
beiden Fragen klarer abgrenzen, welche Dokumentationshandlung gemeint ist,
um Verwirrung im Team zu vermeiden.

---

## 6. Bewertung der uncommitted M3-Änderung

### Betroffene Dateien

- `lib/workflow/internalProtocol/clarificationState.ts` (neu, nicht committed)
- `app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx` (M3View-Überarbeitung, nicht committed)
- `tests/internalProtocolClarification.test.ts` (neu, nicht committed)

### Unabhängigkeit von der Checkpoint-Struktur

| Eigenschaft | Bewertung |
|---|---|
| Arbeitet auf beliebigen `(ProtocolSection, ProtocolWorkflowCheckpoint)`-Paaren | Keine Abhängigkeit von Checkpoint-Anzahl |
| Keine Hardcodierung auf PC-C01..PC-C05 | Funktioniert mit jeder Checkpoint-Konfiguration |
| Validierungslogik basiert auf `question.required`, nicht auf Section-IDs | Stabil gegenüber Umbenennung oder Hinzufügen |
| M3View iteriert dynamisch über beliebig viele Checkpoints | Keine feste Annahme über Checkpoint-Anzahl |

### Empfehlung

Die M3-Änderung kann und sollte **vor** einer eventuellen fachlichen Checkpoint-Überarbeitung
committed werden. Sie ist additiv, verbessert die aktuelle Darstellung sofort, und blockiert
keine spätere Refaktorierung der Checkpoint-Struktur.

---

## 7. Empfohlene nächste Schritte

### Sofort (nächster Commit)

1. **Uncommitted M3-Änderungen committen:** `clarificationState.ts`, M3View, Tests.
   - Begründung: Additiv, unabhängig von Checkpoint-Granularität, bestehende Tests unverändert.

### Mittelfristig (nach weiteren Nutzungserfahrungen)

2. **Wording-Schärfung:** POT-Q-C03-03 und POT-Q-C05-01 klarer voneinander abgrenzen.
3. **Übergabepunkt prüfen:** Ob eine neue Frage innerhalb von PC-C02 ausreicht oder
   ein eigener Checkpoint sinnvoller ist, sollte mit dem klinischen Team bewertet werden.
4. **PC-C02-Granularität beobachten:** Mit einem zweiten Pilotprozess wird sichtbar,
   ob die aktuelle Bündelung Wiederverwendung behindert oder handhabbar bleibt.

### Langfristig (nach ≥ 2 weiteren Prozessen)

5. **Rollentrennung in M2 evaluieren:** Das `pointIdsByRole`-Muster aus dem Workflow-Modul
   prüfen, sobald unterschiedliche Teamrollen erkennbar verschiedene Klärungsperspektiven benötigen.
6. **Harmonisierung über Module:** Wenn konzeptuelle Überschneidungen zunehmen, eine
   modulübergreifende Checkpoint-Abstraktion prüfen. Stand heute gibt es dafür noch
   keine ausreichende Datenlage.

---

## 8. Architekturentscheidung (aktueller Stand)

### Belastbar erscheinende Entscheidungen

- Das Internal Protocol Modul ist strukturell als eigene Domain aufgestellt.
  Die Trennung von `checkpoints.ts` (Definitionen) und `patientWithoutAppointment.ts`
  (Fragenkatalog) entspricht dem Projektprinzip.
- Die Checkpoint-IDs PC-C01..PC-C05 und das OPEN/CONFIRMED/NOT_APPLICABLE-Statusmodell
  sind stabil und für den Pilot ausreichend.
- `clarificationState.ts` ist eine sinnvolle, unabhängige Ergänzung und kann
  vor einer eventuellen Strukturüberarbeitung committed werden.
- Für den aktuellen Einzelprozess-MVP ist keine unmittelbare Architekturänderung
  notwendig. Stabilität hat Vorrang.

### Bewusst offen gehaltene Punkte

- Ob eine feinere Granularität (z. B. Trennung PC-C02 in Org/Med/Governance) langfristig
  sinnvoll ist, kann erst mit einem zweiten Prozess beurteilt werden.
- Ob der `pointIdsByRole`-Ansatz aus dem Workflow-Modul auf Internal Protocol übertragbar
  ist, wurde noch nicht prototypisch geprüft.
- Ob „Übergabepunkt MFA → Arzt" als eigenständiger Checkpoint oder als Ergänzung
  in PC-C02 besser aufgehoben ist, hängt vom nächsten Prozess ab.
- Ob modulübergreifende Checkpoint-Reuse je umgesetzt wird, lässt sich auf Basis
  eines einzelnen Prozesses nicht entscheiden.

### Annahmen, die der Pilot derzeit bestätigt

- Das Checkpoint-Prinzip (fachliche Anforderung + M2-Klärungsfragen + M3-Status)
  funktioniert auch für praxisinterne Prozessregelungen.
- `ProtocolSection` als Träger von OfficialRules und Questions ist ein
  verwendbares Konzept für diesen Anwendungsbereich.
- Das Statusmodell OPEN/CONFIRMED/NOT_APPLICABLE ist für den Klärungsprozess
  ausreichend differenziert.
- Die Trennung von Checkpoint-Definition und Fragenkatalog ermöglicht spätere
  Anpassungen ohne Datenverlust.

### Annahmen, die weiterer Validierung bedürfen

- Ob 5 Checkpoints die richtige Granularität für praxisinterne Prozesse sind,
  oder ob mehr Checkpoints besser geeignet wären.
- Ob verschiedene Teamrollen (MFA, Arzt, QM-Beauftragter) tatsächlich
  unterschiedliche M2-Perspektiven benötigen.
- Ob der aktuelle Ansatz ohne Cross-Prozess-Reuse skaliert, wenn mehrere
  Prozesse parallel verwaltet werden.
- Ob die im Piloten gefundene Section-Struktur repräsentativ für andere
  praxisinterne Prozesstypen ist oder eine Sonderform darstellt.

---

*Erstellt auf Basis der Architekturanalyse vom 2026-07-28. Keine Code-Änderungen vorgenommen.*
*Dieser Stand dient als Ausgangspunkt für die nächsten kleinen, gut nachvollziehbaren Entwicklungsschritte.*
