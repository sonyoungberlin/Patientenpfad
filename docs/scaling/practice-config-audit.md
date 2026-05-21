# Practice Config Audit – Skalierungsanalyse Inquiry-System

**Stand:** Mai 2026  
**Scope:** `lib/inquiries/inquiryCheckpointCatalog.ts`, `lib/inquiries/inquiryProfileCatalog.ts`  
**Status:** Reine Inventur / Analyse – kein Produktcode geändert

---

## 1. Ziel des Audits

Das Inquiry-System enthält aktuell einen einzigen statischen Checkpoint-Katalog, der
medizinisch-universelle Logik und praxisindividuelle Betriebsparameter vermischt. Ziel
dieses Audits ist es, diese beiden Anteile klar voneinander zu trennen – als Grundlage
für eine spätere kontrollierte Mehrpraxis-Fähigkeit.

### Leitprinzipien

- **CORE-Kommunikation bleibt zentral gepflegt.** Medizinisch-rechtliche Aussagen
  (Rückdatierungsfristen, D-Arzt-Pflicht, BtM-Regeln, Kassenleistungsrecht) sind
  niemals praxisseitig änderbar.
- **Keine freie Checkpoint-Erstellung durch Praxen.** Praxen parametrisieren
  vorhandene Bausteine; sie erstellen keine eigenen. (Begründung: Governance-Risiken
  bei `specificRole`, `boundActionConditions` und Tonalität – siehe Abschnitt 6.)
- **Kontrollierte Parametrisierung statt freier Anpassbarkeit.** Einzelne Werte
  (Buchungscodes, Sprechstundenzeiten, Plattformnamen) werden perspektivisch über eine
  abgeschlossene Variablenliste je Praxis konfiguriert – nicht über freien Text.

---

## 2. Klassifikation

| Gruppe | Bedeutung |
|---|---|
| **BASIC_NOW** | Kann unverändert in ein Mehrpraxis-Modell übernommen werden. Kein praxisindividueller Parameter im Text. |
| **BASIC_WITH_VARIABLES** | Fachlich CORE, enthält aber 1–3 praxisindividuelle Werte (Zeitangaben, Plattformnamen, URLs), die später über Variablen ersetzt werden. |
| **PRACTICE_WORKFLOW** | Sollte langfristig als eigenständiger Praxis-Workflow modelliert werden. Enthält zu viele fest eingebettete Parameter für eine einfache Variablensubstitution. |
| **HOLD_FOR_LATER** | Deprecated, selten, fachlich überholt oder noch ungeklärt. Nicht anfassen. |

---

## 3. Checkpoint-Tabelle

> Aufgeführt sind nur Checkpoints mit praxisindividuellem Anteil oder Sonderstatus.
> Alle reinen BASIC_NOW-Checkpoints ohne Parameter sind am Ende in einer Sammelliste
> aufgeführt.

### 3a. BASIC_WITH_VARIABLES

