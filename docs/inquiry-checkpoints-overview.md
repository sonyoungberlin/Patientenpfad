# Inquiry-Checkpoints – Vollständige Übersicht

Quelle: `lib/inquiries/inquiryCheckpointCatalog.ts`  
Stand: Mai 2026 · Nur lesende Ist-Analyse · Kein Commit.

---

## Legende

| Feld | Werte |
|---|---|
| **Typ** | `DECISION` · `EXPLANATION` · `ACTION` |
| **Scope** | `SPECIFIC` = profilgebunden · `GLOBAL` = profilübergreifend |
| **Placement** | `ATTACHED` = bleibt im Profilabschnitt · `SHARED_BOTTOM` = deduplicierter Fuß |
| **actionCategory** | `INFO` · `NEXT_STEP` · `PREPARATION` · `INTRO` · `SECTION_INTRO` · `PROCESS` |
| **specificRole** | `MEDICAL_REVIEW_REQUIRED` · `MISSING_INFORMATION` · `MISSING_DOCUMENT` · `EXTERNAL_RESPONSIBILITY` · `RULE_TIME_LIMIT` · `RULE_COST_COVERAGE` · `PROCESS_INFO` · `OUTCOME_INFO` · `CHANNEL_NOT_SUITABLE` |
| **Zielgruppe** | `patient` = nur Patient · `beide` = Patient + Kontaktperson-Text vorhanden |
| **Config?** | Ja = verwendet `_cfg`-Felder aus `PracticeInquiryConfig` |
| **Deaktivierbar** | Ja / Nein / Unklar + Begründung |

**Abkürzungen in Profile-Spalte:**  
`ACU`=ACUTE_CARE · `APP`=APPOINTMENT · `AU`=AU · `RX`=PRESCRIPTION · `DOC`=MEDICAL_DOCUMENTS · `HMV`=HEILMITTELVERORDNUNG · `REF`=REFERRAL · `HOSP`=HOSPITAL_ADMISSION · `IMM`=IMMUNIZATION · `LAB`=LAB · `SMP`=SAMPLE_COLLECTION · `ONB`=ONBOARDING · `BIL`=BILLING · `TECH`=TECH_SUPPORT

---

## 1. V1-Katalog (`INQUIRY_CHECKPOINT_CATALOGUE`)

Legacy-Katalog; **nicht** Teil von V2. Werden in keinem V2-Profil gebunden.

| ID | Label | Typ | Placement | Inhalt (kurz) | Deaktivierbar |
|---|---|---|---|---|---|
| `IC01` | Patientenstatus | EXPLANATION / SPECIFIC | ATTACHED | Bestands- vs. Neupatient | Ja – V1, ungebunden |
| `IC02` | Online-Anamnese | EXPLANATION / SPECIFIC | ATTACHED | Anamnese vollständig ausgefüllt? | Ja – V1, ungebunden |
| `IC03` | Impfberatung | EXPLANATION / SPECIFIC | ATTACHED | Beratung vor Impfung, optional vs. pflicht | Ja – V1, ungebunden |
| `IC04` | Impfpass / Impfstatus | EXPLANATION / SPECIFIC | ATTACHED | Impfpass zum Termin mitbringen | Ja – V1, ungebunden |
| `IC05` | Terminwunsch | EXPLANATION / SPECIFIC | ATTACHED | Wunschtermin/Zeitraum angeben | Ja – V1, ungebunden |
| `IC06` | Online-Terminbuchung | EXPLANATION / SPECIFIC | ATTACHED | Zugang zur Online-Buchung vorhanden? | Ja – V1, ungebunden |

---

## 2. Decision-Checkpoints

Steuern den zentralen Outcome-Text (POSSIBLE / NOT_POSSIBLE) einer Anfrage. Pflicht-Checkpoints für Profile mit Decision-Checkpoint.

| ID | Label | Profile | Zielgruppe | Config? | Deaktivierbar | Begründung |
|---|---|---|---|---|---|---|
| `AU_DECISION` | AU-Entscheidung | AU | beide | Nein | Nein | Kernentscheidung; ohne Decision kein Ausgabetext |
| `PRESCRIPTION_DECISION` | Rezept-Entscheidung | RX | beide | Nein | Nein | Kernentscheidung |
| `LAB_DECISION` | Labor-Entscheidung | LAB | patient | Nein | Nein | Kernentscheidung |
| `SAMPLE_COLLECTION_DECISION` | Probenabgabe möglich | SMP | patient | Nein | Nein | Kernentscheidung |
| `ACUTE_CARE_DECISION` | Akuttermin-Entscheidung | ACU | beide | Nein | Nein | Kernentscheidung |
| `REFERRAL_DECISION` | Überweisungs-Entscheidung | REF | beide | Nein | Nein | Kernentscheidung |
| `IMMUNIZATION_DECISION` | Impf-Entscheidung | IMM | patient | Nein | Nein | Kernentscheidung |
| `MEDICAL_DOCUMENTS_DECISION` | Attest-/Bescheinigungs-Entscheidung | DOC | patient | Nein | Nein | Kernentscheidung |
| `HOSPITAL_ADMISSION_DECISION` | Krankenhauseinweisung-Entscheidung | HOSP | patient | Nein | Nein | Kernentscheidung |

---

## 3. Explanation-Checkpoints – aktiv in Profilen gebunden

### 3.1 AU

| ID | Label | specificRole | Placement | Zielgruppe | Inhalt (kurz) | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|---|
| `AU_BACKDATE_LIMIT` | Rückdatierungsgrenze | RULE_TIME_LIMIT | ATTACHED | patient | AU nur bis 2 Tage rückwirkend | Nein | Unklar – aktiv in AU; Entfernen bricht M2-Auswahl |
| `AU_NEW_PATIENT_LIMIT` | Neupatient – AU-Höchstdauer | RULE_TIME_LIMIT | ATTACHED | patient | Schalter; Inhalt über `AU_NEW_PATIENT_3DAY_LIMIT` (Action) | Nein | Unklar – reiner Schalter für gebundene Action |
| `AU_MISSING_EGK` | Versichertendaten fehlen | MISSING_INFORMATION | ATTACHED | patient | eGK liegt nicht vor | Nein | Unklar – schaltet `INSURANCE_DATA_APP_TRANSFER` frei |
| `AU_WORK_ACCIDENT` | Arbeitsunfall / Wegeunfall | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | D-Arzt zuständig | Nein | Unklar – aktiv in AU; wichtiger Rechtshinweis |
| `AU_CHILD_SICK` | Kind krank | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Kinderarztpraxis zuständig | Nein | Unklar |
| `AU_DIGITAL_AU_PROCESS` | Digitaler AU-Prozess | PROCESS_INFO | ATTACHED | patient | Schalter; Inhalte via DIGITAL_REQUEST Actions | Nein | Unklar – Schalter |
| `AU_NO_APPOINTMENT_ACUTE` | Akute Beschwerden – kein Termin | _(kein specificRole)_ | ATTACHED | patient | Schalter; schaltet DIGITAL_REQUEST + ACUTE-Action frei | Nein | Unklar – Schalter |
| `AU_MEDICAL_CONSULTATION_REQUIRED` | Ärztliche Konsultation (AU) | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Persönlicher Termin notwendig (m5=NEED_VISIT) | Nein | Unklar |
| `AU_FOLLOWUP_REQUIRES_VISIT` | Folgebescheinigung – Vorstellung | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Persönliche Vorstellung für Folge-AU | Nein | Unklar |
| `EAU_VALID_WITHOUT_SIGNATURE` | eAU ohne Unterschrift gültig | PROCESS_INFO | ATTACHED | patient | eAU digital übermittelt, ohne Stempel gültig | Nein | Unklar |
| `RETURN_TO_WORK_ALLOWED_DURING_AU` | Frühere Rückkehr möglich | PROCESS_INFO | ATTACHED | patient | Vorzeitige Rückkehr vor AU-Ende möglich | Nein | Unklar |
| `AU_EXTENSION_REQUIRES_EXAMINATION` | AU-Verlängerung – Untersuchung | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Körperliche Untersuchung für weitere Beurteilung | Nein | Unklar |

### 3.2 PRESCRIPTION

