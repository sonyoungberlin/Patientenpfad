# Practice Parameter Boundaries

## 1. Ziel

Das Inquiry-System soll für mehrere Praxen skalierbar werden — ohne zu einem frei konfigurierbaren Workflow- oder Template-System zu werden. Das bedeutet: Praxen erhalten eigene Betriebsparameter, aber keine eigene Kommunikations- oder Entscheidungslogik.

## 2. Grundprinzip

**Praxisparameter ≠ Kommunikationslogik**

Praxisparameter dürfen ausschließlich lokale Betriebsparameter verändern — Buchungscodes, Plattformnamen, Zeitfenster, Praxisregeln. Sie dürfen **nicht** medizinische Logik, Kommunikationslogik oder UX-Verhalten steuern.

Was sich zwischen Praxen unterscheidet: Betriebsparameter.  
Was praxisübergreifend identisch bleibt: Checkpoint-Struktur, Satzlogik, Entscheidungslogik.

## 3. Was Praxisparameter sind

Praxisparameter sind skalare Werte, die einen lokalen Betriebskontext beschreiben und plausibel zwischen Praxen variieren — ohne die fachliche oder kommunikative Bedeutung einer Aussage zu verändern.

**Aktuelle Felder in `practiceConfig.ts` (reale Beispiele):**

| Kategorie | Feldname | Beispielwert |
|---|---|---|
| Plattform | `uploadPlatformName` | `"Doctolib"` |
| Plattform | `uploadPlatformAccountLabel` | `"Doctolib-Account"` |
| Plattform | `videoSupportContact` | `"Doctolib Support"` |
| Buchungscode | `doctorOrderBookingCode` | `"LKBP25"` |
| Buchungscode | `findingsReviewBookingCode` | `"BFSP25"` |
| Buchungscode | `chronicControlBookingCode` | `"CHKT25"` |
| Buchungscode | `checkupSecondBookingCode` | `"CHECK25"` |
| Buchungskalender | `bookingCalendarName` | `"Online-Buchungskalender"` |
| SLA | `digitalRequestProcessingTimeMin` | `8` |
| SLA | `digitalRequestProcessingTimeMax` | `12` |
| SLA | `digitalRequestProcessingTimeUnit` | `"Stunden"` |
| Sprechstunde | `openConsultationDays` | `"täglich"` |
| Sprechstunde | `openConsultationHours` | `"9–10 Uhr"` |
| Zahlungsarten | `paymentMethodsAccepted` | `["EC", "Kreditkarte"]` |
| Partner | `billingPartnerName` | `"Partnerlabor"` |
| Abrechnung | `billingCycleLabel` | `"quartalsweise"` |
| Praxisregel | `homeVisitsOffered` | `false` |
| Praxisregel | `adultsOnlyPractice` | `true` |
| Praxisregel | `prescriptionPostalDeliveryAllowed` | `false` |

## 4. Was bewusst Produktlogik bleibt

Folgende Bestandteile des Inquiry-Systems sind keine Praxisparameter und werden nicht parametrisiert:

**Medizinische Entscheidungslogik** — welcher Checkpoint wann greift, welche Bedingung zu welcher Antwort führt.

**Checkpoint-Struktur** — Reihenfolge von Aussagen, Aufbau eines Checkpoint-Textes, welche Sätze aufeinander folgen.

**Unsicherheits- und Fallbacktexte** — z. B. „Falls Sie unsicher sind, welcher Termin für Ihr Anliegen passt, geben Sie uns bitte kurz eine Rückmeldung." (`APPOINTMENT_BOOK_GENERAL`) — das ist Produkt-UX-Sprache, nicht praxisspezifisch.

**Generische Navigationsanweisungen** — „Wählen Sie:" / „passende Terminart" (`APPOINTMENT_BOOK_GENERAL`) — diese gelten für alle Praxen mit demselben Buchungskalender-Typ.

**Nummerierte Ablaufstrukturen** — die Buchungspfade in `APPOINTMENT_BOOK_EKG_ORDER` (`1. Hausarzt / Allgemeinmediziner`, `2. Vor Ort`, `3. Ärztliche Anordnung`) und `LAB_APPOINTMENT_INTERNAL` (`1. Labor`, `2. Ärztliche Anordnung`, `3. Blutwerte`) sind Doctolib-UI-Navigationspfade, die plattformseitig festgelegt sind — sie werden nicht parametrisiert, auch wenn sie hardcodiert wirken.

**Allgemeine Kommunikationssprache** — Anredeform, Satzstruktur, Erklärungstiefe. Diese sind Produkt-Entscheidungen, keine Praxisparameter.

## 5. Erkenntnisse aus den bisherigen Refactorings

**Einfache String-Parameter funktionieren stabil.** Template-Literals mit `${_cfg.feldname}` sind wartbar, lesbar und erzeugen keine Abstraktionsschicht.