| Checkpoint-ID | Praxisindividueller Anteil | Vorgeschlagene Variable | Beispielwert (Testpraxis) | Empfehlung |
|---|---|---|---|---|
| `DIGITAL_REQUEST` | Link zum Formular fehlt im Text, URL ist praxisindividuell | `digitalRequestUrl` | `https://[praxis].doctolib.de/...` | Variable für URL ergänzen |
| `BOOK_APPOINTMENT` | „Online-Kalender" impliziert Plattform; URL fehlt | `bookingCalendarName`, `bookingCalendarUrl` | `"Online-Buchungskalender"` | Plattformname und URL variabilisieren |
| `APPOINTMENT_CANCEL_OR_RESCHEDULE` | „Online-Kalender" als Plattformverweis | `bookingCalendarName` | `"Online-Buchungskalender"` | Wie `BOOK_APPOINTMENT` |
| `APPOINTMENT_BOOKING_CODE_REQUIRED` | Konzept universell; welche Codes existieren ist PRACTICE_CONFIG | _(kein Text-Parameter, nur Konzept)_ | – | Checkpoint bleibt basic; Codes kommen aus Workflow-Typ WT-1 |
| `ACUTE_BOOKING_INFO` | Vorlaufzeit 24h und Videomöglichkeit praxisindividuell | `acuteBookingLeadTimeHours`, `videoConsultationOffered` | `24`, `true` | Beide Werte parametrisieren |
| `NO_HOME_VISITS` | Hausbesuche sind eine Praxisentscheidung | `homeVisitsOffered` | `false` | Boolean-Variable; bei `true` Checkpoint deaktivieren |
| `ADULTS_ONLY_PRACTICE` | Altersbeschränkung ist Praxisentscheidung | `adultsOnlyPractice` | `true` | Boolean-Variable |
| `LAB_FASTING_REQUIRED` | 8h-Angabe und Kaffee-Ausnahme praxisindividuell kommunizierbar | `fastingHours`, `fastingCoffeeNote` | `8`, `true` | Zeitwert und Kaffee-Ausnahme als Variablen; medizinische Kernregel bleibt fix |
| `LAB_RESULT_TIME` | „mehrere Tage" vage; konkrete Tagesangabe praxisabhängig | `labResultDaysTypical` | `"2–5"` | Variable optional; aktuell vage Formulierung ausreichend |
| `LAB_SELF_PAYER_NOTE` | „Abrechnung direkt über das Labor" setzt Partnerlabor voraus | `labBillingNote` | `"direkt über das Labor"` | Variable wenn kein Partnerlabor vorhanden |
| `LAB_APPOINTMENT_INDIVIDUAL` | Buchungsweg (online/telefonisch) praxisindividuell | `bookingChannelLabel` | `"Online-Buchungskalender"` | Kanalbezeichnung variabilisieren |
| `PHARMACY_INFORMATION` | Direkte Apothekenübermittlung setzt Plattformintegration voraus | `pharmacyDirectTransferSupported` | `true` | Boolean; bei `false` anderen Text |
| `PAYMENT_ONSITE_INFO` | Zahlungsarten praxisindividuell | `paymentMethodsAccepted` | `["EC", "Kreditkarte"]` | Liste der akzeptierten Zahlungsarten |
| `BILLING_ONSITE_PAYMENT` | Wie `PAYMENT_ONSITE_INFO` | `paymentMethodsAccepted` | `["EC", "Kreditkarte"]` | Gemeinsame Variable mit `PAYMENT_ONSITE_INFO` |
| `BILLING_EXTERNAL_PROVIDER` | „externen Abrechnungsdienstleister oder Partnerlabor" namentlich variabel | `billingPartnerName` | `"Partnerlabor"` | Partnername als Variable |
| `PRESCRIPTION_NO_POSTAL_DELIVERY` | Postversand ist eine Praxisentscheidung, nicht universell | `prescriptionPostalDeliveryAllowed` | `false` | Boolean; Checkpoint nur anzeigen wenn `false` |

### 3b. PRACTICE_WORKFLOW

| Checkpoint-ID | Workflow-Typ | Fest eingebettete Parameter | Empfehlung |
|---|---|---|---|
| `LAB_APPOINTMENT_INTERNAL` | WT-1: BOOKING_CODE_FLOW | Code `LKBP25`, Pfad `Labor → Ärztliche Anordnung → Blutwerte` | In WT-1-Instanz mit praxisseitig gesetzten Werten überführen |
| `LAB_APPOINTMENT_CHECKUP` | WT-3: PLATFORM_SPECIFIC_BOOKING | Terminbezeichnung `"Check-Up - 1. Termin (Basiswerte Labor)"` | In WT-3-Instanz überführen; Bezeichnung als Praxis-Parameter |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | WT-1: BOOKING_CODE_FLOW | Code `BFSP25`, Terminbezeichnung `"Befundbesprechung"` | WT-1-Instanz |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | WT-1: BOOKING_CODE_FLOW | Code `CHECK25`, Bezeichnung `"Check-Up - 2. Termin"`, Impfpass-Hinweis | WT-1-Instanz + Impfpass-Flag |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | WT-1: BOOKING_CODE_FLOW | Code `CHKT25`, Terminbezeichnung `"Chroniker-Kontrolltermin"` | WT-1-Instanz |
| `APPOINTMENT_BOOK_EKG_ORDER` | WT-1: BOOKING_CODE_FLOW | Code `LKBP25`, Pfad `Hausarzt → Vor Ort → Ärztliche Anordnung` | WT-1-Instanz; auffällig: Code = `LKBP25` wie Labor — prüfen ob korrekt |
| `APPOINTMENT_BOOK_GENERAL` | WT-3: PLATFORM_SPECIFIC_BOOKING | Pfad `Hausarzt / Allgemeinmedizin → passende Terminart` | WT-3-Instanz |
| `IMMUNIZATION_BOOK_VACCINATION` | WT-3: PLATFORM_SPECIFIC_BOOKING | Pfad `Labor → Impfung → gewünschte Impfung` | WT-3-Instanz |
| `IMMUNIZATION_BOOK_COUNSELING` | WT-3: PLATFORM_SPECIFIC_BOOKING | Pfad `Hausarzt / Allgemeinmedizin → Impfberatung` | WT-3-Instanz |
| `ACUTE_OPEN_CONSULTATION_ACTION` | WT-2: OPEN_CONSULTATION_SCHEDULE | Zeit `"täglich von 9–10 Uhr"`, Kapazitätshinweis | WT-2-Instanz mit Tagen und Uhrzeit als Parameter |
| `DIGITAL_REQUEST_PROCESSING_TIME` | WT-4: PROCESSING_TIME_SLA | `"8–12 Stunden"` als Praxis-SLA | WT-4-Instanz; Min/Max als Praxis-Parameter |
| `DOCUMENT_UPLOAD` | WT-5: PLATFORM_INFO | `"Doctolib Account"` direkt im Text einer GLOBAL-Action | Plattformname ersetzen oder WT-5 |
| `ONBOARDING_DOCTOLIB_INFO` | WT-5: PLATFORM_INFO | „Doctolib" dreifach im Text, inkl. Account-Bezeichnung | WT-5-Instanz mit Plattformname und Capabilities |
| `TECH_VIDEO_NOT_WORKING` | WT-5: PLATFORM_INFO | „Doctolib Support" als Support-Kontakt fest eingebettet | WT-5-Instanz; Support-Kontakt als Parameter |
| `BILLING_INVOICE_TIMING` | WT-6: BILLING_CYCLE | `"quartalsweise"` als Abrechnungsrhythmus | WT-6-Instanz; Rhythmus und Dienstleistername als Parameter |
| `LAB_DISCUSSION_PROCESS_CODE` | WT-4 / WT-1 | Automatischer Buchungscode-Versand nach Laborbefund | @deprecated, aber Muster relevant für künftige Automatisierung |

