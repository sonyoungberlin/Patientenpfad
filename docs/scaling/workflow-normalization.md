# Workflow-Normalisierung – Analyse der PRACTICE_WORKFLOW-Checkpoints

**Stand:** Mai 2026  
**Scope:** `lib/inquiries/inquiryCheckpointCatalog.ts` – ausschließlich Checkpoints
der Gruppe PRACTICE_WORKFLOW aus dem Skalierungsaudit  
**Status:** Reine Dokumentation – kein Produktcode geändert

---

## 1. Fragestellung

Die 16 als PRACTICE_WORKFLOW eingestuften Checkpoints unterscheiden sich strukturell von
rein praxisindividuellen Texten: Sie folgen erkennbaren, wiederkehrenden
Kommunikationsmustern – unterscheiden sich aber in den eingebetteten Betriebsparametern.

Dieses Dokument beantwortet:
- Welche Checkpoints beschreiben denselben Workflow?
- Was bleibt konstant, was ist praxisseitig variabel?
- Welche abstrakten Workflow-Typen entstehen daraus?
- Welche Checkpoints könnten later durch Instanzen ersetzt werden?
- Welche bleiben vorerst bewusst statisch?

---

## 2. Cluster-Analyse: Welche Checkpoints beschreiben denselben Workflow?

### Cluster A – Buchungscode-Flow (Online-Buchung + Code)

Alle Checkpoints beschreiben **denselben Ablauf**: Patient öffnet Online-Buchungskalender,
navigiert eine Baumstruktur, gibt am Ende einen alphanumerischen Bestätigungscode ein.

| Checkpoint-ID | Terminbezeichnung | Navigationspfad | Buchungscode | Zusatzhinweis |
|---|---|---|---|---|
| `LAB_APPOINTMENT_INTERNAL` | Blutwerte | Labor → Ärztliche Anordnung → Blutwerte | `LKBP25` | – |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | Befundbesprechung | _(nur Bezeichnung, kein Pfad)_ | `BFSP25` | – |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | Check-Up - 2. Termin | _(nur Bezeichnung, kein Pfad)_ | `CHECK25` | Wartet auf Laborwerte; Impfpass mitbringen |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | Chroniker-Kontrolltermin | _(nur Bezeichnung, kein Pfad)_ | `CHKT25` | – |
| `APPOINTMENT_BOOK_EKG_ORDER` | EKG-Untersuchung | Hausarzt / Allgemeinmediziner → Vor Ort → Ärztliche Anordnung | `LKBP25` | – |

**Auffälligkeit:** `LAB_APPOINTMENT_INTERNAL` und `APPOINTMENT_BOOK_EKG_ORDER` teilen
denselben Code `LKBP25`, führen aber in vollständig verschiedene Kalender-Bäume
(Labor vs. Hausarzt). Zu prüfen, ob das fachlich korrekt ist oder eine Altlast.

**Strukturell konstanter Textkern (Cluster A):**
```
Bitte buchen Sie im Online-Buchungskalender [Terminbezeichnung].
[Optional: Wählen Sie: 1. ... 2. ... 3. ...]
Für diesen Termin benötigen Sie den Buchungscode [CODE].
```

**Variabel:**
- `appointmentTypeLabel` – Bezeichnung der Terminart
- `bookingNavigationPath[]` – geordnete Pfadschritte (leer, wenn nur Bezeichnung)
- `bookingCode` – alphanumerischer Code
- `additionalNote` – freitext-optionale Ergänzung (nur `APPOINTMENT_BOOK_CHECKUP_SECOND`)
- `waitForCondition` – fachlicher Vorbedingungshinweis (nur `APPOINTMENT_BOOK_CHECKUP_SECOND`)

---

### Cluster B – Plattform-Buchung ohne Code

Checkpoints beschreiben **Online-Buchung mit Navigation, aber ohne Bestätigungscode**.
Entweder weil kein Code existiert oder weil der Termin frei buchbar ist.

| Checkpoint-ID | Terminbezeichnung | Navigationspfad | Kein-Code-Hinweis | Besonderheit |
|---|---|---|---|---|
| `LAB_APPOINTMENT_CHECKUP` | Check-Up - 1. Termin (Basiswerte Labor) | _(nur Bezeichnung)_ | "Für diesen Termin ist kein Code erforderlich." | Explizite Verneinung des Codes |
| `IMMUNIZATION_BOOK_VACCINATION` | Impftermin | Labor → Impfung → gewünschte Impfung | – | Letzter Schritt ist variabel (Impfstoffauswahl) |
| `IMMUNIZATION_BOOK_COUNSELING` | Impfberatung | Hausarzt / Allgemeinmedizin → Impfberatung | – | Kürzester Pfad im Cluster |
| `APPOINTMENT_BOOK_GENERAL` | passende Terminart | Hausarzt / Allgemeinmedizin → passende Terminart | – | Fallback-Satz bei Unsicherheit |