| ID | Label | specificRole | Placement | Zielgruppe | Inhalt (kurz) | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|---|
| `PRESCRIPTION_INDICATION_NOT_DOCUMENTED` | Medizinische Begründung fehlt | MISSING_INFORMATION | ATTACHED | patient | Begründung für Medikament nicht hinterlegt | Nein | Unklar |
| `PRESCRIPTION_DOCTOR_REVIEW_REQUIRED` | Ärztliche Prüfung | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Ärztliche Einschätzung vor Verordnung | Nein | Unklar |
| `PRESCRIPTION_FOLLOWUP_REQUIRED_IN_PERSON` | Persönl. Termin vor Dauermedikation | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Kein weiteres Rezept ohne Termin | Nein | Unklar |
| `PRESCRIPTION_BTM_ADHS_RULES` | BtM / ADHS / Facharztpflicht | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | ADHS-Medikamente via Facharzt | Nein | Unklar – actionGuidanceRule-Trigger |
| `PRESCRIPTION_GYN_EXCLUSIVITY` | Gynäkologische Verordnung | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Pille über Gynäkologin | Nein | Unklar – actionGuidanceRule-Trigger |
| `PRESCRIPTION_STATUTORY_POSSIBLE` | Kassenrezept möglich | OUTCOME_INFO | ATTACHED | patient | Schalter; ja → E_RECIPE_USE, nein → eigener Text | Nein | Unklar – Schalter für E_RECIPE_USE |
| `PRESCRIPTION_PRIVATE_ONLY` | Privatrezept / Selbstzahler | RULE_COST_COVERAGE | ATTACHED | patient | Kein GKV-Rezept | Nein | Unklar |
| `PRESCRIPTION_SPECIALIST_RESPONSIBLE` | Facharzt zuständig | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Verordnung über Facharztpraxis | Nein | Unklar |
| `PRESCRIPTION_PATIENT_NOT_IN_GERMANY` | Patient nicht in Deutschland | PROCESS_INFO | ATTACHED | patient | Rezept nur in deutschen Apotheken | Nein | Unklar |
| `PRESCRIPTION_CHRONIC_PATIENT` | Chronische Erkrankung | PROCESS_INFO | ATTACHED | patient | Regelmäßige Kontrolle bei Dauermedikation | Nein | Unklar |
| `PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK` | Rezept nach Apothekenrückmeldung | PROCESS_INFO | ATTACHED | patient | Rezept angepasst | Nein | Unklar |
| `CONTRACEPTION_SPECIALIST_ONLY` | Kontrazeptiva – fachspezifisch | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Verordnung an fachspezifische Untersuchung gebunden | Nein | Unklar |
| `PRESCRIPTION_INSURANCE_PROOF_MISSING` | Versicherungsnachweis fehlt (RX) | MISSING_DOCUMENT | ATTACHED | patient | Kein gültiger VN für Rezept | Nein | Unklar – schaltet `INSURANCE_DATA_APP_TRANSFER` frei |

### 3.3 LAB

| ID | Label | specificRole | Placement | Zielgruppe | Inhalt (kurz) | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|---|
| `LAB_MPU_EXCLUSION` | MPU / forensisches Screening | _(kein specificRole)_ | ATTACHED | patient | MPU-Untersuchungen nicht in dieser Praxis; suppresst LAB_FASTING+LAB_RESULT_TIME | Nein | Unklar |
| `LAB_EXTERNAL_REFERRAL` | Externe Überweisung | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Schalter; steuert LAB_APPOINTMENT_INDIVIDUAL, LAB_BRING_REFERRAL, LAB_COST_COVERED | Nein | Unklar – Schalter |
| `LAB_INTERNAL_ORDER` | Interne ärztliche Anordnung | PROCESS_INFO | ATTACHED | patient | Schalter; steuert LAB_APPOINTMENT_INTERNAL | Nein | Unklar – Schalter |
| `LAB_MEDICAL_CONSULTATION_REQUIRED` | Ärztliche Konsultation (Labor) | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Persönlicher Termin notwendig (m5=NEED_VISIT) | Nein | Unklar |
| `LAB_CHECKUP_RULES` | Check-up-Regelung | _(kein specificRole)_ | ATTACHED | patient | GKV Check-up ab 35 alle 3 Jahre; schaltet LAB_APPOINTMENT_CHECKUP frei | Nein | Unklar |
| `BILLING_COST_NOT_COVERED` | Keine Kassenleistung | RULE_COST_COVERAGE | ATTACHED | patient | IGeL / Selbstzahler; im LAB- und BILLING-Profil gebunden | Nein | Unklar – profilübergreifend |
| `APPOINTMENT_DATA_INCOMPLETE` | Angaben unvollständig | MISSING_INFORMATION | ATTACHED | patient | Anliegen zu ungenau für Termintauswahl; im LAB- und APPOINTMENT-Profil gebunden | Nein | Unklar – profilübergreifend |
| `LAB_INTERNAL_ORDER_AVAILABLE` | Laboranordnung vorhanden | PROCESS_INFO | ATTACHED | patient | Ärztliche Anordnung liegt bereits vor | Nein | Unklar |
| `LAB_CHECKUP_BASIC_LAB_INCLUDED` | Basislabor im Check-up | PROCESS_INFO | ATTACHED | patient | Angefragte Werte Teil des Check-up-Basislabors | Nein | Unklar |
| `LAB_SELF_PAYER_POSSIBLE` | Selbstzahlerleistung möglich | RULE_COST_COVERAGE | ATTACHED | patient | Labor als Selbstzahler durchführbar | Nein | Unklar |
| `LAB_CONTROL_TIMING_NOT_DUE` | Zeitpunkt nicht passend | RULE_TIME_LIMIT | ATTACHED | patient | Blutkontrolle erst später vorgesehen | Nein | Unklar |
| `LAB_RESULTS_PENDING` | Laborergebnisse ausstehend | PROCESS_INFO | ATTACHED | patient | Befunde noch nicht eingegangen, automatischer Versand zugesagt | Nein | Unklar |

### 3.4 SAMPLE_COLLECTION

| ID | Label | specificRole | Placement | Zielgruppe | Inhalt (kurz) | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|---|
| `SAMPLE_COLLECTION_ORDER_AVAILABLE` | Probenanordnung liegt vor | PROCESS_INFO | ATTACHED | patient | Ärztliche Anordnung für Probenabgabe vorhanden; schaltet `URINE_SAMPLE_ONSITE` frei | Nein | Unklar |

### 3.5 ACUTE_CARE

| ID | Label | specificRole | Placement | Zielgruppe | Inhalt (kurz) | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|---|
| `ACUTE_EXCLUSION` | Ausschluss planbarer Anliegen | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Planbare Anliegen in reguläre Sprechstunde | Nein | Unklar |
| `CHRONIC_EXCLUSION` | Chronische Erkrankung – Ausschluss | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Auch chronisch planbare Anliegen → reguläre Sprechstunde | Nein | Unklar |
| `ACUTE_PURPOSE` | Zweck der Akutsprechstunde | PROCESS_INFO | ATTACHED | patient | Für kurzfristig aufgetretene oder sich verschlechternde Beschwerden | Nein | Unklar |
| `ACUTE_APPOINTMENT_INFO` | Akuttermin – Buchungshinweis | PROCESS_INFO | ATTACHED | patient | Schalter; Inhalte in `ACUTE_BOOKING_INFO` (Action) | Nein | Unklar – Schalter |
| `NO_HOME_VISITS` | Hausbesuche nicht im Angebot | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Hausbesuche kein Leistungsangebot | Nein | Unklar |

### 3.6 REFERRAL

| ID | Label | specificRole | Placement | Zielgruppe | Inhalt (kurz) | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|---|
| `REFERRAL_CAN_BE_ISSUED` | Überweisung kann ausgestellt werden | OUTCOME_INFO | ATTACHED | patient | Positive Einschätzung | Nein | Unklar |
| `REF_SPECIALTY_REQUIRED` | Fachrichtung erforderlich | MISSING_INFORMATION | ATTACHED | patient | Fachrichtung noch nicht angegeben (m5=NO_SPECIALTY) | Nein | Unklar |
| `REF_PSYCHOTHERAPY_FIRST_STEP` | Psychotherapie – Erstvorstellung | PROCESS_INFO | ATTACHED | patient | Überweisung als erster Schritt | Nein | Unklar |
| `REF_HAV_CASE` | Hausarztvermittlungsfall | _(kein specificRole)_ | ATTACHED | patient | Schalter; schaltet `REF_BOOKING_CODE_PROCESS` frei (m5=HAV) | Nein | Unklar – Schalter |
| `REF_MEDICAL_CONSULTATION_REQUIRED` | Ärztliche Konsultation (Überweisung) | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Persönlicher Termin vor Überweisung (m5=NEED_VISIT) | Nein | Unklar |
| `REFERRAL_INSURANCE_PROOF_MISSING` | Versicherungsnachweis fehlt (REF) | MISSING_DOCUMENT | ATTACHED | patient | Kein VN für Überweisung; schaltet `INSURANCE_DATA_APP_TRANSFER` | Nein | Unklar |

### 3.7 HEILMITTELVERORDNUNG

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `HMV_REQUEST_COMPLETE` | HMV: Angaben vollständig | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |
| `HMV_INFO_MISSING` | HMV: Angaben fehlen | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar – schaltet DIGITAL_REQUEST frei (m5=NO_DATA) |
| `HMV_PREVIOUS_ORDER_MISSING` | HMV: Vorverordnung fehlt | MISSING_DOCUMENT | ATTACHED | patient | Nein | Unklar – schaltet DOCUMENT_UPLOAD frei (m5=NO_DOC) |
| `HMV_DOCTOR_REVIEW_REQUIRED` | HMV: Ärztliche Prüfung | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Nein | Unklar (m5=NEED_VISIT) |
| `HMV_IN_PERSON_REQUIRED` | HMV: Persönlicher Termin | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Nein | Unklar – schaltet BOOK_APPOINTMENT frei (m5=NEED_VISIT) |
| `HMV_NOT_DIGITAL_POSSIBLE` | HMV: Digital nicht abschließbar | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Nein | Unklar (m5=WRONG_CHANNEL) |