### 3c. HOLD_FOR_LATER

| Checkpoint-ID | Grund |
|---|---|
| `AU_DURATION_LIMIT` | @deprecated, inhaltlich überholt |
| `AU_CONTINUITY_REQUIRED` | @deprecated, falsch eingeordnet (Entscheidungsaussage statt Erklärung) |
| `AU_RETURN_TO_WORK` | @deprecated |
| `PRESCRIPTION_CONTROL_OVERDUE` | @deprecated |
| `PRESCRIPTION_KNOWN_MEDICATION` | @deprecated |
| `PRESCRIPTION_FOLLOW_UP` | @deprecated |
| `PRESCRIPTION_SPECIALIST_REQUIRED` | @deprecated, durch `PRESCRIPTION_SPECIALIST_RESPONSIBLE` abgelöst |
| `PRESCRIPTION_SPECIAL_TYPE` | @deprecated |
| `LAB_SELF_PAYER_IGEL` | @deprecated, enthält Partnerlabor-Namen und GOÄ-Verweis |
| `LAB_DISCUSSION_PROCESS_CODE` | @deprecated, aber Buchungscode-Automatismus-Muster für WT-1 relevant |
| `LAB_EXTERNAL_DOCUMENT_PRESENT` | @deprecated |
| `LAB_SELF_PAY` | @deprecated |
| `LAB_MEDICAL_INDICATION` | @deprecated |
| `LAB_CHECKUP_ELIGIBLE` | @deprecated, durch `LAB_CHECKUP_RULES` ersetzt |
| `LAB_VALUES_DEFINED` | @deprecated |
| `LAB_EXTERNAL_BILLING` | @deprecated, enthält Partnerlabor-Namen |
| `IS_NEW_PATIENT` | @deprecated, Global, durch profilspezifische Checkpoints ersetzt |
| `PATIENT_NOT_IN_GERMANY` | @deprecated, Global |
| `DOCTOR_REVIEW_REQUIRED` | @deprecated, Global |
| `DATA_INCOMPLETE` | @deprecated, Global |
| `IS_CHRONIC_PATIENT` | @deprecated, Global |
| `MEDICAL_CONSULTATION_REQUIRED` | @deprecated, Global |
| `TERMIN_PREPARATION_REQUIRED` | @deprecated |
| `OPEN_CONSULTATION_INFO` | @deprecated, durch `ACUTE_OPEN_CONSULTATION_ACTION` ersetzt |
| `NO_FIXED_TIME` | @deprecated |
| `CAPACITY_LIMIT` | @deprecated |
| `ACUTE_ONLY_LIMIT` | @deprecated, durch `ACUTE_EXCLUSION` ersetzt |
| `WAITING_TIME` | @deprecated |
| `ACUTE_OPEN_CONSULTATION_INFO` | @deprecated (EXPLANATION), durch ACTION-Variante ersetzt |
| `REF_DOCTOR_CONTACT_REQUIRED` | @deprecated |
| `APPOINTMENT_PROCESS_MULTI_STEP` | @deprecated |
| `APPOINTMENT_PREPARATION_REQUIRED` | @deprecated |
| `APPOINTMENT_DOCUMENT_MISSING` | @deprecated |
| `APPOINTMENT_VIDEO_LIMITATIONS` | @deprecated |
| `APPOINTMENT_VIDEO_REQUIREMENTS` | @deprecated |
| `ONBOARDING_DOCUMENT_MISSING` | @deprecated, durch GKV/PKV-Splits ersetzt |
| `BILLING_PROCESS_EXTERNAL` | @deprecated |
| `BILLING_DATA_MISSING` | @deprecated |
| `IMMUNIZATION_PASS_MISSING` | @deprecated, durch `IMMUNIZATION_VACCINATION_RECORD_MISSING` ersetzt |
| `IC01`–`IC06` | Legacy v1-Katalog, vollständig durch V2 abgelöst |