**Strukturell konstanter Textkern (Cluster B):**
```
Bitte buchen Sie [Zweck] über unseren Online-Buchungskalender.
Wählen Sie:
1. [Schritt 1]
2. [Schritt 2]
[Optional: 3. [Schritt 3]]
[Optional: Falls Sie unsicher sind, geben Sie uns bitte kurz eine Rückmeldung.]
```

**Variabel:**
- `appointmentPurposeLabel` – Formulierungsziel des Termins
- `bookingNavigationPath[]` – geordnete Pfadschritte
- `noCodeNote` – ob explizit auf fehlenden Code hingewiesen wird (boolean)
- `uncertaintyFallbackNote` – ob ein Rückmelde-Hinweis erscheint (nur `APPOINTMENT_BOOK_GENERAL`)

---

### Cluster C – Offene Sprechstunde

Einzelner Checkpoint, aber bewusst als eigener Cluster, weil der Workflow kategorial
anders ist: kein Buchungsvorgang, sondern Walk-in-Kommunikation.

| Checkpoint-ID | Tage | Uhrzeit | Kapazitätshinweis |
|---|---|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | täglich | 9–10 Uhr | Ja (Auslastung, begrenzte Aufnahme) |

**Vorgänger-Checkpoint:** `ACUTE_OPEN_CONSULTATION_INFO` (deprecated EXPLANATION-Variante)
enthält **denselben Textkern** – ein klares Signal, dass dieser Workflow schon einmal
umgebaut wurde und wieder migriert werden muss.

**Strukturell konstanter Textkern (Cluster C):**
```
Die offene Sprechstunde findet [days] von [hours] statt.
Eine vorherige Terminvereinbarung ist nicht erforderlich.
[Optional: Bitte beachten Sie, dass es je nach Auslastung zu Wartezeiten kommen
kann und die Aufnahme begrenzt ist.]
```

**Variabel:**
- `openConsultationDays` – Wochentage als Freitext (`"täglich"`, `"Mo–Fr"`)
- `openConsultationHours` – Uhrzeit als Freitext (`"9–10 Uhr"`, `"8–9 Uhr"`)
- `capacityLimitedNote` – ob Kapazitätshinweis erscheint (boolean)

---

### Cluster D – Bearbeitungszeit (SLA-Kommunikation)

Einzelner Checkpoint, aber eigenständiger Mustertyp: kommuniziert eine praxisseitig
definierte Bearbeitungszeit für den digitalen Kanal.

| Checkpoint-ID | Zeitangabe | Einheit | Nachfrage-Verzicht-Hinweis |
|---|---|---|---|
| `DIGITAL_REQUEST_PROCESSING_TIME` | 8–12 | Stunden | Ja (explizit) |

**Strukturell konstanter Textkern (Cluster D):**
```
Die Bearbeitung digitaler Anfragen dauert je nach Auslastung [min]–[max] [unit].
Bitte sehen Sie in dieser Zeit von Nachfragen zum Bearbeitungsstand ab.
```

**Variabel:**
- `processingTimeMin` – untere Schranke (Zahl)
- `processingTimeMax` – obere Schranke (Zahl)
- `processingTimeUnit` – Einheit (`"Stunden"`, `"Werktage"`)
- `noFollowupNote` – ob der Nachfrageverzicht-Satz erscheint (boolean, derzeit immer true)

---

### Cluster E – Plattform-Information (Kommunikationskanal)

Drei Checkpoints beschreiben **dieselbe externe Plattform** (aktuell: Doctolib) aus
unterschiedlichen Kommunikationswinkeln.

| Checkpoint-ID | Kind | Winkel | Plattformname | Kontoetikett | Support-Kontakt |
|---|---|---|---|---|---|
| `ONBOARDING_DOCTOLIB_INFO` | EXPLANATION | Einführung in die Plattform | Doctolib | Doctolib-Account | – |
| `DOCUMENT_UPLOAD` | ACTION | Upload-Anweisung | Doctolib | Doctolib Account | – |
| `TECH_VIDEO_NOT_WORKING` | EXPLANATION | Support-Eskalation | – | – | Doctolib Support |

**Beobachtung:** Die drei Checkpoints bilden gemeinsam den vollständigen Plattform-Lebenszyklus
aus Sicht des Patienten: Einstieg → Nutzung → Fehlerbehebung. Eine Plattformänderung
(z. B. Wechsel von Doctolib zu einem anderen Anbieter) würde alle drei gleichzeitig betreffen.

**Konstante Textkerne:**

`ONBOARDING_DOCTOLIB_INFO`:
```
Für die Kommunikation mit unserer Praxis nutzen wir [platformName].
Sie können dort Termine online buchen und verwalten sowie [services] digital anfragen.
Bitte nutzen Sie dafür Ihren [accountLabel].
```