### 3.8 HOSPITAL_ADMISSION

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `HOSPITAL_ADMISSION_CAN_BE_ISSUED` | KH-Einweisung kann ausgestellt werden | OUTCOME_INFO | ATTACHED | patient | Nein | Unklar |
| `HOSPITAL_ADMISSION_MISSING_INFO` | Angaben zur Einweisung fehlen | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar |
| `HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED` | Ärztliche Konsultation (HOSP) | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Nein | Unklar |
| `HOSPITAL_TRANSPORT_REQUIRED` | Krankentransport erforderlich | PROCESS_INFO | ATTACHED | patient | Nein | Unklar – schaltet TRANSPORT_QUESTIONNAIRE_REQUEST frei |

### 3.9 IMMUNIZATION

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `IMMUNIZATION_STANDARD_AVAILABLE` | Grippe/COVID ohne Beratung buchbar | PROCESS_INFO | ATTACHED | patient | Nein | Unklar – schaltet `IMMUNIZATION_BOOK_VACCINATION` frei |
| `IMMUNIZATION_RISK_REVIEW_REQUIRED` | Ärztliche Risikoabwägung | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Nein | Unklar – schaltet `IMMUNIZATION_BOOK_COUNSELING` frei |
| `IMMUNIZATION_STATUS_UNCLEAR` | Impfstatus unklar | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar |
| `IMMUNIZATION_VACCINATION_RECORD_MISSING` | Impfpass fehlt | MISSING_DOCUMENT | ATTACHED | beide | Nein | Unklar |
| `IMMUNIZATION_TRAVEL_MEDICINE` | Reiseimpfung | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Nein | Unklar – suppresst `IMMUNIZATION_BRING_VACCINATION_RECORD` |

### 3.10 APPOINTMENT

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `APPOINTMENT_IN_PERSON_REQUIRED_FOR_REQUEST` | Persönlicher Termin notwendig | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Nein | Unklar |
| `APPOINTMENT_WRONG_TYPE` | Falscher Termintyp | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Nein | Unklar – schaltet `BOOK_APPOINTMENT` frei |
| `APPOINTMENT_BOOKING_CODE_REQUIRED` | Buchungscode erforderlich | PROCESS_INFO | ATTACHED | patient | Nein | Unklar – schaltet terminartspez. Book-Actions frei |
| `APPOINTMENT_EXTERNAL_FINDING_PRESENT` | Externe Befundbesprechung | MISSING_DOCUMENT | ATTACHED | patient | Nein | Unklar – schaltet `DOCUMENT_UPLOAD` frei |
| `APPOINTMENT_EXTERNAL_FINDING_LONG_ABSENCE` | Externer Befund + langer Praxisabstand | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |
| `APPOINTMENT_DATA_INCOMPLETE` | Angaben unvollständig | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar – auch in LAB gebunden |
| `APPOINTMENT_REASON_UNCLEAR` | Terminanlass unklar | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar |
| `VIDEO_CONSULTATION_REGION_LIMITATION` | Videosprechstunde – Einzugsgebiet | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Nein | Unklar |
| `APPOINTMENT_TYPE_QUESTION` | Rückfrage Terminart / Buchungslogik | PROCESS_INFO | ATTACHED | patient | Nein | Unklar – zentraler Schalter für 9 APPOINTMENT_INFO_* Actions |
| `APPOINTMENT_INSURANCE_PROOF_MISSING` | Versicherungsnachweis fehlt (APP) | MISSING_DOCUMENT | ATTACHED | patient | Nein | Unklar – schaltet `INSURANCE_DATA_APP_TRANSFER` frei |
| `APPOINTMENT_INTERNAL_ORDER_EKG` | Ärztliche Anordnung für EKG | PROCESS_INFO | ATTACHED | patient | Nein | Unklar – schaltet `APPOINTMENT_BOOK_EKG_ORDER` frei |

### 3.11 ONBOARDING

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `ONBOARDING_WRONG_PRACTICE` | Patient nicht dieser Praxis | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Nein | Unklar – Schalter für `ONBOARDING_WRONG_PRACTICE_NOTICE` |
| `ONBOARDING_IDENTITY_MISMATCH` | Patient nicht zuordenbar | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar – Schalter für Identity-Actions |
| `ONBOARDING_DATA_INCOMPLETE` | Patientendaten unvollständig | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar – Schalter |
| `ONBOARDING_DATA_UPDATE_REQUIRED` | Patientendaten aktualisieren | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |
| `ONBOARDING_GKV_DOCUMENT_MISSING` | GKV-Versicherungsnachweis fehlt | MISSING_DOCUMENT | ATTACHED | beide | Nein | Unklar – schaltet DOCUMENT_UPLOAD + INSURANCE_DATA_APP_TRANSFER frei |
| `ONBOARDING_PKV_PAS_MISSING` | PKV/PAS-Unterlagen fehlen | MISSING_DOCUMENT | ATTACHED | patient | Nein | Unklar – schaltet DOCUMENT_UPLOAD frei |
| `ONBOARDING_DOCTOLIB_INFO` | Doctolib-Nutzung erklären | PROCESS_INFO | ATTACHED | beide | Ja (`uploadPlatformName`, `uploadPlatformAccountLabel`) | Unklar |
| `INSURANCE_NUMBER_INVALID_FORMAT` | Versichertennummer ungültig | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar |
| `ONBOARDING_PRIMARY_CARE_CONFIRMATION` | Hausarzt-Zuständigkeit klären | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |
| `ADULTS_ONLY_PRACTICE` | Praxis nur für Erwachsene | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Nein | Unklar |

### 3.12 BILLING

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `BILLING_COST_NOT_COVERED` | Keine Kassenleistung | RULE_COST_COVERAGE | ATTACHED | patient | Nein | Unklar – auch in LAB; schaltet 3 Billing-Actions frei |
| `BILLING_EXTERNAL_RESPONSIBILITY` | Externe Zuständigkeit | EXTERNAL_RESPONSIBILITY | ATTACHED | patient | Nein | Unklar – schaltet `BILLING_CONTACT_EXTERNAL_PARTY` frei |
| `BILLING_ADDRESS_MISSING` | Rechnungsadresse fehlt | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar – schaltet `BILLING_ADDRESS_UPDATE_REQUESTED` frei |
| `BILLING_DOCUMENT_MISSING` | Abrechnungsdokument fehlt | MISSING_DOCUMENT | ATTACHED | patient | Nein | Unklar – schaltet `INSURANCE_DATA_APP_TRANSFER` frei |
| `BILLING_EXTERNAL_PROVIDER` | Abrechnung über externen Dienstleister | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |
| `BILLING_INVOICE_TIMING` | Zeitpunkt Rechnungsstellung | PROCESS_INFO | ATTACHED | patient | Ja (`billingCycleLabel`) | Unklar |

### 3.13 TECH_SUPPORT

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `TECH_VIDEO_NOT_WORKING` | Videosprechstunde – technisch | CHANNEL_NOT_SUITABLE | ATTACHED | patient | Ja (`videoSupportContact`) | Unklar |

### 3.14 MEDICAL_DOCUMENTS

| ID | Label | specificRole | Placement | Zielgruppe | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `MEDICAL_DOCUMENT_POSSIBLE` | Attest grundsätzlich möglich | PROCESS_INFO | ATTACHED | beide | Nein | Unklar |
| `MEDICAL_DOCUMENT_PRIVATE_SERVICE` | Attest als Selbstzahlerleistung | RULE_COST_COVERAGE | ATTACHED | patient | Nein | Unklar – schaltet `PAYMENT_ONSITE_INFO` frei |
| `MEDICAL_DOCUMENT_INFO_MISSING` | Verwendungszweck fehlt | MISSING_INFORMATION | ATTACHED | patient | Nein | Unklar – schaltet `DIGITAL_REQUEST` + `DOCUMENT_UPLOAD` frei |
| `MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED` | Unterlagen übersetzen | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |
| `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED` | Ärztliche Konsultation (DOC) | MEDICAL_REVIEW_REQUIRED | ATTACHED | patient | Nein | Unklar – schaltet `BOOK_APPOINTMENT` frei (m5=NEED_VISIT) |
| `SUSPECTED_DIAGNOSIS_EXPLANATION` | Verdachtsdiagnose – Bedeutung | PROCESS_INFO | ATTACHED | patient | Nein | Unklar |

---

## 4. Explanation-Checkpoints – Global (GLOBAL scope, aktiv)

Profilübergreifende Checkpoints; Binding über `boundGlobalCheckpointIds` oder direct Use.