### 3d. BASIC_NOW (Sammelliste – kein Handlungsbedarf)

Alle folgenden Checkpoints sind fachlich universell formuliert und enthalten keine
praxisindividuellen Parameter. Sie können unverändert in ein Mehrpraxis-Modell
übernommen werden.

**AU:** `AU_DECISION`, `AU_BACKDATE_LIMIT`, `AU_WORK_ACCIDENT`, `AU_CHILD_SICK`,
`AU_FOLLOWUP_REQUIRES_VISIT`, `AU_MISSING_EGK`, `AU_MISSING_QUESTIONNAIRE`,
`AU_NEW_PATIENT_LIMIT`, `AU_NEW_PATIENT_3DAY_LIMIT`, `AU_MEDICAL_CONSULTATION_REQUIRED`,
`AU_DIGITAL_AU_PROCESS`, `AU_NO_APPOINTMENT_ACUTE`, `AU_FOLLOWUP`,
`AU_EXTENSION_REQUIRES_EXAMINATION`, `EAU_VALID_WITHOUT_SIGNATURE`,
`RETURN_TO_WORK_ALLOWED_DURING_AU`

**Rezept:** `PRESCRIPTION_DECISION`, `PRESCRIPTION_MEDICATION_UNCLEAR`,
`PRESCRIPTION_DOSAGE_UNCLEAR`, `PRESCRIPTION_MEDICATION_NOT_DOCUMENTED`,
`PRESCRIPTION_INDICATION_NOT_DOCUMENTED`, `PRESCRIPTION_DOCTOR_REVIEW_REQUIRED`,
`PRESCRIPTION_FOLLOWUP_REQUIRED_IN_PERSON`, `PRESCRIPTION_SPECIALIST_REPORT_REQUIRED`,
`PRESCRIPTION_BTM_ADHS_RULES`, `PRESCRIPTION_GYN_EXCLUSIVITY`,
`PRESCRIPTION_SPECIALIST_RESPONSIBLE`, `PRESCRIPTION_PRIVATE_ONLY`,
`PRESCRIPTION_NO_PRESCRIPTION_REQUIRED`, `PRESCRIPTION_STATUTORY_POSSIBLE`,
`PRESCRIPTION_PATIENT_NOT_IN_GERMANY`, `PRESCRIPTION_CHRONIC_PATIENT`,
`PRESCRIPTION_INSURANCE_PROOF_MISSING`, `CONTRACEPTION_SPECIALIST_ONLY`,
`HOSPITAL_DISCHARGE_REPORT_MISSING`, `PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK`

**Labor:** `LAB_DECISION`, `LAB_CHECKUP_RULES`, `LAB_MPU_EXCLUSION`, `LAB_INTERNAL_ORDER`,
`LAB_EXTERNAL_REFERRAL`, `LAB_INTERNAL_ORDER_AVAILABLE`, `LAB_INTERNAL_ORDER_MISSING`,
`LAB_CHECKUP_BASIC_LAB_INCLUDED`, `LAB_RESULTS_PENDING`, `LAB_CONTROL_TIMING_NOT_DUE`,
`LAB_SELF_PAYER_POSSIBLE`, `LAB_MEDICAL_CONSULTATION_REQUIRED`,
`LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED`, `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED`,
`LAB_BRING_REFERRAL`, `LAB_COST_COVERED_BY_REFERRAL`, `LAB_APPOINTMENT_DOCTOR`

**Akut:** `ACUTE_CARE_DECISION`, `ACUTE_PURPOSE`, `ACUTE_EXCLUSION`, `CHRONIC_EXCLUSION`,
`INFECTIOUS_PROTOCOL`, `INFECTIOUS_CONTACT_DIGITALLY`, `INFECTIOUS_VIDEO_CONSULTATION`,
`INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED`

**Impfung:** `IMMUNIZATION_DECISION`, `IMMUNIZATION_STANDARD_AVAILABLE`,
`IMMUNIZATION_STATUS_UNCLEAR`, `IMMUNIZATION_VACCINATION_RECORD_MISSING`,
`IMMUNIZATION_RISK_REVIEW_REQUIRED`, `IMMUNIZATION_TRAVEL_MEDICINE`,
`IMMUNIZATION_BRING_VACCINATION_RECORD`