`DOCUMENT_UPLOAD`:
```
Bitte laden Sie relevante Unterlagen über Ihren [accountLabel] hoch.
```

`TECH_VIDEO_NOT_WORKING`:
```
Wenden Sie sich bei Fragen an den [supportContact].
```

**Variabel:**
- `platformName` – Eigenname der Plattform
- `accountLabel` – Bezeichnung des Nutzerkontos (mit oder ohne Bindestriche je Kontext)
- `platformCapabilities[]` – Liste der kommunizierten Funktionen (Buchung, Anfragen etc.)
- `supportContact` – Name oder Kontaktweg des Supports

---

### Cluster F – Abrechnungszyklen

Zwei Checkpoints kommunizieren praxisseitig gesetzte Abrechnungsparameter.

| Checkpoint-ID | Kind | Parameter | Aktueller Wert |
|---|---|---|---|
| `BILLING_INVOICE_TIMING` | EXPLANATION | Abrechnungsrhythmus | quartalsweise |
| `BILLING_EXTERNAL_PROVIDER` | EXPLANATION | Externer Dienstleister / Partnerlabor | „externen Abrechnungsdienstleister oder einem Partnerlabor" |

**Beobachtung:** `BILLING_INVOICE_TIMING` und `BILLING_EXTERNAL_PROVIDER` sind fachlich
verschieden (Zeitpunkt vs. Zuständigkeit), haben aber eine enge semantische Bindung:
Praxen, die extern abrechnen, müssen typischerweise beide Checkpoints setzen. Sie könnten
als zusammengehörender Konfigurationsblock behandelt werden.

**Konstante Textkerne:**

`BILLING_INVOICE_TIMING`:
```
Die Abrechnung erfolgt in der Regel [cycleLabel] über unsere Buchhaltung.
Sie erhalten Ihre Rechnung anschließend automatisch vom Abrechnungsdienstleister.
```

`BILLING_EXTERNAL_PROVIDER`:
```
Die Rechnung erhalten Sie von einem externen Abrechnungsdienstleister oder einem [billingPartnerName].
```

**Variabel:**
- `billingCycleLabel` – Rhythmus (`"quartalsweise"`, `"monatlich"`)
- `billingPartnerName` – Name des Dienstleisters oder Labors
- `invoiceSenderLabel` – ob Praxis oder Dienstleister kommuniziert wird

---

## 3. Vollständige Checkpoint-Tabelle

### 3a. Cluster A – Buchungscode-Flow (WT-1)

| Checkpoint-ID | Konstanter Anteil | Variabler Anteil | Scope / Placement |
|---|---|---|---|
| `LAB_APPOINTMENT_INTERNAL` | Buchungsanleitung mit nummerierten Schritten + Code-Eingabe | Navigationspfad (Labor-Baum), Code `LKBP25` | SPECIFIC / ATTACHED |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | Buchungsanleitung mit Terminbezeichnung + Code-Eingabe | Terminbezeichnung "Befundbesprechung", Code `BFSP25` | SPECIFIC / ATTACHED |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | Buchungsanleitung + Code-Eingabe + Vorbedingungshinweis | Terminbezeichnung "Check-Up - 2. Termin", Code `CHECK25`, Impfpass-Hinweis, Wartekontext | SPECIFIC / ATTACHED |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | Buchungsanleitung mit Terminbezeichnung + Code-Eingabe | Terminbezeichnung "Chroniker-Kontrolltermin", Code `CHKT25` | SPECIFIC / ATTACHED |
| `APPOINTMENT_BOOK_EKG_ORDER` | Buchungsanleitung mit nummerierten Schritten + Code-Eingabe | Navigationspfad (Hausarzt-Baum), Code `LKBP25` | SPECIFIC / ATTACHED |

### 3b. Cluster B – Plattform-Buchung ohne Code (WT-3)

| Checkpoint-ID | Konstanter Anteil | Variabler Anteil | Scope / Placement |
|---|---|---|---|
| `LAB_APPOINTMENT_CHECKUP` | Buchungsanleitung ohne Code, expliziter Kein-Code-Satz | Terminbezeichnung "Check-Up - 1. Termin (Basiswerte Labor)" | SPECIFIC / ATTACHED |
| `IMMUNIZATION_BOOK_VACCINATION` | Buchungsanleitung mit nummerierten Pfadschritten | Navigationspfad (Impfbaum), letzter Schritt: Impfstoffwahl offen | SPECIFIC / ATTACHED |
| `IMMUNIZATION_BOOK_COUNSELING` | Buchungsanleitung mit nummerierten Pfadschritten | Navigationspfad (Beratungsbaum) | SPECIFIC / ATTACHED |
| `APPOINTMENT_BOOK_GENERAL` | Buchungsanleitung mit Pfad + Unsicherheits-Fallback | Navigationspfad (Allgemeinmedizin-Baum), Fallback-Formulierung | SPECIFIC / ATTACHED |