| ID | Label | Scope | classification | Placement | Profile | Config? | Deaktivierbar | Begründung |
|---|---|---|---|---|---|---|---|---|
| `INFECTIOUS_PROTOCOL` | Infektionsschutz – Hinweis | GLOBAL | MODULAR | ATTACHED | ACU (boundGlobal) | Nein | Nein | Schaltet 3 infektionsspezifische Actions frei; m5=INFECTIOUS |
| `TRANSPORT_APPROVED` | Krankenbeförderung zugesagt | GLOBAL | MODULAR | ATTACHED | _(kein Profil gebunden)_ | Nein | Ja | exclusiveGroup TRANSPORT_STATUS; nicht in aktiven Profilen |
| `TRANSPORT_NOT_APPROVED` | Krankenbeförderung nicht zugesagt | GLOBAL | MODULAR | ATTACHED | _(kein Profil gebunden)_ | Nein | Ja | exclusiveGroup TRANSPORT_STATUS; nicht in aktiven Profilen |
| `TRANSPORT_INFO_MISSING` | Angaben zur KH-Beförderung fehlen | GLOBAL | MODULAR | ATTACHED | _(kein Profil gebunden)_ | Nein | Ja | exclusiveGroup TRANSPORT_STATUS; nicht in aktiven Profilen; m5=NO_DATA |
| `REQUIRED_INFORMATION_COMPLETE` | Erforderliche Infos vollständig | GLOBAL | MODULAR | ATTACHED | _(nicht in Profilen)_ | Nein | Ja | Noch nicht in active profiles eingebunden |
| `DOCUMENTS_RECEIVED_AND_ASSIGNED` | Unterlagen eingegangen | GLOBAL | MODULAR | ATTACHED | _(nicht in Profilen)_ | Nein | Ja | Noch nicht eingebunden |
| `DIGITAL_REQUEST_MEDICAL_REVIEW` | Digitale Anfrage – ärztl. Prüfung | GLOBAL | MODULAR | ATTACHED | _(nicht in Profilen)_ | Nein | Ja | Noch nicht eingebunden |
| `TECHNICAL_ISSUE_DELAY` | Bearbeitung verzögert – Technik | GLOBAL | MODULAR | ATTACHED | _(nicht in Profilen)_ | Nein | Ja | Noch nicht eingebunden |
| `STAFF_SHORTAGE_DELAY` | Bearbeitung verzögert – Personal | GLOBAL | MODULAR | ATTACHED | _(nicht in Profilen)_ | Nein | Ja | Noch nicht eingebunden |

---

## 5. Action-Checkpoints – Global (GLOBAL scope)

### 5.1 Scope GLOBAL · Placement SHARED_BOTTOM · Kernaktionen

| ID | Label | actionCategory | Zielgruppe | Profile (gebunden via) | Config? | Deaktivierbar | Begründung |
|---|---|---|---|---|---|---|---|
| `DIGITAL_REQUEST` | Digitale Anfrage | NEXT_STEP | beide | AU, RX, REF, HOSP, IMM, LAB, SMP, APP, DOC, HMV, BIL, TECH, ONB (bound + available) | Nein | Nein | Zentraler Eingangskanal; in fast allen Profilen als availableAction |
| `BOOK_APPOINTMENT` | Termin buchen | NEXT_STEP | patient | ACU, AU, RX, REF, HOSP, IMM, LAB, SMP, APP, DOC, HMV, BIL, TECH (bound + available) | Nein | Nein | Zentrale Buchungsfunktion |
| `CONTACT_PERSON_INFO` | Kontaktperson dokumentieren | NEXT_STEP | beide | AU, REF, ONB (available); RX, AU, REF, ONB (bound) | Nein | Unklar |  |
| `INSURANCE_DATA_APP_TRANSFER` | Versicherungsdaten via KK-App | NEXT_STEP | beide | AU, RX, REF, APP, ONB, BIL (bound via condition) | Nein | Nein | Wiederverwendet in 6 Profilen; kritischer Workflow |
| `DOCUMENT_UPLOAD` | Unterlagen hochladen | NEXT_STEP | beide | RX, HMV, HOSP, APP, DOC, ONB (bound via condition) | Ja (`uploadPlatformName`, `uploadPlatformAccountLabel`) | Nein | Zentrale Upload-Action; config-abhängiger Text |
| `PAYMENT_ONSITE_INFO` | Zahlung vor Ort | NEXT_STEP | patient | DOC (bound via condition) | Nein | Unklar |  |
| `CARE_CHANNEL_CHOICE` | Versorgungsweg – persönl. oder digital | INFO | patient | AU (immer), ACU (immer) | Nein | Unklar |  |
| `CONTROL_APPOINTMENT_RECOMMENDED` | Kontrolltermin empfohlen | NEXT_STEP | patient | AU (immer), HOSP (immer), RX (guidanceRule) | Nein | Unklar |  |
| `PROCESSING_DELAY` | Bearbeitungsverzögerung | INFO | patient | RX (guidanceRule: NOT_POSSIBLE) | Nein | Unklar |  |
| `TECHNICAL_ISSUE` | Technische Störung | INFO | patient | RX (guidanceRule: NOT_POSSIBLE) | Nein | Unklar |  |
| `DIGITAL_REQUEST_PROCESSING_TIME` | Bearbeitungszeit dig. Anfrage | INFO | patient | AU (condition: DIGITAL_AU_PROCESS oder NO_APPOINTMENT_ACUTE) | Ja (`digitalRequestProcessingTimeMin/Max/Unit`) | Unklar |  |
| `ONLINE_ANAMNESIS` | Online-Anamnese | NEXT_STEP | patient | _(nicht in aktiven Profilen)_ | Nein | Ja | Nicht gebunden; leerer Text |

### 5.2 Scope GLOBAL · Placement ATTACHED · Infektions-Actions

| ID | Label | actionCategory | Zielgruppe | Profile | Config? | Deaktivierbar |
|---|---|---|---|---|---|---|
| `INFECTIOUS_CONTACT_DIGITALLY` | Infektionsschutz – vorab digital melden | NEXT_STEP | patient | ACU (Cond: INFECTIOUS_PROTOCOL=YES) | Nein | Nein – Teil des Infektionsschutz-Blocks |
| `INFECTIOUS_VIDEO_CONSULTATION` | Infektionsschutz – Videosprechstunde | NEXT_STEP | patient | ACU (Cond: INFECTIOUS_PROTOCOL=YES) | Nein | Nein – Teil des Infektionsschutz-Blocks |
| `INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED` | Nicht unangemeldet erscheinen | INFO | patient | ACU (Cond: INFECTIOUS_PROTOCOL=YES) | Nein | Nein – Teil des Infektionsschutz-Blocks |
| `ACUTE_OPEN_CONSULTATION_ACTION` | Offene Sprechstunde – Hinweis | INFO | patient | AU (immer), ACU (immer), APP (immer) | Ja (`openConsultationDays`, `openConsultationHours`, `openConsultationCapacityLimited`) | Nein – zentrale Info |
| `E_RECIPE_USE` | eRezept nutzen | INFO | patient | RX (Cond: STATUTORY_POSSIBLE=YES; guidanceRule) | Nein | Unklar |
| `PHARMACY_INFORMATION` | Apotheke / Direktübermittlung | NEXT_STEP | patient | RX (außer NO_PRESCRIPTION_REQUIRED=YES) | Nein | Unklar |
| `URINE_SAMPLE_ONSITE` | Urinprobe vor Ort | NEXT_STEP | patient | SMP (Cond: SAMPLE_COLLECTION_ORDER_AVAILABLE=YES) | Nein | Unklar |
| `TRANSPORT_QUESTIONNAIRE_REQUEST` | Fragebogen Krankentransport | NEXT_STEP | patient | HOSP (immer), guidanceRule: TRANSPORT_REQUIRED=YES | Nein | Unklar |

---

## 6. Action-Checkpoints – Spezifisch (SPECIFIC scope)

### 6.1 AU

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `AU_NEW_PATIENT_3DAY_LIMIT` | Neupatient – 3-Tage-Limit | INFO | ATTACHED | patient | Nein | AU | `AU_NEW_PATIENT_LIMIT = YES` | Unklar |