**Termin:** `APPOINTMENT_CAN_BE_BOOKED`, `APPOINTMENT_WRONG_TYPE`,
`APPOINTMENT_TYPE_QUESTION`, `APPOINTMENT_DATA_INCOMPLETE`,
`APPOINTMENT_IN_PERSON_REQUIRED_FOR_REQUEST`, `APPOINTMENT_EXTERNAL_FINDING_PRESENT`,
`APPOINTMENT_EXTERNAL_FINDING_LONG_ABSENCE`, `APPOINTMENT_REASON_UNCLEAR`,
`VIDEO_CONSULTATION_REGION_LIMITATION`, `APPOINTMENT_INSURANCE_PROOF_MISSING`,
`APPOINTMENT_INTERNAL_ORDER_EKG`, `APPOINTMENT_INFO_TYPE_PURPOSE`,
`APPOINTMENT_INFO_BLOOD_DRAW_NOT_DOCTOR_VISIT`, `APPOINTMENT_INFO_VIDEO_SCOPE`,
`APPOINTMENT_INFO_IN_PERSON_REQUIRED`, `APPOINTMENT_INFO_CHECKUP_PURPOSE`,
`APPOINTMENT_INFO_CHRONIC_CONTROL_PURPOSE`,
`APPOINTMENT_INFO_SHORT_NOTICE_CANCELLATION_IMPACT`,
`APPOINTMENT_INFO_BOOKING_RESTRICTED_AFTER_NO_SHOW`,
`APPOINTMENT_INFO_BOOKING_REENABLED_AFTER_CLARIFICATION`

**Überweisung:** `REFERRAL_DECISION`, `REF_PSYCHOTHERAPY_FIRST_STEP`,
`REF_SPECIALTY_REQUIRED`, `REF_ORIGINAL_VS_PDF`, `REF_HAV_CASE`,
`REFERRAL_CAN_BE_ISSUED`, `REFERRAL_INSURANCE_PROOF_MISSING`,
`REF_MEDICAL_CONSULTATION_REQUIRED`, `REF_BOOKING_CODE_PROCESS`

**Global-Actions:** `CONTACT_PERSON_INFO`, `CARE_CHANNEL_CHOICE`,
`CONTROL_APPOINTMENT_RECOMMENDED`, `E_RECIPE_USE`, `INSURANCE_DATA_APP_TRANSFER`,
`PROCESSING_DELAY`, `TECHNICAL_ISSUE`, `URINE_SAMPLE_ONSITE`

**Proben:** `SAMPLE_COLLECTION_DECISION`, `SAMPLE_COLLECTION_ORDER_AVAILABLE`,
`SAMPLE_COLLECTION_INFORMATION_INCOMPLETE`, `SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING`,
`URINE_SAMPLE_INSTRUCTIONS`, `STOOL_SAMPLE_INSTRUCTIONS`, `SAMPLE_HANDOVER`

**HMV / Einweisung / Atteste:** `HMV_REQUEST_COMPLETE`, `HMV_INFO_MISSING`,
`HMV_PREVIOUS_ORDER_MISSING`, `HMV_DOCTOR_REVIEW_REQUIRED`, `HMV_IN_PERSON_REQUIRED`,
`HMV_NOT_DIGITAL_POSSIBLE`, `HOSPITAL_ADMISSION_DECISION`,
`HOSPITAL_ADMISSION_CAN_BE_ISSUED`, `HOSPITAL_ADMISSION_MISSING_INFO`,
`HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED`, `HOSPITAL_TRANSPORT_REQUIRED`,
`MEDICAL_DOCUMENTS_DECISION`, `MEDICAL_DOCUMENT_POSSIBLE`,
`MEDICAL_DOCUMENT_PRIVATE_SERVICE`, `MEDICAL_DOCUMENT_INFO_MISSING`,
`MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED`, `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED`,
`SUSPECTED_DIAGNOSIS_EXPLANATION`

**Onboarding:** `ONBOARDING_DATA_INCOMPLETE`, `ONBOARDING_DATA_UPDATE_REQUIRED`,
`ONBOARDING_GKV_DOCUMENT_MISSING`, `ONBOARDING_PKV_PAS_MISSING`,
`ONBOARDING_IDENTITY_MISMATCH`, `ONBOARDING_WRONG_PRACTICE`,
`ONBOARDING_PRIMARY_CARE_CONFIRMATION`, `INSURANCE_NUMBER_INVALID_FORMAT`