### 3c. Cluster C – Offene Sprechstunde (WT-2)

| Checkpoint-ID | Konstanter Anteil | Variabler Anteil | Scope / Placement |
|---|---|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | Walk-in-Aussage + kein Terminvorbehalt + optionaler Kapazitätshinweis | Tage, Uhrzeit, Kapazitätshinweis ja/nein | GLOBAL / SHARED_BOTTOM |

### 3d. Cluster D – SLA-Kommunikation (WT-4)

| Checkpoint-ID | Konstanter Anteil | Variabler Anteil | Scope / Placement |
|---|---|---|---|
| `DIGITAL_REQUEST_PROCESSING_TIME` | Bearbeitungszeit-Aussage + Nachfrageverzicht-Satz | Zeitraum Min–Max, Einheit | GLOBAL / SHARED_BOTTOM |

### 3e. Cluster E – Plattform-Information (WT-5)

| Checkpoint-ID | Konstanter Anteil | Variabler Anteil | Scope / Placement |
|---|---|---|---|
| `ONBOARDING_DOCTOLIB_INFO` | Plattform-Einführungs-Struktur + Funktionskommunikation | Plattformname, Kontoetikett, Capability-Liste | SPECIFIC / ATTACHED |
| `DOCUMENT_UPLOAD` | Upload-Anweisung | Plattform-Kontobezeichnung | GLOBAL / SHARED_BOTTOM |
| `TECH_VIDEO_NOT_WORKING` | Video-Support-Aussage + Weiterleitungshinweis | Support-Kontaktbezeichnung | SPECIFIC / ATTACHED |

### 3f. Cluster F – Abrechnungszyklen (WT-6)

| Checkpoint-ID | Konstanter Anteil | Variabler Anteil | Scope / Placement |
|---|---|---|---|
| `BILLING_INVOICE_TIMING` | Abrechnungszyklus-Aussage + automatischer Rechnungsversand | Rhythmus-Label (`quartalsweise`) | SPECIFIC / ATTACHED |
| `BILLING_EXTERNAL_PROVIDER` | Externe-Abrechnung-Aussage | Dienstleistername / Laborname | SPECIFIC / ATTACHED |

---

## 4. Gemeinsame Textbausteine (Praxis-unabhängig)

Diese Sätze tauchen in mehreren Checkpoints auf und sollten auch im Rahmen einer
künftigen Parametrisierung **nicht verändert werden**:

| Textteil | Vorkommen | Typ |
|---|---|---|
| „Bitte buchen Sie im Online-Buchungskalender" | Cluster A, Cluster B | Einleitungsformel Buchungsanleitung |
| „Geben Sie zur Bestätigung den Buchungscode [CODE] ein." | Cluster A gesamt | Abschlussformel Buchungsanleitung mit Code |
| „Für diesen Termin benötigen Sie den Buchungscode [CODE]." | Cluster A (Formulierungsvariante) | Abschlussformel Buchungsanleitung mit Code |
| „Eine vorherige Terminvereinbarung ist nicht erforderlich." | Cluster C | Kernaussage Walk-in |
| „Bitte sehen Sie in dieser Zeit von Nachfragen zum Bearbeitungsstand ab." | Cluster D | SLA-Managementhinweis |
| „Sie erhalten Ihre Rechnung anschließend automatisch vom Abrechnungsdienstleister." | Cluster F (`BILLING_INVOICE_TIMING`) | Abrechnungsprozess-Aussage |
| „Wählen Sie:\n1. ...\n2. ..." | Cluster A, B | Navigationsstruktur |

---

## 5. Workflow-Typen (WT-1 bis WT-6)

### WT-1: BOOKING_CODE_FLOW

**Beschreibung:** Online-Buchung mit Navigation im Kalender-Baum und Bestätigungscode.  
**Erkennungsmerkmal:** `bookingCode` ist nicht leer.  
**Checkpoints die diesen Typ instanziieren:** `LAB_APPOINTMENT_INTERNAL`,
`APPOINTMENT_BOOK_FINDINGS_REVIEW`, `APPOINTMENT_BOOK_CHECKUP_SECOND`,
`APPOINTMENT_BOOK_CHRONIC_CONTROL`, `APPOINTMENT_BOOK_EKG_ORDER`

**Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `appointmentTypeLabel` | `string` | ja | Bezeichnung der Terminart im Kalender |
| `bookingNavigationPath` | `string[]` | nein | Geordnete Schritte im Kalender-Baum (leer = kein Pfad, nur Label) |
| `bookingCode` | `string` | ja | Alphanumerischer Bestätigungscode |
| `bookingCodeRequired` | `boolean` | ja | Ob Code zwingend ist (derzeit immer `true`) |
| `waitForConditionNote` | `string \| null` | nein | Fachlicher Vorbedingungshinweis (z. B. Laborwerte abwarten) |
| `additionalPreparationNote` | `string \| null` | nein | Vorbereitungshinweis (z. B. Impfpass mitbringen) |