**Gemeinsam genutzte Parameter sind möglich.** `doctorOrderBookingCode` wird von `APPOINTMENT_BOOK_EKG_ORDER` und `LAB_APPOINTMENT_INTERNAL` geteilt — beide Checkpoints meinen denselben Termintyp „Ärztliche Anordnung". Das ist fachlich korrekt und wurde explizit so entschieden.

**Navigationstexte wirken variabel, sind aber oft Produktsprache.** Die Buchungspfad-Schritte in den `APPOINTMENT_BOOK_*`-Checkpoints erscheinen parametrierbar, sind aber plattformseitig stabile UI-Labels. Nicht jeder variabel wirkende Text ist ein echter Praxisparameter.

**Nicht jede Wiederholung rechtfertigt Parametrisierung.** Wenn derselbe Wert in zwei Checkpoints vorkommt, ist das kein automatischer Grund für ein Config-Feld — erst wenn unterschiedliche Praxen plausibel unterschiedliche Werte hätten.

**Arrays, Builder und Workflowdefinitionen bewusst vermeiden.** `paymentMethodsAccepted` ist ein Array, aber die Verwendung im Katalog muss als einfacher Freitext-Join lesbar bleiben — kein Runtime-Builder, keine Template-Engine.

## 6. Anti-Patterns

Die folgenden Konzepte werden in dieser Architektur bewusst **nicht** gebaut:

- **Freie Checkpoint-Erstellung durch Praxen** — Praxen konfigurieren Parameter, nicht Checkpoints
- **Freie Workflowdefinition** — Reihenfolge und Logik sind statisch im Code
- **Generische Template-Engine** — keine Laufzeit-Textgenerierung aus Variablen
- **Runtime-String-Builder** — keine Funktion, die Checkpoint-Texte aus Teilen zusammenbaut
- **Konfigurierbare medizinische Entscheidungslogik** — kein konfigurierbares Regelwerk
- **Frei definierbare Navigationspfade** — Buchungspfade sind Produktentscheidungen
- **Parametrisierte UX-/Fallbacksprache** — Unsicherheitshinweise, Rückmeldeaufforderungen und allgemeine Anweisungen bleiben hartcodiert

## 7. Entscheidungsregel für neue Praxisparameter

Ein neuer Praxisparameter in `practiceConfig.ts` ist nur zulässig, wenn alle folgenden Bedingungen erfüllt sind:

1. Er ist ein echter lokaler Betriebsparameter (kein Kommunikationsstil, keine Logik)
2. Mehrere Praxen hätten plausibel unterschiedliche Werte
3. Die medizinische Bedeutung der Aussage bleibt unverändert
4. Die Kommunikationslogik des Checkpoints bleibt unverändert
5. Der resultierende Text bleibt ohne Kontextwissen lesbar
6. Keine Workflow-Engine, kein Builder und kein neuer Typ wird nötig

Wenn eine dieser Bedingungen nicht erfüllt ist, bleibt der Text hartcodiert — auch wenn er einen variablen Wert enthält.

## 8. Aktueller Architekturstatus

Folgende Parameterklassen sind bereits erfolgreich in `inquiryCheckpointCatalog.ts` angebunden:

| Klasse | Felder | Checkpoints |
|---|---|---|
| Plattformparameter | `uploadPlatformName`, `uploadPlatformAccountLabel`, `videoSupportContact` | `DOCUMENT_UPLOAD`, `ONBOARDING_DOCTOLIB_INFO`, `TECH_VIDEO_NOT_WORKING` |
| SLA-/Zeitparameter | `digitalRequestProcessingTimeMin/Max/Unit`, `openConsultationDays/Hours`, `openConsultationCapacityLimited` | `DIGITAL_REQUEST_PROCESSING_TIME`, `ACUTE_OPEN_CONSULTATION_ACTION` |
| Buchungscodes (spezifisch) | `findingsReviewBookingCode`, `chronicControlBookingCode`, `checkupSecondBookingCode` | `APPOINTMENT_BOOK_FINDINGS_REVIEW`, `APPOINTMENT_BOOK_CHRONIC_CONTROL`, `APPOINTMENT_BOOK_CHECKUP_SECOND` |
| Buchungscodes (geteilt) | `doctorOrderBookingCode` | `APPOINTMENT_BOOK_EKG_ORDER`, `LAB_APPOINTMENT_INTERNAL` |
| Buchungskalender | `bookingCalendarName` | alle `APPOINTMENT_BOOK_*`-Checkpoints mit Code |

**Die Architektur bleibt aktuell bewusst statisch und codebasiert.** Es gibt keine Datenbank, keine Runtime-Konfiguration und keine dynamische Checkpoint-Generierung. `practiceConfig.ts` ist die einzige Konfigurationsschicht — eine Compile-Time-Konstante, kein Laufzeitobjekt.