**Abrechnung:** `BILLING_COST_NOT_COVERED`, `BILLING_ADDRESS_MISSING`,
`BILLING_DOCUMENT_MISSING`, `BILLING_NOT_COVERED_BY_STATUTORY`, `BILLING_GOA_BILLING`,
`BILLING_EXTERNAL_RESPONSIBILITY`, `BILLING_ADDRESS_UPDATE_REQUESTED`,
`BILLING_CONTACT_EXTERNAL_PARTY`

**Tech:** `TECH_VIDEO_NOT_WORKING` _(WT-5, aber hier auch basic falls Plattformname
parametrisiert)_, `TECH_UPLOAD_FAILED`

---

## 4. Vorgeschlagene Variablen

Vollständige Liste aller praxisseitig konfigurierbaren Werte, die perspektivisch als
Variablen je Praxis gesetzt werden sollen. Kein aktueller Code verwendet diese Variablen;
dies ist reine Inventur.

| Variablenname | Typ | Beispielwert (Testpraxis) | Betroffene Checkpoints |
|---|---|---|---|
| `bookingCalendarName` | `string` | `"Online-Buchungskalender"` | `BOOK_APPOINTMENT`, `APPOINTMENT_CANCEL_OR_RESCHEDULE`, `LAB_APPOINTMENT_INDIVIDUAL` |
| `bookingCalendarUrl` | `url` | _(praxisspezifisch)_ | `BOOK_APPOINTMENT` |
| `digitalRequestUrl` | `url` | _(praxisspezifisch)_ | `DIGITAL_REQUEST` |
| `openConsultationDays` | `string` | `"täglich"` | `ACUTE_OPEN_CONSULTATION_ACTION` |
| `openConsultationHours` | `string` | `"9–10 Uhr"` | `ACUTE_OPEN_CONSULTATION_ACTION` |
| `openConsultationCapacityLimited` | `boolean` | `true` | `ACUTE_OPEN_CONSULTATION_ACTION` |
| `digitalRequestProcessingTimeMin` | `number` | `8` | `DIGITAL_REQUEST_PROCESSING_TIME` |
| `digitalRequestProcessingTimeMax` | `number` | `12` | `DIGITAL_REQUEST_PROCESSING_TIME` |
| `digitalRequestProcessingTimeUnit` | `string` | `"Stunden"` | `DIGITAL_REQUEST_PROCESSING_TIME` |
| `fastingHours` | `number` | `8` | `LAB_FASTING_REQUIRED` |
| `fastingCoffeeNote` | `boolean` | `true` | `LAB_FASTING_REQUIRED` |
| `labResultDaysTypical` | `string` | `"2–5"` | `LAB_RESULT_TIME` |
| `labBillingNote` | `string` | `"direkt über das Labor"` | `LAB_SELF_PAYER_NOTE` |
| `uploadPlatformName` | `string` | `"Doctolib"` | `DOCUMENT_UPLOAD`, `ONBOARDING_DOCTOLIB_INFO` |
| `uploadPlatformAccountLabel` | `string` | `"Doctolib-Account"` | `DOCUMENT_UPLOAD`, `ONBOARDING_DOCTOLIB_INFO` |
| `videoSupportContact` | `string` | `"Doctolib Support"` | `TECH_VIDEO_NOT_WORKING` |
| `acuteBookingLeadTimeHours` | `number` | `24` | `ACUTE_BOOKING_INFO` |
| `videoConsultationOffered` | `boolean` | `true` | `ACUTE_BOOKING_INFO` |
| `homeVisitsOffered` | `boolean` | `false` | `NO_HOME_VISITS` |
| `pharmacyDirectTransferSupported` | `boolean` | `true` | `PHARMACY_INFORMATION` |
| `paymentMethodsAccepted` | `string[]` | `["EC", "Kreditkarte"]` | `PAYMENT_ONSITE_INFO`, `BILLING_ONSITE_PAYMENT` |
| `adultsOnlyPractice` | `boolean` | `true` | `ADULTS_ONLY_PRACTICE` |
| `billingPartnerName` | `string` | `"Partnerlabor"` | `BILLING_EXTERNAL_PROVIDER` |
| `billingCycleLabel` | `string` | `"quartalsweise"` | `BILLING_INVOICE_TIMING` |
| `prescriptionPostalDeliveryAllowed` | `boolean` | `false` | `PRESCRIPTION_NO_POSTAL_DELIVERY` |

---

## 5. Praxis-Workflow-Typen

Für PRACTICE_WORKFLOW-Checkpoints lassen sich folgende wiederverwendbare Typen
ableiten. Die Bezeichnungen sind konzeptuell – keine aktuelle Implementierung.

### WT-1: BOOKING_CODE_FLOW

Terminart-spezifische Buchungsanleitung mit Navigationsstruktur im Buchungskalender
und Buchungscode zur Terminbestätigung.

