# Inquiry-Profile – Übersicht

Quelle: `lib/inquiries/inquiryProfileCatalog.ts` (INQUIRY_PROFILE_CATALOG_V2)  
Stand: Mai 2026 · Nur lesende Ist-Analyse · Kein Commit.

---

## Inhaltsverzeichnis

| Profil-ID | Label | Reihenfolge | Decision-Checkpoint |
|---|---|---|---|
| [ACUTE_CARE](#acute_care) | Akuttermin / offene Sprechstunde | 10 | `ACUTE_CARE_DECISION` |
| [APPOINTMENT](#appointment) | Termin | 20 | _(keiner)_ |
| [AU](#au) | AU / Arbeitsunfähigkeitsbescheinigung | 30 | `AU_DECISION` |
| [PRESCRIPTION](#prescription) | Rezept | 40 | `PRESCRIPTION_DECISION` |
| [MEDICAL_DOCUMENTS](#medical_documents) | Atteste / Bescheinigungen | 50 | `MEDICAL_DOCUMENTS_DECISION` |
| [HEILMITTELVERORDNUNG](#heilmittelverordnung) | Heilmittelverordnung | 55 | _(keiner)_ |
| [REFERRAL](#referral) | Überweisung | 60 | `REFERRAL_DECISION` |
| [HOSPITAL_ADMISSION](#hospital_admission) | Krankenhauseinweisung | 65 | `HOSPITAL_ADMISSION_DECISION` |
| [IMMUNIZATION](#immunization) | Impfung | 70 | `IMMUNIZATION_DECISION` |
| [LAB](#lab) | Labor | 80 | `LAB_DECISION` |
| [SAMPLE_COLLECTION](#sample_collection) | Urin- und Stuhlprobe | 90 | `SAMPLE_COLLECTION_DECISION` |
| [ONBOARDING](#onboarding) | Patientenaufnahme / Registrierung | 100 | _(keiner)_ |
| [BILLING](#billing) | Abrechnung | 110 | _(keiner)_ |
| [TECH_SUPPORT](#tech_support) | Technische Probleme / Digitale Infrastruktur | 120 | _(keiner)_ |

---

## ACUTE_CARE

**Label:** Akuttermin / offene Sprechstunde  
**displayOrder:** 10  
**Decision-Checkpoint:** `ACUTE_CARE_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `ACUTE_EXCLUSION` | CHANNEL_NOT_SUITABLE – planbare Anliegen ausschließen |
| `CHRONIC_EXCLUSION` | CHANNEL_NOT_SUITABLE – planbare Anliegen bei Chronikern |
| `ACUTE_PURPOSE` | PROCESS_INFO – Zweck der Akutsprechstunde |
| `ACUTE_APPOINTMENT_INFO` | PROCESS_INFO – M2-Schalter für Buchungshinweis |
| `NO_HOME_VISITS` | CHANNEL_NOT_SUITABLE – Hausbesuche nicht im Angebot |

### Globale Checkpoints (boundGlobalCheckpointIds)
| ID | Zweck |
|---|---|
| `INFECTIOUS_PROTOCOL` | EXPLANATION – Infektionsschutz-Schalter |

### Verfügbare Actions (availableActionIds)
- `BOOK_APPOINTMENT`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | immer (hideWhenAny leer) |
| `ACUTE_BOOKING_INFO` | `ACUTE_APPOINTMENT_INFO = YES` |
| `CARE_CHANNEL_CHOICE` | immer (hideWhenAny leer) |
| `INFECTIOUS_CONTACT_DIGITALLY` | `INFECTIOUS_PROTOCOL = YES` |
| `INFECTIOUS_VIDEO_CONSULTATION` | `INFECTIOUS_PROTOCOL = YES` |
| `INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED` | `INFECTIOUS_PROTOCOL = YES` |

### Besonderheiten
- Einziges Profil mit einem `boundGlobalCheckpointIds`-Eintrag (`INFECTIOUS_PROTOCOL`)
- `ACUTE_OPEN_CONSULTATION_ACTION` und `CARE_CHANNEL_CHOICE` sind immer sichtbar (keine Bedingung)
- Infektions-Block schaltet 3 Actions gleichzeitig frei

---

## APPOINTMENT

**Label:** Termin  
**displayOrder:** 20  
**Decision-Checkpoint:** _(keiner — leerer String)_

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `APPOINTMENT_IN_PERSON_REQUIRED_FOR_REQUEST` | MEDICAL_REVIEW_REQUIRED |
| `APPOINTMENT_WRONG_TYPE` | CHANNEL_NOT_SUITABLE |
| `APPOINTMENT_BOOKING_CODE_REQUIRED` | PROCESS_INFO |
| `APPOINTMENT_EXTERNAL_FINDING_PRESENT` | MISSING_DOCUMENT |
| `APPOINTMENT_EXTERNAL_FINDING_LONG_ABSENCE` | PROCESS_INFO |
| `APPOINTMENT_DATA_INCOMPLETE` | MISSING_INFORMATION |
| `APPOINTMENT_REASON_UNCLEAR` | MISSING_INFORMATION |
| `VIDEO_CONSULTATION_REGION_LIMITATION` | CHANNEL_NOT_SUITABLE |
| `APPOINTMENT_TYPE_QUESTION` | PROCESS_INFO – zentraler Trigger für Info-Actions |
| `APPOINTMENT_INSURANCE_PROOF_MISSING` | MISSING_DOCUMENT |
| `APPOINTMENT_INTERNAL_ORDER_EKG` | PROCESS_INFO |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | immer |
| `BOOK_APPOINTMENT` | `APPOINTMENT_WRONG_TYPE = YES` |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | `BOOKING_CODE_REQUIRED = YES` oder `TYPE_QUESTION = YES` |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | `BOOKING_CODE_REQUIRED = YES` oder `TYPE_QUESTION = YES` |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | `BOOKING_CODE_REQUIRED = YES` oder `TYPE_QUESTION = YES` |
| `APPOINTMENT_BOOK_GENERAL` | _(nicht in boundActionConditions — immer wenn ACTIVE)_ |
| `DOCUMENT_UPLOAD` | `APPOINTMENT_EXTERNAL_FINDING_PRESENT = YES` |
| `APPOINTMENT_INFO_TYPE_PURPOSE` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_BLOOD_DRAW_NOT_DOCTOR_VISIT` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_VIDEO_SCOPE` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_IN_PERSON_REQUIRED` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_CHECKUP_PURPOSE` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_CHRONIC_CONTROL_PURPOSE` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_SHORT_NOTICE_CANCELLATION_IMPACT` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_BOOKING_RESTRICTED_AFTER_NO_SHOW` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `APPOINTMENT_INFO_BOOKING_REENABLED_AFTER_CLARIFICATION` | `APPOINTMENT_TYPE_QUESTION = YES` |
| `INSURANCE_DATA_APP_TRANSFER` | `APPOINTMENT_INSURANCE_PROOF_MISSING = YES` |
| `APPOINTMENT_BOOK_EKG_ORDER` | `APPOINTMENT_INTERNAL_ORDER_EKG = YES` |

### Besonderheiten
- Kein Decision-Checkpoint (kein Ja/Nein-Outcome)
- Größtes Profil: 18 gebundene Action-Checkpoints
- `APPOINTMENT_TYPE_QUESTION = YES` schaltet 9 Info-Actions gleichzeitig frei
- Drei terminartspezifische Buchungs-Actions mit Buchungscode (config-abhängig)

---

## AU

**Label:** AU / Arbeitsunfähigkeitsbescheinigung  
**displayOrder:** 30  
**Decision-Checkpoint:** `AU_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `AU_BACKDATE_LIMIT` | RULE_TIME_LIMIT – Rückdatierungsgrenze 2 Tage |
| `AU_NEW_PATIENT_LIMIT` | RULE_TIME_LIMIT – M2-Schalter Neupatient |
| `AU_MISSING_EGK` | MISSING_INFORMATION – Versichertendaten fehlen |
| `AU_WORK_ACCIDENT` | EXTERNAL_RESPONSIBILITY – Arbeits-/Wegeunfall |
| `AU_CHILD_SICK` | EXTERNAL_RESPONSIBILITY – Kindkrank-Bescheinigung |
| `AU_DIGITAL_AU_PROCESS` | PROCESS_INFO – M2-Schalter digitaler Prozess |
| `AU_NO_APPOINTMENT_ACUTE` | _(kein specificRole)_ – M2-Schalter akute Beschwerden |
| `AU_MEDICAL_CONSULTATION_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `AU_FOLLOWUP_REQUIRES_VISIT` | MEDICAL_REVIEW_REQUIRED |
| `EAU_VALID_WITHOUT_SIGNATURE` | PROCESS_INFO – eAU ohne Unterschrift gültig |
| `RETURN_TO_WORK_ALLOWED_DURING_AU` | PROCESS_INFO – vorzeitige Rückkehr möglich |
| `AU_EXTENSION_REQUIRES_EXAMINATION` | MEDICAL_REVIEW_REQUIRED |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `BOOK_APPOINTMENT`
- `CONTACT_PERSON_INFO`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `AU_NEW_PATIENT_3DAY_LIMIT` | `AU_NEW_PATIENT_LIMIT = YES` |
| `DIGITAL_REQUEST` | `AU_DIGITAL_AU_PROCESS = YES` oder `AU_NO_APPOINTMENT_ACUTE = YES` |
| `DIGITAL_REQUEST_PROCESSING_TIME` | `AU_DIGITAL_AU_PROCESS = YES` oder `AU_NO_APPOINTMENT_ACUTE = YES` |
| `ACUTE_OPEN_CONSULTATION_ACTION` | `AU_NO_APPOINTMENT_ACUTE = YES` |
| `CARE_CHANNEL_CHOICE` | immer |
| `CONTROL_APPOINTMENT_RECOMMENDED` | immer |
| `INSURANCE_DATA_APP_TRANSFER` | `AU_MISSING_EGK = YES` |

### Besonderheiten
- `DIGITAL_REQUEST` und `DIGITAL_REQUEST_PROCESSING_TIME` teilen dieselbe Trigger-Bedingung (OR-Verknüpfung mit 2 Schaltern)
- `DIGITAL_REQUEST_PROCESSING_TIME` ist config-abhängig (`digitalRequestProcessingTimeMin/Max/Unit`)
- `CARE_CHANNEL_CHOICE` und `CONTROL_APPOINTMENT_RECOMMENDED` immer sichtbar (keine hideWhenAny-Einträge)

---

## PRESCRIPTION

**Label:** Rezept  
**displayOrder:** 40  
**Decision-Checkpoint:** `PRESCRIPTION_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `PRESCRIPTION_INDICATION_NOT_DOCUMENTED` | MISSING_INFORMATION |
| `PRESCRIPTION_DOCTOR_REVIEW_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `PRESCRIPTION_FOLLOWUP_REQUIRED_IN_PERSON` | MEDICAL_REVIEW_REQUIRED |
| `PRESCRIPTION_BTM_ADHS_RULES` | EXTERNAL_RESPONSIBILITY |
| `PRESCRIPTION_GYN_EXCLUSIVITY` | EXTERNAL_RESPONSIBILITY |
| `PRESCRIPTION_STATUTORY_POSSIBLE` | OUTCOME_INFO – Kassenrezept möglich |
| `PRESCRIPTION_PRIVATE_ONLY` | RULE_COST_COVERAGE |
| `PRESCRIPTION_SPECIALIST_RESPONSIBLE` | EXTERNAL_RESPONSIBILITY |
| `PRESCRIPTION_PATIENT_NOT_IN_GERMANY` | PROCESS_INFO |
| `PRESCRIPTION_CHRONIC_PATIENT` | PROCESS_INFO |
| `PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK` | PROCESS_INFO |
| `CONTRACEPTION_SPECIALIST_ONLY` | EXTERNAL_RESPONSIBILITY |
| `PRESCRIPTION_INSURANCE_PROOF_MISSING` | MISSING_DOCUMENT |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`
- `BOOK_APPOINTMENT`
- `CONTROL_APPOINTMENT_RECOMMENDED`
- `CONTACT_PERSON_INFO`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `E_RECIPE_USE` | `PRESCRIPTION_STATUTORY_POSSIBLE = YES` |
| `PHARMACY_INFORMATION` | außer `PRESCRIPTION_NO_PRESCRIPTION_REQUIRED = YES` |
| `INSURANCE_DATA_APP_TRANSFER` | `PRESCRIPTION_INSURANCE_PROOF_MISSING = YES` |

### actionGuidanceRules (M3-Hinweise)
| Regel-ID | Checkpoint | Bedingung | Hinweis |
|---|---|---|---|
| `PRESCRIPTION_DOCUMENT_UPLOAD_RECOMMENDED` | `DOCUMENT_UPLOAD` | `SPECIALIST_REPORT_REQUIRED = YES` | recommended |
| `PRESCRIPTION_E_RECIPE_USE_RECOMMENDED` | `E_RECIPE_USE` | Decision POSSIBLE + `STATUTORY_POSSIBLE = YES` | recommended |
| `PRESCRIPTION_E_RECIPE_USE_HIDDEN` | `E_RECIPE_USE` | Decision NOT_POSSIBLE | hiddenByDefault |
| `PRESCRIPTION_PHARMACY_INFORMATION_RECOMMENDED` | `PHARMACY_INFORMATION` | Decision POSSIBLE | recommended |
| `PRESCRIPTION_BOOK_APPOINTMENT_CAUTION` | `BOOK_APPOINTMENT` | `BTM_ADHS = YES` oder `GYN_EXCLUSIVITY = YES` | caution |
| `PRESCRIPTION_DIGITAL_REQUEST_VISIBLE` | `DIGITAL_REQUEST` | Decision NOT_POSSIBLE | visible |
| `PRESCRIPTION_BOOK_APPOINTMENT_VISIBLE` | `BOOK_APPOINTMENT` | Decision NOT_POSSIBLE | visible |
| `PRESCRIPTION_PROCESSING_DELAY_VISIBLE` | `PROCESSING_DELAY` | Decision NOT_POSSIBLE | visible |
| `PRESCRIPTION_TECHNICAL_ISSUE_VISIBLE` | `TECHNICAL_ISSUE` | Decision NOT_POSSIBLE | visible |
| `PRESCRIPTION_CONTROL_APPOINTMENT_RECOMMENDED` | `CONTROL_APPOINTMENT_RECOMMENDED` | `CHRONIC_PATIENT = YES` | recommended |

### Besonderheiten
- Umfangreichstes `actionGuidanceRules`-Set (10 Regeln)
- `E_RECIPE_USE` kann je nach Decision POSSIBLE/NOT_POSSIBLE empfohlen oder versteckt werden
- `BOOK_APPOINTMENT` erhält bei BTM/ADHS/Gynäkologie einen Vorsichts-Hinweis mit Text

---

## MEDICAL_DOCUMENTS

**Label:** Atteste / Bescheinigungen  
**displayOrder:** 50  
**Decision-Checkpoint:** `MEDICAL_DOCUMENTS_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `MEDICAL_DOCUMENT_POSSIBLE` | PROCESS_INFO – Attest grundsätzlich möglich |
| `MEDICAL_DOCUMENT_PRIVATE_SERVICE` | RULE_COST_COVERAGE – Selbstzahlerleistung |
| `MEDICAL_DOCUMENT_INFO_MISSING` | MISSING_INFORMATION |
| `MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED` | PROCESS_INFO – Übersetzung erforderlich |
| `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `SUSPECTED_DIAGNOSIS_EXPLANATION` | PROCESS_INFO – Bedeutung Verdachtsdiagnosen |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
_(keine — leeres Array)_

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `DIGITAL_REQUEST` | `MEDICAL_DOCUMENT_INFO_MISSING = YES` |
| `BOOK_APPOINTMENT` | `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED = YES` |
| `DOCUMENT_UPLOAD` | `MEDICAL_DOCUMENT_INFO_MISSING = YES` |
| `PAYMENT_ONSITE_INFO` | `MEDICAL_DOCUMENT_PRIVATE_SERVICE = YES` |

### Besonderheiten
- `availableActionIds` ist leer (kein freies Hinzufügen von Actions in M3)
- `DIGITAL_REQUEST` und `DOCUMENT_UPLOAD` teilen denselben Trigger

---

## HEILMITTELVERORDNUNG

**Label:** Heilmittelverordnung  
**displayOrder:** 55  
**Decision-Checkpoint:** _(keiner — leerer String)_

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `HMV_REQUEST_COMPLETE` | PROCESS_INFO – Angaben vollständig |
| `HMV_INFO_MISSING` | MISSING_INFORMATION |
| `HMV_PREVIOUS_ORDER_MISSING` | MISSING_DOCUMENT |
| `HMV_DOCTOR_REVIEW_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `HMV_IN_PERSON_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `HMV_NOT_DIGITAL_POSSIBLE` | CHANNEL_NOT_SUITABLE |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
_(keine — leeres Array)_

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `DIGITAL_REQUEST` | `HMV_INFO_MISSING = YES` |
| `DOCUMENT_UPLOAD` | `HMV_PREVIOUS_ORDER_MISSING = YES` |
| `BOOK_APPOINTMENT` | `HMV_IN_PERSON_REQUIRED = YES` |

### Besonderheiten
- Kein Decision-Checkpoint, keine availableActionIds
- Alle 3 Actions sind strikt an konkrete Specific-Schalter geknüpft
- 4 der 6 Checkpoints tragen `m5Code`-Werte (`NO_DATA`, `NO_DOC`, `NEED_VISIT`, `WRONG_CHANNEL`)

---

## REFERRAL

**Label:** Überweisung  
**displayOrder:** 60  
**Decision-Checkpoint:** `REFERRAL_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `REFERRAL_CAN_BE_ISSUED` | OUTCOME_INFO |
| `REF_SPECIALTY_REQUIRED` | MISSING_INFORMATION |
| `REF_PSYCHOTHERAPY_FIRST_STEP` | PROCESS_INFO |
| `REF_HAV_CASE` | _(kein specificRole)_ – M2-Schalter HAV/Buchungscode |
| `REF_MEDICAL_CONSULTATION_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `REFERRAL_INSURANCE_PROOF_MISSING` | MISSING_DOCUMENT |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `BOOK_APPOINTMENT`
- `DIGITAL_REQUEST`
- `CONTACT_PERSON_INFO`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `REF_BOOKING_CODE_PROCESS` | `REF_HAV_CASE = YES` |
| `REF_ORIGINAL_VS_PDF` | immer (hideWhenAny leer) |
| `INSURANCE_DATA_APP_TRANSFER` | `REFERRAL_INSURANCE_PROOF_MISSING = YES` |

### actionGuidanceRules
| Regel-ID | Checkpoint | Bedingung | Hinweis |
|---|---|---|---|
| `REF_DIGITAL_REQUEST_RECOMMENDED` | `DIGITAL_REQUEST` | `REF_SPECIALTY_REQUIRED = YES` | recommended |
| `REF_BOOK_APPOINTMENT_VISIBLE` | `BOOK_APPOINTMENT` | `REF_MEDICAL_CONSULTATION_REQUIRED = YES` | visible |

### Besonderheiten
- `REF_ORIGINAL_VS_PDF` ist immer aktiv (keine Abschaltbedingung)
- `REF_HAV_CASE` hat keinen eigenen Ausgabetext — reiner M2-Schalter

---

## HOSPITAL_ADMISSION

**Label:** Krankenhauseinweisung  
**displayOrder:** 65  
**Decision-Checkpoint:** `HOSPITAL_ADMISSION_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `HOSPITAL_ADMISSION_CAN_BE_ISSUED` | OUTCOME_INFO |
| `HOSPITAL_ADMISSION_MISSING_INFO` | MISSING_INFORMATION |
| `HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `HOSPITAL_TRANSPORT_REQUIRED` | PROCESS_INFO |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `BOOK_APPOINTMENT`
- `DIGITAL_REQUEST`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `CONTROL_APPOINTMENT_RECOMMENDED` | immer (hideWhenAny leer) |
| `TRANSPORT_QUESTIONNAIRE_REQUEST` | immer (hideWhenAny leer) |

### actionGuidanceRules
| Regel-ID | Checkpoint | Bedingung | Hinweis |
|---|---|---|---|
| `HOSP_DIGITAL_REQUEST_RECOMMENDED` | `DIGITAL_REQUEST` | `MISSING_INFO = YES` | recommended |
| `HOSP_DOCUMENT_UPLOAD_VISIBLE` | `DOCUMENT_UPLOAD` | `MISSING_INFO = YES` | visible |
| `HOSP_BOOK_APPOINTMENT_VISIBLE` | `BOOK_APPOINTMENT` | `MEDICAL_CONSULTATION_REQUIRED = YES` | visible |
| `HOSP_CONTROL_APPOINTMENT_RECOMMENDED` | `CONTROL_APPOINTMENT_RECOMMENDED` | `MEDICAL_CONSULTATION_REQUIRED = YES` | recommended |
| `HOSP_TRANSPORT_QUESTIONNAIRE_RECOMMENDED` | `TRANSPORT_QUESTIONNAIRE_REQUEST` | `HOSPITAL_TRANSPORT_REQUIRED = YES` | recommended |

### Besonderheiten
- `CONTROL_APPOINTMENT_RECOMMENDED` und `TRANSPORT_QUESTIONNAIRE_REQUEST` sind standardmäßig immer aktiv
- `TRANSPORT_QUESTIONNAIRE_REQUEST` zusätzlich über actionGuidanceRule als recommended schaltbar

---

## IMMUNIZATION

**Label:** Impfung  
**displayOrder:** 70  
**Decision-Checkpoint:** `IMMUNIZATION_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `IMMUNIZATION_STANDARD_AVAILABLE` | PROCESS_INFO – Grippe/COVID ohne Beratung buchbar |
| `IMMUNIZATION_RISK_REVIEW_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `IMMUNIZATION_STATUS_UNCLEAR` | MISSING_INFORMATION |
| `IMMUNIZATION_VACCINATION_RECORD_MISSING` | MISSING_DOCUMENT |
| `IMMUNIZATION_TRAVEL_MEDICINE` | EXTERNAL_RESPONSIBILITY |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `BOOK_APPOINTMENT`
- `DIGITAL_REQUEST`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `IMMUNIZATION_BOOK_VACCINATION` | `IMMUNIZATION_STANDARD_AVAILABLE = YES` |
| `IMMUNIZATION_BOOK_COUNSELING` | `IMMUNIZATION_RISK_REVIEW_REQUIRED = YES` |
| `IMMUNIZATION_BRING_VACCINATION_RECORD` | außer `IMMUNIZATION_TRAVEL_MEDICINE = YES` |

### Besonderheiten
- `IMMUNIZATION_BRING_VACCINATION_RECORD` ist standardmäßig aktiv und wird nur bei Reisemedizin unterdrückt
- `textByAudience.contact_person` bei `IMMUNIZATION_VACCINATION_RECORD_MISSING` vorhanden

---

## LAB

**Label:** Labor  
**displayOrder:** 80  
**Decision-Checkpoint:** `LAB_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `LAB_MPU_EXCLUSION` | _(kein specificRole)_ – MPU/forensisch ausschließen |
| `LAB_EXTERNAL_REFERRAL` | EXTERNAL_RESPONSIBILITY – externe Überweisung |
| `LAB_INTERNAL_ORDER` | PROCESS_INFO – interne Anordnung |
| `LAB_MEDICAL_CONSULTATION_REQUIRED` | MEDICAL_REVIEW_REQUIRED |
| `LAB_CHECKUP_RULES` | _(kein specificRole)_ – Check-up-Regelung |
| `BILLING_COST_NOT_COVERED` | RULE_COST_COVERAGE _(geteilt mit BILLING)_ |
| `APPOINTMENT_DATA_INCOMPLETE` | MISSING_INFORMATION _(geteilt mit APPOINTMENT)_ |
| `LAB_INTERNAL_ORDER_AVAILABLE` | PROCESS_INFO |
| `LAB_CHECKUP_BASIC_LAB_INCLUDED` | PROCESS_INFO |
| `LAB_SELF_PAYER_POSSIBLE` | RULE_COST_COVERAGE |
| `LAB_CONTROL_TIMING_NOT_DUE` | RULE_TIME_LIMIT |
| `LAB_RESULTS_PENDING` | PROCESS_INFO |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | _(Action, s. u.)_ |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`
- `BOOK_APPOINTMENT`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `LAB_APPOINTMENT_INTERNAL` | `LAB_INTERNAL_ORDER = YES` und nicht `LAB_CHECKUP_RULES = YES` |
| `LAB_APPOINTMENT_CHECKUP` | `LAB_CHECKUP_RULES = YES` |
| `LAB_APPOINTMENT_INDIVIDUAL` | außer `LAB_INTERNAL_ORDER = YES` |
| `LAB_APPOINTMENT_DOCTOR` | außer `LAB_INTERNAL_ORDER = YES` und außer `LAB_EXTERNAL_REFERRAL = YES` |
| `LAB_BRING_REFERRAL` | `LAB_EXTERNAL_REFERRAL = YES` |
| `LAB_COST_COVERED_BY_REFERRAL` | `LAB_EXTERNAL_REFERRAL = YES` |
| `LAB_SELF_PAYER_NOTE` | außer `LAB_INTERNAL_ORDER = YES` und außer `LAB_EXTERNAL_REFERRAL = YES` |
| `LAB_FASTING_REQUIRED` | außer `LAB_MPU_EXCLUSION = YES` |
| `LAB_RESULT_TIME` | außer `LAB_MPU_EXCLUSION = YES` |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | _(immer, kein hideWhenAny)_ |

### Besonderheiten
- `LAB_APPOINTMENT_INTERNAL` enthält config-abhängigen Buchungscode (`doctorOrderBookingCode`)
- `LAB_FASTING_REQUIRED` und `LAB_RESULT_TIME` erscheinen standardmäßig, werden nur bei MPU unterdrückt
- `BILLING_COST_NOT_COVERED` und `APPOINTMENT_DATA_INCOMPLETE` sind Checkpoints, die in mehreren Profilen wiederverwendet werden

---

## SAMPLE_COLLECTION

**Label:** Urin- und Stuhlprobe  
**displayOrder:** 90  
**Decision-Checkpoint:** `SAMPLE_COLLECTION_DECISION`

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `SAMPLE_COLLECTION_ORDER_AVAILABLE` | PROCESS_INFO – Anordnung liegt vor |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`
- `BOOK_APPOINTMENT`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `URINE_SAMPLE_INSTRUCTIONS` | _(immer aktiv wenn ACTIVE — keine Bedingung in boundActionConditions)_ |
| `STOOL_SAMPLE_INSTRUCTIONS` | _(immer aktiv wenn ACTIVE — keine Bedingung in boundActionConditions)_ |
| `SAMPLE_HANDOVER` | _(immer aktiv wenn ACTIVE — keine Bedingung in boundActionConditions)_ |
| `URINE_SAMPLE_ONSITE` | `SAMPLE_COLLECTION_ORDER_AVAILABLE = YES` |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | _(immer aktiv wenn ACTIVE — keine Bedingung in boundActionConditions)_ |

### Besonderheiten
- Kleinstes Profil (1 Specific Checkpoint)
- `URINE_SAMPLE_INSTRUCTIONS`, `STOOL_SAMPLE_INSTRUCTIONS`, `SAMPLE_HANDOVER` haben keine Trigger-Bedingung in `boundActionConditions` → immer wenn ACTIVE

---

## ONBOARDING

**Label:** Patientenaufnahme / Registrierung  
**displayOrder:** 100  
**Decision-Checkpoint:** _(keiner)_

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `ONBOARDING_WRONG_PRACTICE` | EXTERNAL_RESPONSIBILITY – falsche Praxis |
| `ONBOARDING_IDENTITY_MISMATCH` | MISSING_INFORMATION – Patient nicht zuordenbar |
| `ONBOARDING_DATA_INCOMPLETE` | MISSING_INFORMATION – Daten unvollständig |
| `ONBOARDING_DATA_UPDATE_REQUIRED` | PROCESS_INFO – Daten aktualisieren |
| `ONBOARDING_GKV_DOCUMENT_MISSING` | MISSING_DOCUMENT |
| `ONBOARDING_PKV_PAS_MISSING` | MISSING_DOCUMENT |
| `ONBOARDING_DOCTOLIB_INFO` | PROCESS_INFO – config-abhängig |
| `INSURANCE_NUMBER_INVALID_FORMAT` | MISSING_INFORMATION |
| `ONBOARDING_PRIMARY_CARE_CONFIRMATION` | PROCESS_INFO – Hausarzt-Zuständigkeit |
| `ADULTS_ONLY_PRACTICE` | EXTERNAL_RESPONSIBILITY |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`
- `CONTACT_PERSON_INFO`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED` | `ONBOARDING_IDENTITY_MISMATCH = YES` |
| `ONBOARDING_PROVIDE_IDENTITY_DATA` | `ONBOARDING_IDENTITY_MISMATCH = YES` |
| `ONBOARDING_DATA_MISSING_CONTEXT` | `ONBOARDING_DATA_INCOMPLETE = YES` |
| `ONBOARDING_WRONG_PRACTICE_NOTICE` | `ONBOARDING_WRONG_PRACTICE = YES` |
| `DOCUMENT_UPLOAD` | `GKV_DOCUMENT_MISSING = YES` oder `PKV_PAS_MISSING = YES` |
| `INSURANCE_DATA_APP_TRANSFER` | `ONBOARDING_GKV_DOCUMENT_MISSING = YES` |

### actionGuidanceRules
| Regel-ID | Checkpoint | Bedingung | Hinweis |
|---|---|---|---|
| `ONBOARDING_GKV_DOCUMENT_UPLOAD_RECOMMENDED` | `DOCUMENT_UPLOAD` | `GKV_DOCUMENT_MISSING = YES` | recommended |
| `ONBOARDING_PKV_DOCUMENT_UPLOAD_RECOMMENDED` | `DOCUMENT_UPLOAD` | `PKV_PAS_MISSING = YES` | recommended |

### Besonderheiten
- `ONBOARDING_DOCTOLIB_INFO` verwendet `_cfg.uploadPlatformName` und `uploadPlatformAccountLabel`
- `ONBOARDING_IDENTITY_MISMATCH` und `ONBOARDING_WRONG_PRACTICE` haben leere `textByStatus` (reine M2-Schalter)
- GKV/PKV getrennt modelliert mit eigenem DOCUMENT_UPLOAD-Trigger

---

## BILLING

**Label:** Abrechnung  
**displayOrder:** 110  
**Decision-Checkpoint:** _(keiner)_

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `BILLING_COST_NOT_COVERED` | RULE_COST_COVERAGE _(geteilt mit LAB)_ |
| `BILLING_EXTERNAL_RESPONSIBILITY` | EXTERNAL_RESPONSIBILITY |
| `BILLING_ADDRESS_MISSING` | MISSING_INFORMATION |
| `BILLING_DOCUMENT_MISSING` | MISSING_DOCUMENT |
| `BILLING_EXTERNAL_PROVIDER` | PROCESS_INFO |
| `BILLING_INVOICE_TIMING` | PROCESS_INFO – config-abhängig (`billingCycleLabel`) |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`
- `BOOK_APPOINTMENT`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
| ID | Trigger-Bedingung |
|---|---|
| `BILLING_NOT_COVERED_BY_STATUTORY` | `BILLING_COST_NOT_COVERED = YES` |
| `BILLING_GOA_BILLING` | `BILLING_COST_NOT_COVERED = YES` |
| `BILLING_ONSITE_PAYMENT` | `BILLING_COST_NOT_COVERED = YES` |
| `BILLING_CONTACT_EXTERNAL_PARTY` | `BILLING_EXTERNAL_RESPONSIBILITY = YES` |
| `BILLING_ADDRESS_UPDATE_REQUESTED` | `BILLING_ADDRESS_MISSING = YES` |
| `INSURANCE_DATA_APP_TRANSFER` | `BILLING_DOCUMENT_MISSING = YES` |

### actionGuidanceRules
| Regel-ID | Checkpoint | Bedingung | Hinweis |
|---|---|---|---|
| `BILLING_DOCUMENT_UPLOAD_RECOMMENDED` | `DOCUMENT_UPLOAD` | `BILLING_DOCUMENT_MISSING = YES` | recommended |

### Besonderheiten
- `BILLING_COST_NOT_COVERED = YES` schaltet 3 Actions gleichzeitig frei (NOT_COVERED, GOÄ, Barzahlung)
- `BILLING_INVOICE_TIMING` ist config-abhängig (`billingCycleLabel`)
- `BILLING_COST_NOT_COVERED` wird auch im LAB-Profil als Specific Checkpoint verwendet

---

## TECH_SUPPORT

**Label:** Technische Probleme / Digitale Infrastruktur  
**displayOrder:** 120  
**Decision-Checkpoint:** _(keiner)_

### Specific Checkpoints
| ID | Rolle |
|---|---|
| `TECH_VIDEO_NOT_WORKING` | CHANNEL_NOT_SUITABLE – config-abhängig (`videoSupportContact`) |

### Globale Checkpoints (boundGlobalCheckpointIds)
_(keine)_

### Verfügbare Actions (availableActionIds)
- `DIGITAL_REQUEST`
- `BOOK_APPOINTMENT`

### Gebundene Action-Checkpoints (boundActionCheckpointIds)
_(keine — leeres Objekt)_

### Besonderheiten
- Kleinstes Profil ohne gebundene Action-Checkpoints
- `TECH_VIDEO_NOT_WORKING` verwendet `_cfg.videoSupportContact` (Verweis auf externen Support)
- Keine Aktion wird konditional freigeschaltet; `DIGITAL_REQUEST` und `BOOK_APPOINTMENT` stehen nur über `availableActionIds` zur Verfügung

---

## Querverweise: Shared Checkpoints

Checkpoints, die in **mehreren Profilen** als Specific oder Action gebunden sind:

| Checkpoint-ID | Verwendet in Profilen |
|---|---|
| `BILLING_COST_NOT_COVERED` | LAB (specific), BILLING (specific) |
| `APPOINTMENT_DATA_INCOMPLETE` | LAB (specific), APPOINTMENT (specific) |
| `DOCUMENT_UPLOAD` | PRESCRIPTION, HEILMITTELVERORDNUNG, HOSPITAL_ADMISSION, APPOINTMENT, MEDICAL_DOCUMENTS, ONBOARDING |
| `INSURANCE_DATA_APP_TRANSFER` | AU, PRESCRIPTION, REFERRAL, APPOINTMENT, ONBOARDING, BILLING |
| `BOOK_APPOINTMENT` | AU, PRESCRIPTION, REFERRAL, HOSPITAL_ADMISSION, IMMUNIZATION, LAB, SAMPLE_COLLECTION, APPOINTMENT, MEDICAL_DOCUMENTS, HEILMITTELVERORDNUNG, BILLING, TECH_SUPPORT |
| `DIGITAL_REQUEST` | AU, PRESCRIPTION, REFERRAL, HOSPITAL_ADMISSION, IMMUNIZATION, LAB, SAMPLE_COLLECTION, APPOINTMENT, MEDICAL_DOCUMENTS, HEILMITTELVERORDNUNG, BILLING, TECH_SUPPORT, ONBOARDING |
| `CONTROL_APPOINTMENT_RECOMMENDED` | AU, PRESCRIPTION (guidanceRule), HOSPITAL_ADMISSION |
| `ACUTE_OPEN_CONSULTATION_ACTION` | AU, APPOINTMENT, ACUTE_CARE |
| `CARE_CHANNEL_CHOICE` | AU, ACUTE_CARE |
| `CONTACT_PERSON_INFO` | AU, REFERRAL, ONBOARDING |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | LAB, SAMPLE_COLLECTION |
| `PAYMENT_ONSITE_INFO` | MEDICAL_DOCUMENTS |

---

## Config-abhängige Checkpoints

Checkpoints, deren Texte Werte aus `PracticeInquiryConfig` (`_cfg`) einbetten:

| Checkpoint-ID | Config-Felder |
|---|---|
| `DIGITAL_REQUEST_PROCESSING_TIME` | `digitalRequestProcessingTimeMin`, `digitalRequestProcessingTimeMax`, `digitalRequestProcessingTimeUnit` |
| `ACUTE_OPEN_CONSULTATION_ACTION` | `openConsultationDays`, `openConsultationHours`, `openConsultationCapacityLimited` |
| `LAB_APPOINTMENT_INTERNAL` | `doctorOrderBookingCode` |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | `bookingCalendarName`, `findingsReviewBookingCode` |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | `bookingCalendarName`, `checkupSecondBookingCode` |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | `bookingCalendarName`, `chronicControlBookingCode` |
| `APPOINTMENT_BOOK_EKG_ORDER` | `bookingCalendarName`, `doctorOrderBookingCode` |
| `DOCUMENT_UPLOAD` | `uploadPlatformName`, `uploadPlatformAccountLabel` |
| `ONBOARDING_DOCTOLIB_INFO` | `uploadPlatformName`, `uploadPlatformAccountLabel` |
| `TECH_VIDEO_NOT_WORKING` | `videoSupportContact` |
| `BILLING_INVOICE_TIMING` | `billingCycleLabel` |