### 6.2 LAB

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `LAB_APPOINTMENT_INTERNAL` | Termin intern buchen | NEXT_STEP | ATTACHED | beide | Ja (`doctorOrderBookingCode`) | LAB | `LAB_INTERNAL_ORDER=YES` und nicht `LAB_CHECKUP_RULES=YES` | Unklar |
| `LAB_APPOINTMENT_CHECKUP` | Check-up-Labor buchen | NEXT_STEP | ATTACHED | beide | Nein | LAB | `LAB_CHECKUP_RULES = YES` | Unklar |
| `LAB_APPOINTMENT_INDIVIDUAL` | Individuelle Laborwerte buchen | NEXT_STEP | ATTACHED | beide | Nein | LAB | außer `LAB_INTERNAL_ORDER=YES` | Unklar |
| `LAB_APPOINTMENT_DOCTOR` | Ärztliche Abklärung erforderlich | NEXT_STEP | ATTACHED | patient | Nein | LAB | außer `LAB_INTERNAL_ORDER=YES` + außer `LAB_EXTERNAL_REFERRAL=YES` | Unklar |
| `LAB_BRING_REFERRAL` | Überweisung mitbringen | PREPARATION | ATTACHED | beide | Nein | LAB | `LAB_EXTERNAL_REFERRAL = YES` | Unklar |
| `LAB_COST_COVERED_BY_REFERRAL` | Abrechnung über Überweisung | INFO | ATTACHED | patient | Nein | LAB | `LAB_EXTERNAL_REFERRAL = YES` | Unklar |
| `LAB_SELF_PAYER_NOTE` | Selbstzahlerleistung / Wunschwerte | INFO | ATTACHED | patient | Nein | LAB | außer `LAB_INTERNAL_ORDER=YES` + außer `LAB_EXTERNAL_REFERRAL=YES` | Unklar |
| `LAB_FASTING_REQUIRED` | Nüchtern erscheinen | PREPARATION | ATTACHED | beide | Nein | LAB | außer `LAB_MPU_EXCLUSION=YES` | Unklar |
| `LAB_RESULT_TIME` | Befundübermittlung / Auswertungsdauer | INFO | ATTACHED | patient | Nein | LAB | außer `LAB_MPU_EXCLUSION=YES` | Unklar |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | Zeitnahe Klärung vereinbaren | NEXT_STEP | ATTACHED | patient | Nein | LAB, SMP | immer (kein hideWhenAny) | Unklar |

### 6.3 SAMPLE_COLLECTION

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `URINE_SAMPLE_INSTRUCTIONS` | Urinprobe – Hinweis | PREPARATION | ATTACHED | patient | Nein | SMP | immer aktiv wenn ACTIVE | Unklar |
| `STOOL_SAMPLE_INSTRUCTIONS` | Stuhlprobe – Hinweis | PREPARATION | ATTACHED | patient | Nein | SMP | immer aktiv wenn ACTIVE | Unklar |
| `SAMPLE_HANDOVER` | Probenabgabe / Aufbewahrung | PROCESS | ATTACHED | patient | Nein | SMP | immer aktiv wenn ACTIVE | Unklar |

### 6.4 ACUTE_CARE

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `ACUTE_BOOKING_INFO` | Akuttermin – Online-Buchung / Video | NEXT_STEP | ATTACHED | patient | Nein | ACU | `ACUTE_APPOINTMENT_INFO = YES` | Unklar |

### 6.5 REFERRAL

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `REF_ORIGINAL_VS_PDF` | Digitale vs. Original-Überweisung | INFO | ATTACHED | patient | Nein | REF | immer aktiv (kein hideWhenAny) | Unklar |
| `REF_BOOKING_CODE_PROCESS` | Vermittlungs-/Buchungscode | NEXT_STEP | ATTACHED | patient | Nein | REF | `REF_HAV_CASE = YES` | Unklar |

### 6.6 IMMUNIZATION

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `IMMUNIZATION_BOOK_VACCINATION` | Impftermin buchen | NEXT_STEP | ATTACHED | beide | Nein | IMM | `IMMUNIZATION_STANDARD_AVAILABLE = YES` | Unklar |
| `IMMUNIZATION_BOOK_COUNSELING` | Impfberatung buchen | NEXT_STEP | ATTACHED | beide | Nein | IMM | `IMMUNIZATION_RISK_REVIEW_REQUIRED = YES` | Unklar |
| `IMMUNIZATION_BRING_VACCINATION_RECORD` | Impfpass mitbringen | PREPARATION | ATTACHED | beide | Nein | IMM | außer `IMMUNIZATION_TRAVEL_MEDICINE = YES` | Unklar |