**Textstruktur:**

```
Bitte buchen Sie im Online-Buchungskalender {appointmentTypeLabel}.
[if bookingNavigationPath.length > 0]
Wählen Sie:
{bookingNavigationPath.map((step, i) => `${i+1}. ${step}`).join('\n')}
[/if]
[if waitForConditionNote]
{waitForConditionNote}
[/if]
Für diesen Termin benötigen Sie den Buchungscode {bookingCode}.
[if additionalPreparationNote]
{additionalPreparationNote}
[/if]
```

---

### WT-2: OPEN_CONSULTATION_SCHEDULE

**Beschreibung:** Walk-in Sprechstunde ohne Voranmeldung. Kommuniziert Zeiten und
optional Kapazitätsgrenzen.  
**Erkennungsmerkmal:** Kein Buchungsvorgang, nur Zeitfensterinformation.  
**Checkpoints die diesen Typ instanziieren:** `ACUTE_OPEN_CONSULTATION_ACTION`

**Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `openConsultationDays` | `string` | ja | Wochentage als Freitext (`"täglich"`, `"Mo–Fr"`) |
| `openConsultationHours` | `string` | ja | Zeitfenster als Freitext (`"9–10 Uhr"`) |
| `capacityLimitedNote` | `boolean` | nein | Ob Auslastungshinweis + Aufnahmebegrenzung erscheint |

**Textstruktur:**

```
Die offene Sprechstunde findet {openConsultationDays} von {openConsultationHours} statt.
Eine vorherige Terminvereinbarung ist nicht erforderlich.
[if capacityLimitedNote]
Bitte beachten Sie, dass es je nach Auslastung zu Wartezeiten kommen kann
und die Aufnahme begrenzt ist.
[/if]
```

---

### WT-3: PLATFORM_SPECIFIC_BOOKING

**Beschreibung:** Online-Buchung mit Navigation im Kalender-Baum, aber ohne
Bestätigungscode. Optionaler Fallback-Satz bei Unsicherheit.  
**Erkennungsmerkmal:** `bookingCode` ist leer; Pfadnavigation vorhanden.  
**Checkpoints die diesen Typ instanziieren:** `LAB_APPOINTMENT_CHECKUP`,
`IMMUNIZATION_BOOK_VACCINATION`, `IMMUNIZATION_BOOK_COUNSELING`,
`APPOINTMENT_BOOK_GENERAL`

**Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `appointmentPurposeLabel` | `string` | ja | Beschreibung des Buchungsziels im Einleitungssatz |
| `bookingNavigationPath` | `string[]` | ja | Geordnete Schritte im Kalender-Baum |
| `noCodeNote` | `boolean` | nein | Ob explizit kommuniziert wird, dass kein Code nötig ist |
| `uncertaintyFallbackNote` | `boolean` | nein | Ob Rückmelde-Hinweis bei Unsicherheit erscheint |

**Textstruktur:**

```
Bitte buchen Sie {appointmentPurposeLabel} über unseren Online-Buchungskalender.
Wählen Sie:
{bookingNavigationPath.map((step, i) => `${i+1}. ${step}`).join('\n')}
[if noCodeNote]
Für diesen Termin ist kein Code erforderlich.
[/if]
[if uncertaintyFallbackNote]
Falls Sie unsicher sind, welcher Termin für Ihr Anliegen passt,
geben Sie uns bitte kurz eine Rückmeldung.
[/if]
```

---

### WT-4: PROCESSING_TIME_SLA

**Beschreibung:** Kommunikation einer praxisseitig definierten Bearbeitungszeit für den
digitalen Anfragekanal. Enthält immer einen Satz, der aktive Nachfragen deeskaliert.  
**Erkennungsmerkmal:** Zeitangabe in Stunden oder Werktagen; kein Buchungsvorgang.  
**Checkpoints die diesen Typ instanziieren:** `DIGITAL_REQUEST_PROCESSING_TIME`

**Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `processingTimeMin` | `number` | ja | Untere Zeitschranke |
| `processingTimeMax` | `number` | ja | Obere Zeitschranke |
| `processingTimeUnit` | `string` | ja | Einheit (`"Stunden"`, `"Werktage"`) |
| `noFollowupNote` | `boolean` | nein | Ob der Nachfrageverzicht-Satz erscheint (Standard: `true`) |

**Textstruktur:**

```
Die Bearbeitung digitaler Anfragen dauert je nach Auslastung
{processingTimeMin}–{processingTimeMax} {processingTimeUnit}.
[if noFollowupNote]
Bitte sehen Sie in dieser Zeit von Nachfragen zum Bearbeitungsstand ab.
[/if]
```