**Parameter:**
- `appointmentTypeLabel` – Bezeichnung der Terminart im Buchungskalender
- `bookingNavigationPath[]` – geordnete Liste der Kalender-Auswahlschritte
- `bookingCode` – alphanumerischer Code (z. B. `BFSP25`)
- `bookingCodeRequired` – ob der Code obligatorisch oder optional ist
- `additionalNote` – optionaler Freitext (z. B. Impfpass-Hinweis)

**Betroffene Checkpoints:**
`LAB_APPOINTMENT_INTERNAL`, `APPOINTMENT_BOOK_FINDINGS_REVIEW`,
`APPOINTMENT_BOOK_CHECKUP_SECOND`, `APPOINTMENT_BOOK_CHRONIC_CONTROL`,
`APPOINTMENT_BOOK_EKG_ORDER`

**Anmerkung:** `LAB_APPOINTMENT_INTERNAL` und `APPOINTMENT_BOOK_EKG_ORDER` verwenden
denselben Code `LKBP25`. Zu prüfen, ob dies fachlich korrekt ist oder eine Altlast.

---

### WT-2: OPEN_CONSULTATION_SCHEDULE

Offene Sprechstunde ohne Terminvereinbarung, mit Uhrzeit und ggf. Kapazitätshinweis.

**Parameter:**
- `openConsultationDays` – Wochentage (z. B. `"Mo–Fr"`, `"täglich"`)
- `openConsultationHours` – Uhrzeit als Freitext (z. B. `"9–10 Uhr"`)
- `capacityLimited` – ob explizit auf Kapazitätsbegrenzung hingewiesen wird
- `walkinAllowed` – ob ohne Anmeldung erscheinen möglich ist

**Betroffene Checkpoints:** `ACUTE_OPEN_CONSULTATION_ACTION`

---

### WT-3: PLATFORM_SPECIFIC_BOOKING

Buchungsanleitung mit plattformspezifischem Navigationspfad ohne Buchungscode.

**Parameter:**
- `platformName` – Bezeichnung der Buchungsplattform
- `bookingNavigationPath[]` – geordnete Liste der Auswahlschritte
- `codeRequired` – immer `false` bei diesem Typ

**Betroffene Checkpoints:**
`LAB_APPOINTMENT_CHECKUP`, `IMMUNIZATION_BOOK_VACCINATION`,
`IMMUNIZATION_BOOK_COUNSELING`, `APPOINTMENT_BOOK_GENERAL`

---

### WT-4: PROCESSING_TIME_SLA

Kommunikation einer praxisseitig definierten Bearbeitungszeit für digitale Anfragen.

**Parameter:**
- `processingTimeMin` – untere Grenze (Zahl)
- `processingTimeMax` – obere Grenze (Zahl)
- `processingTimeUnit` – Einheit (`"Stunden"`, `"Werktage"`)
- `noFollowupNote` – ob explizit auf Nachfrageverzicht hingewiesen wird

**Betroffene Checkpoints:** `DIGITAL_REQUEST_PROCESSING_TIME`

---

### WT-5: PLATFORM_INFO

Allgemeine Einführung in die genutzte Kommunikations- und Buchungsplattform, inkl.
Support-Kontakt.

**Parameter:**
- `platformName` – Eigenname der Plattform (z. B. `"Doctolib"`)
- `platformAccountLabel` – Bezeichnung des Nutzerkontos (z. B. `"Doctolib-Account"`)
- `platformCapabilities[]` – Liste der Funktionen, die erklärt werden sollen
- `supportContact` – Support-Bezeichnung oder URL

**Betroffene Checkpoints:**
`ONBOARDING_DOCTOLIB_INFO`, `DOCUMENT_UPLOAD`, `TECH_VIDEO_NOT_WORKING`

---

### WT-6: BILLING_CYCLE

Erklärung des Abrechnungsrhythmus und des externen Abrechnungsdienstleisters.

**Parameter:**
- `billingCycleLabel` – Rhythmus als Freitext (z. B. `"quartalsweise"`)
- `billingPartnerName` – Name des Dienstleisters oder Labors
- `invoiceOrigin` – wer die Rechnung ausstellt (`"Praxis"` | `"externer Dienstleister"`)

**Betroffene Checkpoints:** `BILLING_INVOICE_TIMING`, `BILLING_EXTERNAL_PROVIDER`

---

## 6. Was bewusst NICHT gebaut werden soll

### Kein freies Checkpoint-Bauen durch Praxen

Wenn Praxen eigene Checkpoints erstellen könnten, entstehen folgende unkontrollierbare
Risiken:

- **Falsche `specificRole`**: Die `specificRole` steuert die M3-Filterlogik
  (`relevantSpecificRoles` in ResponseGoals). Falsch gesetzte Rollen koppeln Checkpoints
  an falsche Antwortziele oder lassen sie unsichtbar.
- **Kaputte `boundActionConditions`**: Checkpoint-IDs in `showWhenAny`/`hideWhenAny`
  müssen exakt mit bekannten IDs übereinstimmen. Tippfehler sind Silent Failures.
- **Haftungsrelevante Aussagen**: Praxen könnten medizinische Garantien, falsche Fristen
  oder unzulässige Kostenzusagen formulieren.
- **Tonalitätsverlust**: Der Katalog verwendet eine konsistente juristische Passivform.
  Praxen würden aktive, umgangssprachliche oder werbliche Texte einbringen.
- **Katalogdrift**: Semantisch identische Checkpoints würden mit verschiedenen IDs
  entstehen; deprecated-Stapel wächst unkontrolliert.

### Keine freie Textbearbeitung der CORE-Logik

Checkpoints mit gesetzlichen Regelungen (`AU_BACKDATE_LIMIT`, `PRESCRIPTION_BTM_ADHS_RULES`,
`LAB_CHECKUP_RULES`, etc.) sind niemals praxisseitig editierbar. Änderungen an
medizinisch-rechtlichen Aussagen erfordern redaktionelle Freigabe und zentrale
Versionierung.

### Keine automatische Workflow-Auswahl

Das System entscheidet nicht selbstständig, welcher Workflow-Typ für ein Anliegen
aktiviert wird. Workflow-Instanzen werden manuell je Praxis konfiguriert und durch
zentrale Qualitätsprüfung freigegeben.

### Keine Template-Engine jetzt

Eine `{{ variable }}`-Interpolation in `textByStatus`-Strings wäre ein Eingriff in
den Kernpfad aller Nachrichten-Renderinglogik (`textByStatus`, `textByAudience`,
`docByStatus` gleichzeitig). Das betrifft alle aktiven Sessions und widerspricht der
dokumentierten „eingefrorenen Snapshot"-Garantie der Profile. Dieser Schritt kommt
erst, nachdem die Variablenliste vollständig validiert und eine Snapshot-Strategie
definiert ist.

### Keine DB-Migration jetzt

Praxis-Konfigurationswerte (Buchungscodes, Uhrzeiten, Plattformnamen) landen nicht
vor dem Variablen-Audit in einer Datenbanktabelle. Erst wenn klar ist, welche Werte
wirklich variabel sein müssen und wie die Snapshot-Semantik der Praxis-Konfiguration
aussieht, kann ein Schema entworfen werden.

---

## 7. Empfohlener nächster Schritt

### Schritt 1 (jetzt): Inventur-Datei ohne Code-Änderung

Dieses Dokument ist der erste und einzige empfohlene Schritt in dieser Phase.
Es beschreibt den Ist-Zustand vollständig, ohne irgendetwas am Produktivcode zu
berühren.

Ergebnis: Jeder Stakeholder kann nachvollziehen, welche Werte zur Praxis gehören und
welche zum System – ohne einen einzigen Test riskieren zu müssen.

### Schritt 2 (später): Kontrollierte Variablenliste je Praxis

Eine abgeschlossene JSON- oder TypeScript-Datei pro Praxis, die ausschließlich die in
Abschnitt 4 aufgeführten Variablen enthält. Kein Freitext, kein Schema-Freistil.
Beispiel:

```json
{
  "bookingCalendarName": "Online-Buchungskalender",
  "openConsultationDays": "täglich",
  "openConsultationHours": "9–10 Uhr",
  "digitalRequestProcessingTimeMin": 8,
  "digitalRequestProcessingTimeMax": 12,
  "fastingHours": 8,
  "videoConsultationOffered": true,
  "homeVisitsOffered": false,
  "adultsOnlyPractice": true,
  "uploadPlatformName": "Doctolib",
  "paymentMethodsAccepted": ["EC", "Kreditkarte"]
}
```

Dieser Schritt erfordert keine Template-Engine und keine DB-Migration. Die Werte
können zunächst rein dokumentarisch existieren.

### Schritt 3 (erst danach): Technische Parametrisierung

Erst wenn Schritt 2 für mindestens zwei Praxen vollständig ausgefüllt und geprüft ist,
kann eine Interpolationslösung für die betroffenen `textByStatus`-Strings entwickelt
werden. Priorität haben dabei die Checkpoints mit dem höchsten Praxis-Sichtbarkeitsgrad:
`ACUTE_OPEN_CONSULTATION_ACTION`, `DIGITAL_REQUEST_PROCESSING_TIME` und die
BOOKING_CODE_FLOW-Instanzen.