### 6.7 APPOINTMENT

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | Befundbesprechung buchen | NEXT_STEP | ATTACHED | beide | Ja (`bookingCalendarName`, `findingsReviewBookingCode`) | APP | `BOOKING_CODE_REQUIRED=YES` oder `TYPE_QUESTION=YES` | Unklar |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | Check-Up 2. Termin buchen | NEXT_STEP | ATTACHED | beide | Ja (`bookingCalendarName`, `checkupSecondBookingCode`) | APP | `BOOKING_CODE_REQUIRED=YES` oder `TYPE_QUESTION=YES` | Unklar |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | Chroniker-Kontrolltermin | NEXT_STEP | ATTACHED | beide | Ja (`bookingCalendarName`, `chronicControlBookingCode`) | APP | `BOOKING_CODE_REQUIRED=YES` oder `TYPE_QUESTION=YES` | Unklar |
| `APPOINTMENT_BOOK_GENERAL` | Termin allgemein buchen | NEXT_STEP | ATTACHED | beide | Nein | APP | _(immer wenn ACTIVE)_ | Unklar |
| `APPOINTMENT_BOOK_EKG_ORDER` | EKG nach ärztlicher Anordnung | NEXT_STEP | ATTACHED | beide | Ja (`bookingCalendarName`, `doctorOrderBookingCode`) | APP | `APPOINTMENT_INTERNAL_ORDER_EKG = YES` | Unklar |
| `APPOINTMENT_INFO_TYPE_PURPOSE` | Terminarten haben unterschiedl. Zwecke | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_BLOOD_DRAW_NOT_DOCTOR_VISIT` | Blutentnahme nicht im Arzttermin | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_VIDEO_SCOPE` | Videosprechstunde – Zweck/Grenze | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_IN_PERSON_REQUIRED` | Vor-Ort-Termin erforderlich | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_CHECKUP_PURPOSE` | Check-up-Termin erklärt | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_CHRONIC_CONTROL_PURPOSE` | Chroniker-Kontrolltermin erklärt | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_SHORT_NOTICE_CANCELLATION_IMPACT` | Kurzfristige Absage | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_BOOKING_RESTRICTED_AFTER_NO_SHOW` | Buchung nach No-Show eingeschränkt | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |
| `APPOINTMENT_INFO_BOOKING_REENABLED_AFTER_CLARIFICATION` | Buchung nach Klärung wieder möglich | INFO | ATTACHED | patient | Nein | APP | `APPOINTMENT_TYPE_QUESTION = YES` | Unklar |

### 6.8 BILLING

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `BILLING_NOT_COVERED_BY_STATUTORY` | Keine Kassenleistung | INFO | ATTACHED | patient | Nein | BIL | `BILLING_COST_NOT_COVERED = YES` | Unklar |
| `BILLING_GOA_BILLING` | Abrechnung nach GOÄ | INFO | ATTACHED | patient | Nein | BIL | `BILLING_COST_NOT_COVERED = YES` | Unklar |
| `BILLING_ONSITE_PAYMENT` | Selbstzahler-Zahlung vor Ort | INFO | SHARED_BOTTOM | patient | Nein | BIL | `BILLING_COST_NOT_COVERED = YES` | Unklar |
| `BILLING_CONTACT_EXTERNAL_PARTY` | Krankenkasse kontaktieren | NEXT_STEP | ATTACHED | beide | Nein | BIL | `BILLING_EXTERNAL_RESPONSIBILITY = YES` | Unklar |
| `BILLING_ADDRESS_UPDATE_REQUESTED` | Aktuelle Adresse anfordern | NEXT_STEP | SHARED_BOTTOM | patient | Nein | BIL | `BILLING_ADDRESS_MISSING = YES` | Unklar |

### 6.9 ONBOARDING

| ID | Label | actionCategory | Placement | Zielgruppe | Config? | Profile | Trigger | Deaktivierbar |
|---|---|---|---|---|---|---|---|---|
| `ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED` | Identitätsabgleich – Kontext | INFO | ATTACHED | beide | Nein | ONB | `ONBOARDING_IDENTITY_MISMATCH = YES` | Unklar |
| `ONBOARDING_PROVIDE_IDENTITY_DATA` | Identitätsabgleich – Aktion | INFO | SHARED_BOTTOM | beide | Nein | ONB | `ONBOARDING_IDENTITY_MISMATCH = YES` | Unklar |
| `ONBOARDING_DATA_MISSING_CONTEXT` | Datenvervollständigung – Kontext | INFO | ATTACHED | beide | Nein | ONB | `ONBOARDING_DATA_INCOMPLETE = YES` | Unklar |
| `ONBOARDING_WRONG_PRACTICE_NOTICE` | Falsche Praxis – Hinweis | INFO | ATTACHED | beide | Nein | ONB | `ONBOARDING_WRONG_PRACTICE = YES` | Unklar |

---

## 7. Intro- und Section-Intro-Checkpoints

### 7.1 Message-Intro-Checkpoints (INTRO)

Maximal ein INTRO erscheint als `output.intro`; bei E4/E5 kein Section-Intro möglich.

| ID | Label | Zielgruppe | Kontext | Deaktivierbar |
|---|---|---|---|---|
| `MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED` | Anfrage eingegangen (E4) | beide | Eingangsbestätigung nach Patientenanfrage | Ja – optional |
| `MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED` | Fragebogen eingegangen (E5) | beide | Eingangsbestätigung nach Fragebogen | Ja – optional |
| `MESSAGE_INTRO_PRACTICE_FOLLOWUP` | Nach Termin (E1) | beide | Nachsorge nach Termin | Ja – optional |
| `MESSAGE_INTRO_MISSING_INFO` | Laufendes Anliegen (E2) | beide | Offenes Anliegen in Bearbeitung | Ja – optional |
| `MESSAGE_INTRO_APPOINTMENT_PREPARATION` | Vorbereitung Termin (E3) | beide | Terminvorbereitungs-Nachricht | Ja – optional |

### 7.2 Section-Intro-Checkpoints (SECTION_INTRO)

Maximal einer aktiv; Anschlussphrase nach Message-Intro E1/E2/E3. Alle Profile whitelistet via `availableSectionIntroIds`.

| ID | Label | Anschlussphrase | Deaktivierbar |
|---|---|---|---|
| `SECTION_INTRO_INFO_MISSING` | Angaben fehlen | „fehlen uns noch einige Angaben." | Ja – optional |
| `SECTION_INTRO_DOCS_MISSING` | Unterlagen fehlen | „liegen uns noch nicht alle erforderlichen Unterlagen vor." | Ja – optional |
| `SECTION_INTRO_DOCS_COMPLETE` | Unterlagen vollständig | „liegen uns Ihre Unterlagen vollständig vor." | Ja – optional |
| `SECTION_INTRO_REVIEWED` | Anliegen geprüft | „haben wir Ihr Anliegen geprüft." | Ja – optional |
| `SECTION_INTRO_IN_PROGRESS` | Noch in Bearbeitung | „bitten wir noch um etwas Geduld." | Ja – optional |
| `SECTION_INTRO_NOT_RESPONSIBLE` | Nicht in unserer Praxis | „können wir Ihr Anliegen nicht in unserer Praxis bearbeiten." | Ja – optional |

---

## 8. Deprecated / ungebundene Checkpoints

Vollständig im Katalog erhalten, aber in **keinem aktiven Profil** in `specificCheckpointIds` oder `boundActionCheckpointIds` gebunden. Alle sicher deaktivierbar = **Ja**.

| ID | Label | Typ | Grund für Deprecated / Ungebunden |
|---|---|---|---|
| `AU_DURATION_LIMIT` | AU-Dauer überschreitet Rahmen | EXPLANATION | Inhaltlich durch `AU_DECISION-Q2` abgedeckt |
| `AU_CONTINUITY_REQUIRED` | Folge-AU / Lückenlosigkeit | EXPLANATION | Enthält NOT_POSSIBLE-Aussage – falsch eingeordnet als EXPLANATION |
| `AU_RETURN_TO_WORK` | Vorzeitige Arbeitsaufnahme | EXPLANATION | Prozesshinweis ohne Entscheidungsbezug |
| `AU_MISSING_QUESTIONNAIRE` | Angaben zur Erkrankung fehlen | EXPLANATION | Nicht in aktuellem AU-Profil |
| `AU_FOLLOWUP` | Folge-AU / Verlängerung | EXPLANATION | Nicht in aktuellem AU-Profil |
| `PRESCRIPTION_MEDICATION_UNCLEAR` | Medikament unklar | EXPLANATION | Nicht in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_DOSAGE_UNCLEAR` | Dosierung unklar | EXPLANATION | Nicht in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_MEDICATION_NOT_DOCUMENTED` | Medikament nicht hinterlegt | EXPLANATION | Nicht in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_CONTROL_OVERDUE` | Kontrollintervall überfällig | EXPLANATION | Inhalt über M3-Terminhinweise abgebildet |
| `PRESCRIPTION_SPECIALIST_REPORT_REQUIRED` | Facharztbericht erforderlich | EXPLANATION | Nicht in PRESCRIPTION.specificCheckpointIds |
| `HOSPITAL_DISCHARGE_REPORT_MISSING` | Krankenhaus-/Entlassbericht fehlt | EXPLANATION | Nicht in aktiven Profilen |
| `PRESCRIPTION_NO_POSTAL_DELIVERY` | Kein Postversand | EXPLANATION | Nicht in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_KNOWN_MEDICATION` | Medikament bekannt | EXPLANATION | Legacy-Baustein |
| `PRESCRIPTION_FOLLOW_UP` | Folgerezept / Dauermedikation | EXPLANATION | Legacy-Baustein |
| `PRESCRIPTION_SPECIALIST_REQUIRED` | Fachärztl. Mitbehandlung | EXPLANATION | Abgelöst durch `PRESCRIPTION_SPECIALIST_RESPONSIBLE` |
| `PRESCRIPTION_SPECIAL_TYPE` | Sonderfall | EXPLANATION | Legacy-Baustein |
| `PRESCRIPTION_NO_PRESCRIPTION_REQUIRED` | Kein Rezept erforderlich | EXPLANATION | Nicht in PRESCRIPTION.specificCheckpointIds |
| `LAB_SELF_PAYER_IGEL` | Selbstzahlerleistung / IGeL | EXPLANATION | Durch `BILLING_COST_NOT_COVERED` + `BILLING_EXTERNAL_PROVIDER` ersetzt |
| `LAB_DISCUSSION_PROCESS_CODE` | Befundbesprechung nach Laboreingang | EXPLANATION | Ungebunden |
| `LAB_INTERNAL_ORDER_MISSING` | Ärztliche Laboranordnung fehlt | EXPLANATION | Nicht in LAB.specificCheckpointIds |
| `LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED` | Fachärztliche Überweisung im Original | EXPLANATION | Nicht in LAB.specificCheckpointIds |
| `LAB_EXTERNAL_DOCUMENT_PRESENT` | Überweisungsdokument vorhanden | EXPLANATION | Konsolidiert in `LAB_EXTERNAL_REFERRAL` |
| `LAB_SELF_PAY` | Selbstzahler / IGeL | EXPLANATION | Konsolidiert in `LAB_SELF_PAYER_IGEL` |
| `LAB_MEDICAL_INDICATION` | Labor-Anlass / Indikation | EXPLANATION | Durch spezifischere LAB-Checkpoints ersetzt |
| `LAB_CHECKUP_ELIGIBLE` | Check-up / Vorsorge | EXPLANATION | Durch `LAB_CHECKUP_RULES` ersetzt |
| `LAB_VALUES_DEFINED` | Laborwerte definiert | EXPLANATION | Legacy-Baustein |
| `LAB_EXTERNAL_BILLING` | Laborabrechnung Partnerlabor | EXPLANATION | Durch `BILLING_EXTERNAL_PROVIDER` ersetzt |
| `SAMPLE_COLLECTION_INFORMATION_INCOMPLETE` | Angaben zur Probe unvollständig | EXPLANATION | Nicht in SAMPLE_COLLECTION.specificCheckpointIds |
| `SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING` | Anordnung unklar/fehlend | EXPLANATION | Nicht in SAMPLE_COLLECTION.specificCheckpointIds |
| `IS_NEW_PATIENT` | Neupatient | EXPLANATION/GLOBAL | Durch profilspezifische Checkpoints ersetzt |
| `PATIENT_NOT_IN_GERMANY` | Aufenthaltsort außerhalb DE | EXPLANATION/GLOBAL | Durch `PRESCRIPTION_PATIENT_NOT_IN_GERMANY` ersetzt |
| `DOCTOR_REVIEW_REQUIRED` | Ärztliche Einschätzung | EXPLANATION/GLOBAL | Durch profilspezifische Checkpoints ersetzt |
| `DATA_INCOMPLETE` | Angaben unvollständig | EXPLANATION/GLOBAL | Durch profilspezifische Checkpoints ersetzt |
| `IS_CHRONIC_PATIENT` | Chronische Erkrankung | EXPLANATION/GLOBAL | Durch `PRESCRIPTION_CHRONIC_PATIENT` ersetzt |
| `MEDICAL_CONSULTATION_REQUIRED` | Ärztliche Konsultation (global) | EXPLANATION/GLOBAL | Durch profilspez. `*_MEDICAL_CONSULTATION_REQUIRED` ersetzt |
| `TERMIN_PREPARATION_REQUIRED` | Terminvorbereitung erforderlich | EXPLANATION/GLOBAL | ACTION-Checkpoints modellieren jetzt Vorbereitungshinweise |
| `ACUTE_ONLY_LIMIT` | Nur für akute Beschwerden | EXPLANATION | Ersetzt durch `ACUTE_PURPOSE` + `ACUTE_EXCLUSION` |
| `OPEN_CONSULTATION_INFO` | Offene Sprechstunde – Ablauf | EXPLANATION | Ersetzt durch `ACUTE_OPEN_CONSULTATION_ACTION` |
| `NO_FIXED_TIME` | Keine festen Uhrzeiten | EXPLANATION | Durch `ACUTE_OPEN_CONSULTATION_ACTION` abgedeckt |
| `CAPACITY_LIMIT` | Kapazitätsgrenze | EXPLANATION | Durch `ACUTE_OPEN_CONSULTATION_ACTION` abgedeckt |
| `WAITING_TIME` | Wartezeiten | EXPLANATION | Durch `ACUTE_OPEN_CONSULTATION_ACTION` abgedeckt |
| `ACUTE_OPEN_CONSULTATION_INFO` | Offene Sprechstunde – Info | EXPLANATION/GLOBAL | Ersetzt durch `ACUTE_OPEN_CONSULTATION_ACTION` (ACTION) |
| `REF_DOCTOR_CONTACT_REQUIRED` | Ärztlicher Kontakt erforderlich | EXPLANATION | Durch `REF_MEDICAL_CONSULTATION_REQUIRED` ersetzt |
| `IMMUNIZATION_PASS_MISSING` | Impfpass fehlt (alt) | EXPLANATION | Durch `IMMUNIZATION_VACCINATION_RECORD_MISSING` ersetzt |
| `APPOINTMENT_TYPE_MATCH_CONFIRMED` | Terminart passt | EXPLANATION | Nicht in APPOINTMENT.specificCheckpointIds |
| `APPOINTMENT_CANCEL_OR_RESCHEDULE` | Termin absagen / verschieben | EXPLANATION | Nicht in APPOINTMENT.specificCheckpointIds |
| `APPOINTMENT_PROCESS_MULTI_STEP` | Mehrstufiger Ablauf | EXPLANATION | Gehört in Fachprofil, nicht in APPOINTMENT |
| `APPOINTMENT_PREPARATION_REQUIRED` | Vorbereitung erforderlich | EXPLANATION | Durch ACTION-Checkpoints abgebildet |
| `APPOINTMENT_DOCUMENT_MISSING` | Dokument fehlt | EXPLANATION | Gehört in jeweiliges Fachprofil |
| `APPOINTMENT_VIDEO_LIMITATIONS` | Videosprechstunde ungeeignet | EXPLANATION | Gehört ins Fachprofil |
| `APPOINTMENT_VIDEO_REQUIREMENTS` | Voraussetzungen Video | EXPLANATION | Gehört in TECH_SUPPORT |
| `APPOINTMENT_CAN_BE_BOOKED` | Termin kann gebucht werden | EXPLANATION | Nicht in APPOINTMENT.specificCheckpointIds |
| `BILLING_PROCESS_EXTERNAL` | Rechnung über externen Dienstleister | EXPLANATION | Durch `BILLING_EXTERNAL_PROVIDER` ersetzt |
| `BILLING_DATA_MISSING` | Abrechnungsdaten unvollständig | EXPLANATION | Durch `BILLING_ADDRESS_MISSING` ersetzt |
| `ONBOARDING_DOCUMENT_MISSING` | Identitäts-/Versicherungsnachweis | EXPLANATION | Durch `ONBOARDING_GKV_DOCUMENT_MISSING` + `ONBOARDING_PKV_PAS_MISSING` ersetzt |
| `ONBOARDING_PROCESS_REQUIRED` | Registrierungsablauf erklären | EXPLANATION | Redundant |
| `MEDICAL_DOCUMENT_REVIEW_REQUIRED` | Ärztliche Einschätzung für Attest | EXPLANATION | Durch globales `MEDICAL_CONSULTATION_REQUIRED` abgedeckt |
| `MEDICAL_DOCUMENT_DOCUMENTATION_MISSING` | Vorhandene Befunde fehlen | EXPLANATION | Text zu unscharf |
| `MEDICAL_DOCUMENT_AU_DIFFERENCE` | Unterschied Attest vs. AU | EXPLANATION | Nicht in MEDICAL_DOCUMENTS.specificCheckpointIds |
| `MEDICAL_DOCUMENT_PROCESS_INFO` | Ablauf Attest-Erstellung | EXPLANATION | Generischer Ablaufhinweis ohne Entscheidungsbezug |
| `DIGITAL_REQUEST_REQUIRED` | Digitale Anfrage zur Prüfung | ACTION | Fragebögen werden direkt versendet; fachlich überholt |
| `TECH_UPLOAD_FAILED` | Dokument unleserlich | EXPLANATION | Nicht in TECH_SUPPORT.specificCheckpointIds |

---

## 9. Aggregate-Tabellen

### 9.1 Alle Decision-Checkpoints

| ID | Profil | POSSIBLE-Outcomes | NOT_POSSIBLE-Outcome |
|---|---|---|---|
| `AU_DECISION` | AU | AU ausgestellt | AU nicht ausgestellt |
| `PRESCRIPTION_DECISION` | PRESCRIPTION | Rezept ausgestellt | Rezept nicht ausgestellt |
| `LAB_DECISION` | LAB | Termin für Blutentnahme direkt möglich | Ärztliche Abklärung erforderlich |
| `SAMPLE_COLLECTION_DECISION` | SAMPLE_COLLECTION | Probenabgabe wie besprochen möglich | Probenabgabe nicht berücksichtigt |
| `ACUTE_CARE_DECISION` | ACUTE_CARE | Akuttermin / offene Sprechstunde möglich | Andere Terminart vorgesehen |
| `REFERRAL_DECISION` | REFERRAL | Überweisung liegt zur Abholung bereit | Überweisung nicht ausgestellt |
| `IMMUNIZATION_DECISION` | IMMUNIZATION | Impfung kann durchgeführt werden | Impfung derzeit nicht möglich |
| `MEDICAL_DOCUMENTS_DECISION` | MEDICAL_DOCUMENTS | Attest/Bescheinigung kann erstellt werden | Attest/Bescheinigung nicht erstellt |
| `HOSPITAL_ADMISSION_DECISION` | HOSPITAL_ADMISSION | Krankenhauseinweisung ausgestellt | KH-Einweisung nicht ausgestellt |

### 9.2 Alle Action-Checkpoints (aktiv)

| ID | Category | Scope | Placement | Config? | Profile (Anzahl) |
|---|---|---|---|---|---|
| `DIGITAL_REQUEST` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | 13 Profile |
| `BOOK_APPOINTMENT` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | 13 Profile |
| `INSURANCE_DATA_APP_TRANSFER` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | 6 Profile |
| `DOCUMENT_UPLOAD` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Ja | 6 Profile |
| `CONTACT_PERSON_INFO` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | 3 Profile |
| `CONTROL_APPOINTMENT_RECOMMENDED` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | 3 Profile |
| `CARE_CHANNEL_CHOICE` | INFO | GLOBAL | SHARED_BOTTOM | Nein | 2 Profile |
| `ACUTE_OPEN_CONSULTATION_ACTION` | INFO | GLOBAL | SHARED_BOTTOM | Ja | 3 Profile |
| `DIGITAL_REQUEST_PROCESSING_TIME` | INFO | GLOBAL | SHARED_BOTTOM | Ja | 1 Profil |
| `PROCESSING_DELAY` | INFO | GLOBAL | SHARED_BOTTOM | Nein | 1 Profil (RX guidanceRule) |
| `TECHNICAL_ISSUE` | INFO | GLOBAL | SHARED_BOTTOM | Nein | 1 Profil (RX guidanceRule) |
| `PAYMENT_ONSITE_INFO` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | 1 Profil |
| `INFECTIOUS_CONTACT_DIGITALLY` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | ACU |
| `INFECTIOUS_VIDEO_CONSULTATION` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | ACU |
| `E_RECIPE_USE` | INFO | GLOBAL | ATTACHED | Nein | RX |
| `PHARMACY_INFORMATION` | NEXT_STEP | GLOBAL | ATTACHED | Nein | RX |
| `INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED` | INFO | GLOBAL | ATTACHED | Nein | ACU |
| `URINE_SAMPLE_ONSITE` | NEXT_STEP | GLOBAL | ATTACHED | Nein | SMP |
| `TRANSPORT_QUESTIONNAIRE_REQUEST` | NEXT_STEP | GLOBAL | ATTACHED | Nein | HOSP |
| `ONLINE_ANAMNESIS` | NEXT_STEP | GLOBAL | SHARED_BOTTOM | Nein | _(ungebunden)_ |
| `AU_NEW_PATIENT_3DAY_LIMIT` | INFO | SPECIFIC | ATTACHED | Nein | AU |
| `LAB_APPOINTMENT_INTERNAL` | NEXT_STEP | SPECIFIC | ATTACHED | Ja | LAB |
| `LAB_APPOINTMENT_CHECKUP` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_APPOINTMENT_INDIVIDUAL` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_APPOINTMENT_DOCTOR` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_BRING_REFERRAL` | PREPARATION | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_COST_COVERED_BY_REFERRAL` | INFO | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_SELF_PAYER_NOTE` | INFO | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_FASTING_REQUIRED` | PREPARATION | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_RESULT_TIME` | INFO | SPECIFIC | ATTACHED | Nein | LAB |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | LAB, SMP |
| `URINE_SAMPLE_INSTRUCTIONS` | PREPARATION | SPECIFIC | ATTACHED | Nein | SMP |
| `STOOL_SAMPLE_INSTRUCTIONS` | PREPARATION | SPECIFIC | ATTACHED | Nein | SMP |
| `SAMPLE_HANDOVER` | PROCESS | SPECIFIC | ATTACHED | Nein | SMP |
| `ACUTE_BOOKING_INFO` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | ACU |
| `REF_ORIGINAL_VS_PDF` | INFO | SPECIFIC | ATTACHED | Nein | REF |
| `REF_BOOKING_CODE_PROCESS` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | REF |
| `IMMUNIZATION_BOOK_VACCINATION` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | IMM |
| `IMMUNIZATION_BOOK_COUNSELING` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | IMM |
| `IMMUNIZATION_BRING_VACCINATION_RECORD` | PREPARATION | SPECIFIC | ATTACHED | Nein | IMM |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | NEXT_STEP | SPECIFIC | ATTACHED | Ja | APP |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | NEXT_STEP | SPECIFIC | ATTACHED | Ja | APP |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | NEXT_STEP | SPECIFIC | ATTACHED | Ja | APP |
| `APPOINTMENT_BOOK_GENERAL` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_BOOK_EKG_ORDER` | NEXT_STEP | SPECIFIC | ATTACHED | Ja | APP |
| `APPOINTMENT_INFO_TYPE_PURPOSE` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_BLOOD_DRAW_NOT_DOCTOR_VISIT` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_VIDEO_SCOPE` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_IN_PERSON_REQUIRED` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_CHECKUP_PURPOSE` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_CHRONIC_CONTROL_PURPOSE` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_SHORT_NOTICE_CANCELLATION_IMPACT` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_BOOKING_RESTRICTED_AFTER_NO_SHOW` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `APPOINTMENT_INFO_BOOKING_REENABLED_AFTER_CLARIFICATION` | INFO | SPECIFIC | ATTACHED | Nein | APP |
| `BILLING_NOT_COVERED_BY_STATUTORY` | INFO | SPECIFIC | ATTACHED | Nein | BIL |
| `BILLING_GOA_BILLING` | INFO | SPECIFIC | ATTACHED | Nein | BIL |
| `BILLING_ONSITE_PAYMENT` | INFO | SPECIFIC | SHARED_BOTTOM | Nein | BIL |
| `BILLING_CONTACT_EXTERNAL_PARTY` | NEXT_STEP | SPECIFIC | ATTACHED | Nein | BIL |
| `BILLING_ADDRESS_UPDATE_REQUESTED` | NEXT_STEP | SPECIFIC | SHARED_BOTTOM | Nein | BIL |
| `ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED` | INFO | SPECIFIC | ATTACHED | Nein | ONB |
| `ONBOARDING_PROVIDE_IDENTITY_DATA` | INFO | SPECIFIC | SHARED_BOTTOM | Nein | ONB |
| `ONBOARDING_DATA_MISSING_CONTEXT` | INFO | SPECIFIC | ATTACHED | Nein | ONB |
| `ONBOARDING_WRONG_PRACTICE_NOTICE` | INFO | SPECIFIC | ATTACHED | Nein | ONB |
| `MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED` | INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED` | INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `MESSAGE_INTRO_PRACTICE_FOLLOWUP` | INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `MESSAGE_INTRO_MISSING_INFO` | INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `MESSAGE_INTRO_APPOINTMENT_PREPARATION` | INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `SECTION_INTRO_INFO_MISSING` | SECTION_INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `SECTION_INTRO_DOCS_MISSING` | SECTION_INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `SECTION_INTRO_DOCS_COMPLETE` | SECTION_INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `SECTION_INTRO_REVIEWED` | SECTION_INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `SECTION_INTRO_IN_PROGRESS` | SECTION_INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |
| `SECTION_INTRO_NOT_RESPONSIBLE` | SECTION_INTRO | GLOBAL | SHARED_BOTTOM | Nein | alle |

### 9.3 Config-abhängige Checkpoints

| ID | Typ | Config-Felder |
|---|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | ACTION/INFO | `openConsultationDays`, `openConsultationHours`, `openConsultationCapacityLimited` |
| `DIGITAL_REQUEST_PROCESSING_TIME` | ACTION/INFO | `digitalRequestProcessingTimeMin`, `digitalRequestProcessingTimeMax`, `digitalRequestProcessingTimeUnit` |
| `LAB_APPOINTMENT_INTERNAL` | ACTION/NEXT_STEP | `doctorOrderBookingCode` |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | ACTION/NEXT_STEP | `bookingCalendarName`, `findingsReviewBookingCode` |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | ACTION/NEXT_STEP | `bookingCalendarName`, `checkupSecondBookingCode` |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | ACTION/NEXT_STEP | `bookingCalendarName`, `chronicControlBookingCode` |
| `APPOINTMENT_BOOK_EKG_ORDER` | ACTION/NEXT_STEP | `bookingCalendarName`, `doctorOrderBookingCode` |
| `DOCUMENT_UPLOAD` | ACTION/NEXT_STEP | `uploadPlatformName`, `uploadPlatformAccountLabel` |
| `ONBOARDING_DOCTOLIB_INFO` | EXPLANATION | `uploadPlatformName`, `uploadPlatformAccountLabel` |
| `BILLING_INVOICE_TIMING` | EXPLANATION | `billingCycleLabel` |
| `TECH_VIDEO_NOT_WORKING` | EXPLANATION | `videoSupportContact` |

### 9.4 Häufig wiederverwendete Checkpoints (in ≥ 3 Profilen)

| ID | Typ | Profile | Verwendungsart |
|---|---|---|---|
| `DIGITAL_REQUEST` | ACTION/NEXT_STEP | 13 | availableActionIds + boundActionCheckpointIds |
| `BOOK_APPOINTMENT` | ACTION/NEXT_STEP | 13 | availableActionIds + boundActionCheckpointIds |
| `INSURANCE_DATA_APP_TRANSFER` | ACTION/NEXT_STEP | AU, RX, REF, APP, ONB, BIL | boundActionCheckpointIds (Trigger: fehlender VN) |
| `DOCUMENT_UPLOAD` | ACTION/NEXT_STEP | RX, HMV, HOSP, APP, DOC, ONB | boundActionCheckpointIds |
| `CONTACT_PERSON_INFO` | ACTION/NEXT_STEP | AU, REF, RX, ONB | availableActionIds + bound |
| `CONTROL_APPOINTMENT_RECOMMENDED` | ACTION/NEXT_STEP | AU, HOSP, RX | boundActionCheckpointIds |
| `ACUTE_OPEN_CONSULTATION_ACTION` | ACTION/INFO | AU, ACU, APP | boundActionCheckpointIds |
| `CARE_CHANNEL_CHOICE` | ACTION/INFO | AU, ACU | boundActionCheckpointIds |
| `BILLING_COST_NOT_COVERED` | EXPLANATION | LAB, BIL | specificCheckpointIds |
| `APPOINTMENT_DATA_INCOMPLETE` | EXPLANATION | LAB, APP | specificCheckpointIds |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | ACTION/NEXT_STEP | LAB, SMP | specificCheckpointIds + boundActionCheckpointIds |
| `AU_MEDICAL_CONSULTATION_REQUIRED` + `LAB_MEDICAL_CONSULTATION_REQUIRED` + `REF_MEDICAL_CONSULTATION_REQUIRED` + `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED` + `HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED` | EXPLANATION/MEDICAL_REVIEW_REQUIRED | je 1 Profil | gleiche Funktion, profilspezifisch modelliert (m5=NEED_VISIT) |

### 9.5 Checkpoints mit m5Code (M5-Ausgabe)

| ID | m5Code | Profil |
|---|---|---|
| `AU_FOLLOWUP_REQUIRES_VISIT` | NEED_VISIT | AU |
| `AU_MEDICAL_CONSULTATION_REQUIRED` | NEED_VISIT | AU |
| `LAB_MEDICAL_CONSULTATION_REQUIRED` | NEED_VISIT | LAB |
| `REF_MEDICAL_CONSULTATION_REQUIRED` | NEED_VISIT | REF |
| `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED` | NEED_VISIT | DOC |
| `HMV_DOCTOR_REVIEW_REQUIRED` | NEED_VISIT | HMV |
| `HMV_IN_PERSON_REQUIRED` | NEED_VISIT | HMV |
| `INFECTIOUS_PROTOCOL` | INFECTIOUS | ACU (global) |
| `REF_SPECIALTY_REQUIRED` | NO_SPECIALTY | REF |
| `REF_HAV_CASE` | HAV | REF |
| `HMV_INFO_MISSING` | NO_DATA | HMV |
| `TRANSPORT_INFO_MISSING` | NO_DATA | _(global, ungebunden)_ |
| `HMV_PREVIOUS_ORDER_MISSING` | NO_DOC | HMV |
| `HMV_NOT_DIGITAL_POSSIBLE` | WRONG_CHANNEL | HMV |
| `TECH_VIDEO_NOT_WORKING` | TECH | TECH |
| `TECH_UPLOAD_FAILED` | TECH | _(ungebunden)_ |