---

### WT-5: PLATFORM_INFO

**Beschreibung:** Kommunikation der verwendeten Kommunikationsplattform aus drei
verschiedenen Winkeln (Einführung, Upload, technischer Support). Alle drei Checkpoints
hängen strukturell an derselben Plattformkonfiguration.  
**Erkennungsmerkmal:** Plattformname erscheint im Text; kein Buchungsvorgang.  
**Checkpoints die diesen Typ instanziieren:** `ONBOARDING_DOCTOLIB_INFO`,
`DOCUMENT_UPLOAD`, `TECH_VIDEO_NOT_WORKING`

**Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `platformName` | `string` | ja | Eigenname der Plattform (z. B. `"Doctolib"`) |
| `platformAccountLabel` | `string` | ja | Nutzerkonto-Bezeichnung (z. B. `"Doctolib-Account"`) |
| `platformCapabilities` | `string[]` | für ONBOARDING | Liste der kommunizierten Plattformfunktionen |
| `supportContact` | `string` | für TECH | Support-Bezeichnung oder -Kontakt |

**Besonderheit:** Die drei Checkpoints teilen die Plattform-Parameter, aber ihre
Textkerne sind so unterschiedlich (Einführung vs. Upload-Anweisung vs. Support-Eskalation),
dass sie nicht in einem einzigen Typ zusammengeführt werden sollten. Sie teilen lediglich
denselben Konfigurationsblock.

---

### WT-6: BILLING_CYCLE

**Beschreibung:** Kommunikation des Abrechnungsrhythmus und des externen
Abrechnungsdienstleisters oder Partnerlabors.  
**Erkennungsmerkmal:** Abrechnungsrhythmus oder Dienstleistername im Text.  
**Checkpoints die diesen Typ instanziieren:** `BILLING_INVOICE_TIMING`,
`BILLING_EXTERNAL_PROVIDER`

**Parameter:**

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `billingCycleLabel` | `string` | für BILLING_INVOICE_TIMING | Rhythmus als Freitext (`"quartalsweise"`, `"monatlich"`) |
| `billingPartnerName` | `string` | für BILLING_EXTERNAL_PROVIDER | Dienstleistername oder Laborname |
| `invoiceSenderLabel` | `string` | nein | Bezeichnung des Rechnungsausstellers im Text |

---

## 6. Welche Checkpoints könnten später durch Workflow-Instanzen ersetzt werden?

Geordnet nach Parametrisierbarkeit und Mehrpraxis-Relevanz.

### Priorität 1 – Hoher Mehrwert, geringes Risiko

Diese Checkpoints haben einen klar abgrenzbaren variablen Anteil und einen stabilen
Textkern. Eine Instanz-Modellierung hätte sofortigen Nutzen für jede zweite Praxis.

| Checkpoint-ID | Cluster | Begründung |
|---|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | C (WT-2) | Jede Praxis hat andere Zeiten; Textstruktur ist trivial parametrisierbar; deprecated Vorgänger zeigt bereits Migrationspressoreerfahrung |
| `DIGITAL_REQUEST_PROCESSING_TIME` | D (WT-4) | Direktes Praxis-SLA; minimal 2 Zahlenwerte; breites Anwendungsspektrum |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | A (WT-1) | Einziger Buchungscode-Checkpoint ohne Sonderlogik; sauberster Normalfall |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | A (WT-1) | Wie CHRONIC_CONTROL, sehr klare Semantik |
| `ONBOARDING_DOCTOLIB_INFO` | E (WT-5) | Plattformname 3× – hohe Änderungswahrscheinlichkeit bei Plattformwechsel |

### Priorität 2 – Mittlerer Aufwand, solider Nutzen

Diese Checkpoints sind parametrisierbar, haben aber einen Sonderfall oder eine
Abhängigkeit zu einem anderen Checkpoint.

| Checkpoint-ID | Cluster | Sonderbedingung |
|---|---|---|
| `LAB_APPOINTMENT_INTERNAL` | A (WT-1) | Teilt Code `LKBP25` mit `APPOINTMENT_BOOK_EKG_ORDER` – erst nach Klärung des Code-Konflikts migrieren |
| `APPOINTMENT_BOOK_EKG_ORDER` | A (WT-1) | Wie `LAB_APPOINTMENT_INTERNAL` – Code-Konflikt zuerst klären |
| `IMMUNIZATION_BOOK_VACCINATION` | B (WT-3) | Letzter Pfadschritt ist inhärent variabel (Impfstoffauswahl) – erfordert Listenformat statt statischen Strings |
| `IMMUNIZATION_BOOK_COUNSELING` | B (WT-3) | Wie VACCINATION – zusammen migrieren |
| `BILLING_INVOICE_TIMING` | F (WT-6) | Hat Abhängigkeit zu `BILLING_EXTERNAL_PROVIDER`; am besten als Paar migrieren |
| `BILLING_EXTERNAL_PROVIDER` | F (WT-6) | Wie `BILLING_INVOICE_TIMING` |

### Priorität 3 – Instanziierung möglich, aber Sonderlogik vorhanden

Diese Checkpoints haben Zusatzfelder oder fachliche Abhängigkeiten, die eine einfache
Parametrisierung erschweren. Vorerst statisch lassen.

| Checkpoint-ID | Cluster | Sonderbedingung |
|---|---|---|
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | A (WT-1) | Eingebetteter Vorbedingungshinweis ("erst wenn Laborwerte vorliegen") ist klinische Logik, kein reiner Betriebsparameter; Impfpass-Hinweis ist Vorbereitungsinfo – zwei unterschiedliche Dimensionen |
| `LAB_APPOINTMENT_CHECKUP` | B (WT-3) | Expliziter Kein-Code-Satz: strukturell einfach, aber der Termin "Check-Up - 1. Termin" steht in direkter semantischer Beziehung zu `APPOINTMENT_BOOK_CHECKUP_SECOND` (Check-Up 2) – müssen als Paar gedacht werden |
| `APPOINTMENT_BOOK_GENERAL` | B (WT-3) | Fallback-Satz ("Falls Sie unsicher sind...") ist eine redaktionelle Stilentscheidung, keine reine Praxisvariable |
| `DOCUMENT_UPLOAD` | E (WT-5) | Einzelner Parameter, aber GLOBAL / SHARED_BOTTOM – Scope-Änderungen haben weitreichende Auswirkungen |
| `TECH_VIDEO_NOT_WORKING` | E (WT-5) | Support-Kontakt-Parameter trivial, aber Checkpoint ist EXPLANATION + hat `specificRole: "CHANNEL_NOT_SUITABLE"` – Scope-Semantik zuerst verstehen |

---

## 7. Welche Checkpoints bleiben vorerst bewusst statisch?

### 7a. Fachlich universelle Checkpoints mit oberflächlich praxisähnlichem Muster

Folgende Checkpoints klingen praxisindividuell, sind aber fachlich universell und
dürfen nicht in die Workflow-Parametrisierung geraten:

| Checkpoint-ID | Scheinbare Praxisähnlichkeit | Warum statisch bleiben |
|---|---|---|
| `APPOINTMENT_BOOKING_CODE_REQUIRED` | Erwähnt Buchungscode-Konzept | Ist reine EXPLANATION (M2-Schalter), kein ACTION; kommuniziert keine Buchungsanleitung |
| `ACUTE_BOOKING_INFO` | Enthält Vorlaufzeit 24h und Video-Angebot | Aussagen sind praxisindividuell, aber der Checkpoint ist semantisch ein Policy-Statement kein Workflow |
| `NO_HOME_VISITS` | Formuliert praxisseitige Entscheidung | Ist EXPLANATION mit `specificRole: "CHANNEL_NOT_SUITABLE"` – keine Handlungsanleitung |
| `ADULTS_ONLY_PRACTICE` | Formuliert praxisseitige Entscheidung | Wie `NO_HOME_VISITS` |
| `LAB_FASTING_REQUIRED` | Enthält konkrete Stundenzahl | 8-Stunden-Regel ist medizinische Empfehlung, kein Betriebsparameter – Abweichungen wären klinisch riskant |

### 7b. Checkpoints mit mehreren Parametern, die klinische Logik überlagern

| Checkpoint-ID | Problem |
|---|---|
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | Vorbedingungshinweis ("Laborwerte abwarten") ist klinische Sequenzlogik – darf nicht als freier Parameter behandelt werden |
| `LAB_SELF_PAYER_NOTE` | Enthält "direkt über das Labor" als impliziten Partnerlabor-Verweis; Änderung berührt GOÄ-Abrechnungsaussagen |
| `BILLING_ONSITE_PAYMENT` | Scopeänderung von SPECIFIC zu GLOBAL würde implizit alle Profile betreffen; Kartenzahlungsaussagen sind nicht praxis-individuell, nur die Zahlungsarten |
| `PAYMENT_ONSITE_INFO` | Wie `BILLING_ONSITE_PAYMENT` – die beiden Checkpoints überlappen inhaltlich; erst bereinigen, dann parametrisieren |

---

## 8. Doppelter Buchungscode `LKBP25` – offene Frage

`LAB_APPOINTMENT_INTERNAL` und `APPOINTMENT_BOOK_EKG_ORDER` teilen denselben Code
`LKBP25`, navigieren aber in vollständig verschiedene Teilbäume des Buchungskalenders:

| Checkpoint | Pfad | Code |
|---|---|---|
| `LAB_APPOINTMENT_INTERNAL` | Labor → Ärztliche Anordnung → Blutwerte | `LKBP25` |
| `APPOINTMENT_BOOK_EKG_ORDER` | Hausarzt / Allgemeinmediziner → Vor Ort → Ärztliche Anordnung | `LKBP25` |

Mögliche Erklärungen:
1. **Korrekt und gewollt:** Das Buchungssystem unterscheidet nicht nach Terminart,
   sondern nur nach Ordination. Ein einziger Code reicht für beide Anordnungstypen.
2. **Altlast:** `APPOINTMENT_BOOK_EKG_ORDER` wurde ursprünglich als Kopie von
   `LAB_APPOINTMENT_INTERNAL` angelegt und der Code nie angepasst.
3. **Unterschiedliche Codes, aber gleiche Buchungslogik:** Beide Anordnungsarten teilen
   aus Buchungssystemsicht dieselbe Terminart-Konfiguration.

**Empfehlung:** Vor einer Workflow-Instanziierung dieser beiden Checkpoints muss die
korrekte Code-Zuweisung durch fachliche Prüfung am Buchungssystem verifiziert werden.
Bis dahin: beide Checkpoints statisch lassen.

---

## 9. Was weiterhin nicht gebaut werden soll

### Keine Workflow-Instanzen aus freiem Text

Praxen konfigurieren Workflow-Parameter über eine abgeschlossene Parameterliste (vgl.
Abschnitt 4 in `practice-config-audit.md`). Sie geben keinen freien Text in
Textkern-Felder ein. Der Textkern bleibt zentral versioniert.

### Keine automatische Workflow-Typ-Erkennung

Das System erkennt nicht selbstständig, welcher Workflow-Typ für einen bestimmten
Checkbox-Status aktiviert werden soll. Workflow-Instanzen werden je Praxis manuell
konfiguriert und durch zentrale Prüfung freigegeben.

### Keine Workflow-Instanzen vor vollständiger Variablenliste

Eine Instanz ist nur dann sinnvoll, wenn alle ihre Parameter vollständig bekannt und
validiert sind. Kein Checkpoint wird instanziiert, bevor seine vollständige
Parameterliste für mindestens zwei Praxen ausgefüllt und geprüft wurde.

### Keine Zusammenführung verschiedener Cluster in einen Mega-Typ

Cluster A und B (beide mit Navigation) haben strukturell Ähnlichkeiten, aber
semantisch unterschiedliche Implikationen (Code-Pflicht vs. Kein-Code). Eine
Zusammenführung würde zu komplexen Bedingungslogiken führen, die die Übersichtlichkeit
der Parameterliste zerstören.

### Keine Template-Engine in `textByStatus`-Strings

Wie in `practice-config-audit.md` dokumentiert: `{{ variable }}`-Interpolation in
`textByStatus` berührt den Kern-Renderpfad aller aktiven Sessions und kann erst
eingebaut werden, wenn Snapshot-Semantik und Migrations-Strategie definiert sind.

---

## 10. Empfohlene Reihenfolge der Bearbeitung

| Schritt | Aktion | Voraussetzung | Risiko |
|---|---|---|---|
| **1** | Code-Konflikt `LKBP25` fachlich klären | Zugang zum Buchungssystem | Gering (rein dokumentarisch) |
| **2** | Praxis-Parameterliste für `ACUTE_OPEN_CONSULTATION_ACTION` und `DIGITAL_REQUEST_PROCESSING_TIME` als JSON-Datei je Praxis befüllen | Abschnitt 3 in `practice-config-audit.md` | Keines (keine Code-Änderung) |
| **3** | Praxis-Parameterliste für alle WT-1 Checkpoints außer `APPOINTMENT_BOOK_CHECKUP_SECOND` befüllen | Schritt 1 abgeschlossen | Keines (keine Code-Änderung) |
| **4** | Praxis-Parameterliste für Cluster E (Plattform) befüllen | Plattformname und Support-Kontakt von Praxis bestätigt | Keines (keine Code-Änderung) |
| **5** | Praxis-Parameterliste für Cluster F (Abrechnung) befüllen | Abrechnungsrhythmus von Praxis bestätigt | Keines (keine Code-Änderung) |
| **6** | Technische Parametrisierung: WT-2 und WT-4 (einfachste Struktur, 2–3 Parameter) | Schritte 2–5 abgeschlossen und geprüft | Mittel (Eingriff in textByStatus) |
| **7** | Technische Parametrisierung: WT-1 Standardfälle | Schritt 6 stabil, Snapshot-Strategie definiert | Mittel |
| **8** | `APPOINTMENT_BOOK_CHECKUP_SECOND` gesondert behandeln | Fachliche Einigung über Vorbedingungslogik | Hoch (klinische Logik betroffen) |
