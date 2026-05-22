# Inquiry Checkpoint Inventar

> **Ist-Stand-Dokumentation** – rein deskriptiv, direkt aus dem Quellcode
> abgeleitet (`lib/inquiries/inquiryCheckpointCatalog.ts` +
> `lib/inquiries/inquiryProfileCatalog.ts`).
> Keine Bewertung, keine Planung, kein Code wurde geändert.
> Stand: Mai 2026.

---

## Legende

| Abkürzung | Bedeutung |
|---|---|
| `DECISION` | Entscheidungs-Checkpoint (`InquiryCheckpointKind.DECISION`) – ärztliches Ja/Nein |
| `EXP` | Explanation-Checkpoint (`EXPLANATION`) – kontextuelle Erklärung, Schalter in M2 |
| `ACT` | Action-Checkpoint (`ACTION`) – Handlungsaufforderung oder Info in M3 |
| `INTRO` | Action mit `actionCategory: "INTRO"` – Nachrichteneinstieg |
| `SEC_INTRO` | Action mit `actionCategory: "SECTION_INTRO"` – M2-Schublade |
| `ATTACHED` | Placement: im Profilabschnitt direkt angehängt |
| `SHARED_BOTTOM` | Placement: am Ende der Antwort, profilübergreifend dedupliziert |
| `SPEC` | Scope `SPECIFIC` – nur in einem Profil nutzbar |
| `GLOB` | Scope `GLOBAL` – profilübergreifend wiederverwendbar |
| `@dep` | Mit `@deprecated` markiert – noch im Katalog, nicht mehr aktiv gebunden |

---

## Teil 1 – Übersicht nach Profil

Profile sind nach `displayOrder` sortiert.

### Profil-Kurzübersicht

| Profil-ID | Label | `displayOrder` | Decision-Checkpoint | Anzahl specificCheckpoints | Anzahl boundActionCheckpoints |
|---|---|---|---|---|---|
| `ACUTE_CARE` | Akuttermin / offene Sprechstunde | 10 | `ACUTE_CARE_DECISION` | 5 | 6 |
| `APPOINTMENT` | Termin | 20 | – | 11 | 21 |
| `AU` | AU / Arbeitsunfähigkeitsbescheinigung | 30 | `AU_DECISION` | 12 | 7 |
| `PRESCRIPTION` | Rezept | 40 | `PRESCRIPTION_DECISION` | 13 | 3 |
| `MEDICAL_DOCUMENTS` | Atteste / Bescheinigungen | 50 | `MEDICAL_DOCUMENTS_DECISION` | 6 | 4 |
| `HEILMITTELVERORDNUNG` | Heilmittelverordnung | 55 | – | 6 | 3 |
| `REFERRAL` | Überweisung | 60 | `REFERRAL_DECISION` | 6 | 3 |
| `HOSPITAL_ADMISSION` | Krankenhauseinweisung | 65 | `HOSPITAL_ADMISSION_DECISION` | 4 | 2 |
| `IMMUNIZATION` | Impfung | 70 | `IMMUNIZATION_DECISION` | 5 | 3 |
| `LAB` | Labor | 80 | `LAB_DECISION` | 13 | 10 |
| `SAMPLE_COLLECTION` | Urin- und Stuhlprobe | 90 | `SAMPLE_COLLECTION_DECISION` | 1 | 5 |
| `ONBOARDING` | Patientenaufnahme / Registrierung | 100 | – | 10 | 6 |
| `BILLING` | Abrechnung | 110 | – | 6 | 6 |
| `TECH_SUPPORT` | Technische Probleme / Digitale Infrastruktur | 120 | – | 1 | 0 |

---

### ACUTE_CARE

**Decision:** `ACUTE_CARE_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt (Patienten-Text YES/ACTIVE) |
|---|---|---|---|---|---|
| `ACUTE_CARE_DECISION` | DECISION | SPEC / ATTACHED | – | ✓ contact_person | „Sie können sich … im Rahmen eines Akuttermins oder der offenen Sprechstunde vorstellen." |
| `ACUTE_EXCLUSION` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE | – | „Für planbare oder organisatorische Anliegen ist eine reguläre Sprechstunde erforderlich." |
| `CHRONIC_EXCLUSION` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE | – | „Auch bei chronischen Erkrankungen gehören planbare Anliegen in die reguläre Sprechstunde…" |
| `ACUTE_PURPOSE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Dieser Weg ist für Beschwerden gedacht, die kurzfristig auftreten…" |
| `ACUTE_APPOINTMENT_INFO` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | Reiner M2-Schalter; Text kommt über `ACUTE_BOOKING_INFO` (ACT) |
| `NO_HOME_VISITS` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE | – | „Hausbesuche sind kein Bestandteil des angebotenen Leistungsspektrums." |
| `INFECTIOUS_PROTOCOL` | EXP | GLOB / ATTACHED | Bound global; specificRole: – | – | „Es besteht der Verdacht auf eine ansteckende Erkrankung." |
| `ACUTE_OPEN_CONSULTATION_ACTION` | ACT | GLOB / SHARED_BOTTOM | `boundActionConditions`: immer | – | „Die offene Sprechstunde findet {days} von {hours} statt. …" *(praxisspezifisch)* |
| `ACUTE_BOOKING_INFO` | ACT | SPEC / ATTACHED | `showWhenAny`: ACUTE_APPOINTMENT_INFO=YES | – | „Akuttermine können … 24 Stunden im Voraus online gebucht werden…" |
| `CARE_CHANNEL_CHOICE` | ACT | GLOB / SHARED_BOTTOM | `boundActionConditions`: immer | – | „Für eine persönliche Vorstellung können Sie einen Akuttermin buchen oder die offene Sprechstunde nutzen." |
| `INFECTIOUS_CONTACT_DIGITALLY` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: INFECTIOUS_PROTOCOL=YES | – | „Bitte melden Sie sich vorab digital bei uns." |
| `INFECTIOUS_VIDEO_CONSULTATION` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: INFECTIOUS_PROTOCOL=YES | – | „Alternativ können Sie eine Videosprechstunde wählen." |
| `INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED` | ACT | GLOB / ATTACHED | `showWhenAny`: INFECTIOUS_PROTOCOL=YES | – | „Bitte kommen Sie … nicht unangemeldet in die Praxis." |

---

### APPOINTMENT

**Decision:** – (kein globaler Decision-Checkpoint)

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `APPOINTMENT_IN_PERSON_REQUIRED_FOR_REQUEST` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED | – | „Für dieses Anliegen ist ein persönlicher Termin in der Praxis erforderlich." |
| `APPOINTMENT_WRONG_TYPE` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE | – | „Der gebuchte Termintyp passt nicht zum Anliegen." |
| `APPOINTMENT_BOOKING_CODE_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Für diesen Termin ist ein Buchungscode nötig." |
| `APPOINTMENT_EXTERNAL_FINDING_PRESENT` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | – | „Die Befundbesprechung soll zu einem externen Befund … erfolgen." |
| `APPOINTMENT_EXTERNAL_FINDING_LONG_ABSENCE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Da Sie längere Zeit nicht in unserer Praxis waren, ist eine Besprechung … sinnvoll." |
| `APPOINTMENT_DATA_INCOMPLETE` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Ihr Anliegen ist aktuell noch zu ungenau, um einen passenden Termin auswählen zu können." |
| `APPOINTMENT_REASON_UNCLEAR` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Der Anlass für Ihren Termin ist für uns noch nicht ganz klar." |
| `VIDEO_CONSULTATION_REGION_LIMITATION` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE | – | „Die Durchführung einer Videosprechstunde ist an einen Wohnsitz im näheren Einzugsgebiet gebunden." |
| `APPOINTMENT_TYPE_QUESTION` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | Schalter; bei YES werden APPOINTMENT_INFO_*-ACTs sichtbar |
| `APPOINTMENT_INSURANCE_PROOF_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | – | „Für den Termin liegt aktuell kein gültiger Versicherungsnachweis vor." |
| `APPOINTMENT_INTERNAL_ORDER_EKG` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Für die EKG-Untersuchung liegt eine ärztliche Anordnung vor." |
| `ACUTE_OPEN_CONSULTATION_ACTION` | ACT | GLOB / SHARED_BOTTOM | immer | – | s. ACUTE_CARE |
| `BOOK_APPOINTMENT` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: APPOINTMENT_WRONG_TYPE=YES | – | „Termine können über den Online-Kalender vereinbart werden." |
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | ACT | SPEC / ATTACHED | `showWhenAny`: BOOKING_CODE_REQUIRED=YES oder TYPE_QUESTION=YES | ✓ | „Befundbesprechung buchen … Buchungscode {code}." *(praxisspezifisch)* |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | ACT | SPEC / ATTACHED | `showWhenAny`: BOOKING_CODE_REQUIRED=YES oder TYPE_QUESTION=YES | ✓ | „Check-Up 2. Termin … Buchungscode {code}." *(praxisspezifisch)* |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | ACT | SPEC / ATTACHED | `showWhenAny`: BOOKING_CODE_REQUIRED=YES oder TYPE_QUESTION=YES | ✓ | „Chroniker-Kontrolltermin … Buchungscode {code}." *(praxisspezifisch)* |
| `DOCUMENT_UPLOAD` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: EXTERNAL_FINDING_PRESENT=YES | ✓ | „Bitte laden Sie relevante Unterlagen … hoch." *(praxisspezifisch)* |
| `APPOINTMENT_INFO_TYPE_PURPOSE` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Wir nutzen unterschiedliche Terminarten…" |
| `APPOINTMENT_INFO_BLOOD_DRAW_NOT_DOCTOR_VISIT` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Eine Blutentnahme findet nicht im Arzttermin statt…" |
| `APPOINTMENT_INFO_VIDEO_SCOPE` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Die Videosprechstunde ist für kurze medizinische Anliegen…" |
| `APPOINTMENT_INFO_IN_PERSON_REQUIRED` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Für eine vollständige ärztliche Beurteilung ist ein persönlicher Termin erforderlich." |
| `APPOINTMENT_INFO_CHECKUP_PURPOSE` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Der Gesundheits-Check-up ist eine strukturierte Vorsorgeuntersuchung…" |
| `APPOINTMENT_INFO_CHRONIC_CONTROL_PURPOSE` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Bei chronischen Erkrankungen sind regelmäßige Kontrolltermine vorgesehen." |
| `APPOINTMENT_INFO_SHORT_NOTICE_CANCELLATION_IMPACT` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Kurzfristig abgesagte Termine können … nicht mehr rechtzeitig vergeben werden." |
| `APPOINTMENT_INFO_BOOKING_RESTRICTED_AFTER_NO_SHOW` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Nach einem unentschuldigten Nichterscheinen kann … die Online-Terminbuchung eingeschränkt werden." |
| `APPOINTMENT_INFO_BOOKING_REENABLED_AFTER_CLARIFICATION` | ACT | SPEC / ATTACHED | `showWhenAny`: TYPE_QUESTION=YES | – | „Die Online-Terminbuchung kann nach Klärung wieder freigeschaltet werden." |
| `INSURANCE_DATA_APP_TRANSFER` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: INSURANCE_PROOF_MISSING=YES | ✓ | Anleitung eGK-Übermittlung per Krankenkassen-App |
| `APPOINTMENT_BOOK_EKG_ORDER` | ACT | SPEC / ATTACHED | `showWhenAny`: INTERNAL_ORDER_EKG=YES | ✓ | „EKG-Untersuchung … Buchungscode {code}." *(praxisspezifisch)* |

---

### AU

**Decision:** `AU_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `AU_DECISION` | DECISION | SPEC / ATTACHED | – | ✓ contact_person | „Ihre Arbeitsunfähigkeitsbescheinigung wurde ausgestellt." / „…wurde nicht ausgestellt." |
| `AU_BACKDATE_LIMIT` | EXP | SPEC / ATTACHED | specificRole: RULE_TIME_LIMIT | – | „AU kann nur bis zu zwei Tage rückwirkend ausgestellt werden." |
| `AU_NEW_PATIENT_LIMIT` | EXP | SPEC / ATTACHED | specificRole: RULE_TIME_LIMIT | – | Reiner Schalter; Text kommt über `AU_NEW_PATIENT_3DAY_LIMIT` (ACT) |
| `AU_MISSING_EGK` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Für die Ausstellung der AU benötigen wir noch einen aktuellen Versicherungsnachweis." |
| `AU_WORK_ACCIDENT` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „…Behandlung … nach einem Arbeits- oder Wegeunfall erfolgt über einen Durchgangsarzt." |
| `AU_CHILD_SICK` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Bescheinigungen zur Betreuung eines erkrankten Kindes … ausschließlich durch … Kinderarztpraxis." |
| `AU_DIGITAL_AU_PROCESS` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | Reiner Schalter; Inhalte via `DIGITAL_REQUEST` und `DIGITAL_REQUEST_PROCESSING_TIME` |
| `AU_NO_APPOINTMENT_ACUTE` | EXP | SPEC / ATTACHED | – | – | Reiner Schalter; Inhalte via `ACUTE_OPEN_CONSULTATION_ACTION`, `DIGITAL_REQUEST` |
| `EAU_VALID_WITHOUT_SIGNATURE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Die elektronische AU ist digital übermittelt und auch ohne Unterschrift … gültig." |
| `RETURN_TO_WORK_ALLOWED_DURING_AU` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Eine Rückkehr … ist bei Genesung auch vor Ablauf der Arbeitsunfähigkeit möglich." |
| `AU_FOLLOWUP_REQUIRES_VISIT` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Für eine Folgebescheinigung ist eine persönliche Vorstellung … erforderlich." |
| `AU_MEDICAL_CONSULTATION_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Für dieses Anliegen ist ein persönlicher Termin in der Praxis nötig." |
| `AU_EXTENSION_REQUIRES_EXAMINATION` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED | – | „Nach dem bisherigen Verlauf ist … eine persönliche körperliche Untersuchung erforderlich." |
| `AU_NEW_PATIENT_3DAY_LIMIT` | ACT | SPEC / ATTACHED | `showWhenAny`: AU_NEW_PATIENT_LIMIT=YES | – | „Bei Neupatienten kann eine AU zunächst für maximal 3 Tage ausgestellt werden." |
| `DIGITAL_REQUEST` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: AU_DIGITAL_AU_PROCESS=YES oder AU_NO_APPOINTMENT_ACUTE=YES | ✓ | „Bitte stellen Sie eine digitale Anfrage…" |
| `DIGITAL_REQUEST_PROCESSING_TIME` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: AU_DIGITAL_AU_PROCESS=YES oder AU_NO_APPOINTMENT_ACUTE=YES | – | „Die Bearbeitung dauert je nach Auslastung {min}–{max} {unit}." *(praxisspezifisch)* |
| `ACUTE_OPEN_CONSULTATION_ACTION` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: AU_NO_APPOINTMENT_ACUTE=YES | – | s. ACUTE_CARE |
| `CARE_CHANNEL_CHOICE` | ACT | GLOB / SHARED_BOTTOM | immer | – | s. ACUTE_CARE |
| `CONTROL_APPOINTMENT_RECOMMENDED` | ACT | GLOB / SHARED_BOTTOM | immer | – | „Bitte buchen Sie demnächst einen Termin zur Kontrolle …" |
| `INSURANCE_DATA_APP_TRANSFER` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: AU_MISSING_EGK=YES | ✓ | s. APPOINTMENT |

---

### PRESCRIPTION

**Decision:** `PRESCRIPTION_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `PRESCRIPTION_DECISION` | DECISION | SPEC / ATTACHED | – | ✓ contact_person | „Ihr Rezept wurde ausgestellt." / „… nicht ausgestellt." |
| `PRESCRIPTION_INDICATION_NOT_DOCUMENTED` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Eine medizinische Begründung … ist nicht hinterlegt." |
| `PRESCRIPTION_DOCTOR_REVIEW_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED | – | „…ist zunächst eine ärztliche Einschätzung notwendig." |
| `PRESCRIPTION_FOLLOWUP_REQUIRED_IN_PERSON` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED | – | „Ohne vorherigen persönlichen Arzttermin kann die Dauermedikation nicht weiter verordnet werden." |
| `PRESCRIPTION_BTM_ADHS_RULES` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Einstellung … von ADHS-Medikamenten erfolgen durch Fachärzte…" |
| `PRESCRIPTION_GYN_EXCLUSIVITY` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Verordnungen für die Pille erfolgen über die gynäkologische Fachpraxis." |
| `PRESCRIPTION_STATUTORY_POSSIBLE` | EXP | SPEC / ATTACHED | specificRole: OUTCOME_INFO | – | YES: bewusst leer; NO: „Das Rezept wurde nicht als Kassenrezept ausgestellt." |
| `PRESCRIPTION_PRIVATE_ONLY` | EXP | SPEC / ATTACHED | specificRole: RULE_COST_COVERAGE | – | „Dieses Präparat … wird als Privatrezept verordnet." |
| `PRESCRIPTION_SPECIALIST_RESPONSIBLE` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Die Verordnung erfolgt über die zuständige Facharztpraxis." |
| `PRESCRIPTION_PATIENT_NOT_IN_GERMANY` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Rezepte können in deutschen Apotheken eingelöst werden. Im Ausland eingeschränkt." |
| `PRESCRIPTION_CHRONIC_PATIENT` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Bei Dauermedikation sind regelmäßige Kontrolltermine vorgesehen." |
| `PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Das Rezept wurde entsprechend angepasst." |
| `CONTRACEPTION_SPECIALIST_ONLY` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Die Verordnung kontrazeptiver Mittel ist an fachspezifische Untersuchungen gebunden." |
| `PRESCRIPTION_INSURANCE_PROOF_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | – | „Für die Ausstellung des Rezepts liegt kein gültiger Versicherungsnachweis vor." |
| `E_RECIPE_USE` | ACT | GLOB / ATTACHED | `showWhenAny`: STATUTORY_POSSIBLE=YES | – | „Sie können das eRezept mit Ihrer eGK in der Apotheke einlösen…" |
| `PHARMACY_INFORMATION` | ACT | GLOB / ATTACHED | immer (außer NO_PRESCRIPTION=YES) | – | „Bitte geben Sie Ihre bevorzugte Apotheke an…" |
| `INSURANCE_DATA_APP_TRANSFER` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: INSURANCE_PROOF_MISSING=YES | ✓ | s. APPOINTMENT |

---

### MEDICAL_DOCUMENTS

**Decision:** `MEDICAL_DOCUMENTS_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `MEDICAL_DOCUMENTS_DECISION` | DECISION | SPEC / ATTACHED | – | – | „Das angefragte Attest / die Bescheinigung kann erstellt werden." |
| `MEDICAL_DOCUMENT_POSSIBLE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | ✓ contact_person | „Atteste … können nur nach ärztlicher Beurteilung ausgestellt werden." |
| `MEDICAL_DOCUMENT_PRIVATE_SERVICE` | EXP | SPEC / ATTACHED | specificRole: RULE_COST_COVERAGE | – | „Bestimmte Atteste … sind Selbstzahlerleistungen. … Pauschale von 10 Euro." |
| `MEDICAL_DOCUMENT_INFO_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Bitte geben Sie an, wofür das Attest … benötigt wird." |
| `MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Für eine sichere Behandlung benötigen wir … Unterlagen auf Deutsch oder Englisch." |
| `MEDICAL_DOCUMENT_CONSULTATION_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Für dieses Anliegen ist ein persönlicher Termin in der Praxis nötig." |
| `SUSPECTED_DIAGNOSIS_EXPLANATION` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Dokumentierte Verdachtsdiagnosen … stellen keine gesicherte Dauerdiagnose dar." |
| `DIGITAL_REQUEST` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: INFO_MISSING=YES | ✓ | s. AU |
| `BOOK_APPOINTMENT` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: CONSULTATION_REQUIRED=YES | – | „Termine können über den Online-Kalender vereinbart werden." |
| `DOCUMENT_UPLOAD` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: INFO_MISSING=YES | ✓ | s. APPOINTMENT |
| `PAYMENT_ONSITE_INFO` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: PRIVATE_SERVICE=YES | – | „Die Zahlung erfolgt vor Ort per EC- oder Kreditkarte." |

---

### HEILMITTELVERORDNUNG

**Decision:** – (kein Decision-Checkpoint konfiguriert)

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `HMV_REQUEST_COMPLETE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Ihre Angaben zur Heilmittelverordnung sind eingegangen." |
| `HMV_INFO_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION; m5Code: NO_DATA | – | „Wir benötigen noch weitere Angaben." |
| `HMV_PREVIOUS_ORDER_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT; m5Code: NO_DOC | – | „…Angaben zur bisherigen Verordnung oder relevante Unterlagen fehlen." |
| `HMV_DOCTOR_REVIEW_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Vor einer Entscheidung ist eine ärztliche Prüfung erforderlich." |
| `HMV_IN_PERSON_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Für die Heilmittelverordnung ist ein persönlicher Termin … notwendig." |
| `HMV_NOT_DIGITAL_POSSIBLE` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE; m5Code: WRONG_CHANNEL | – | „Dieses Anliegen kann nicht vollständig digital abgeschlossen werden." |
| `DIGITAL_REQUEST` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: HMV_INFO_MISSING=YES | ✓ | s. AU |
| `DOCUMENT_UPLOAD` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: HMV_PREVIOUS_ORDER_MISSING=YES | ✓ | s. APPOINTMENT |
| `BOOK_APPOINTMENT` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: HMV_IN_PERSON_REQUIRED=YES | – | s. MEDICAL_DOCUMENTS |

---

### REFERRAL

**Decision:** `REFERRAL_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `REFERRAL_DECISION` | DECISION | SPEC / ATTACHED | – | ✓ contact_person | „Ihre Überweisung wurde ausgestellt…" / „…wurde nicht ausgestellt." |
| `REFERRAL_CAN_BE_ISSUED` | EXP | SPEC / ATTACHED | specificRole: OUTCOME_INFO | – | „Die Überweisung kann ausgestellt werden." |
| `REF_SPECIALTY_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION; m5Code: NO_SPECIALTY | – | „Die Fachrichtung für die Überweisung ist noch nicht angegeben." |
| `REF_PSYCHOTHERAPY_FIRST_STEP` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Die Überweisung ist der erste Schritt zur psychotherapeutischen Sprechstunde…" |
| `REF_HAV_CASE` | EXP | SPEC / ATTACHED | m5Code: HAV | – | Reiner Schalter (kein Ausgabetext); schaltet `REF_BOOKING_CODE_PROCESS` frei |
| `REF_MEDICAL_CONSULTATION_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Für dieses Anliegen ist ein persönlicher Termin in der Praxis nötig." |
| `REFERRAL_INSURANCE_PROOF_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | – | „Für die Ausstellung der Überweisung liegt kein gültiger Versicherungsnachweis vor." |
| `REF_BOOKING_CODE_PROCESS` | ACT | SPEC / ATTACHED | `showWhenAny`: REF_HAV_CASE=YES | – | „Mit dem Vermittlungs-/Buchungscode kann ein Termin über 116117 vereinbart werden." |
| `REF_ORIGINAL_VS_PDF` | ACT | SPEC / ATTACHED | immer | – | „Die Überweisung kann digital genutzt werden; für die Facharztpraxis häufig Original nötig." |
| `INSURANCE_DATA_APP_TRANSFER` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: REFERRAL_INSURANCE_PROOF_MISSING=YES | ✓ | s. APPOINTMENT |

---

### HOSPITAL_ADMISSION

**Decision:** `HOSPITAL_ADMISSION_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `HOSPITAL_ADMISSION_DECISION` | DECISION | SPEC / ATTACHED | – | – | „Die Krankenhauseinweisung wurde ausgestellt." |
| `HOSPITAL_ADMISSION_CAN_BE_ISSUED` | EXP | SPEC / ATTACHED | specificRole: OUTCOME_INFO | – | „Die Krankenhauseinweisung kann ausgestellt werden." |
| `HOSPITAL_ADMISSION_MISSING_INFO` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Fehlen: Aufnahmedatum, Fachabteilung und Einweisungsgrund." |
| `HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED | – | „Für die Einweisung ist vorab ein persönlicher Termin nötig." |
| `HOSPITAL_TRANSPORT_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Für die stationäre Aufnahme wird ein Krankentransport benötigt." |
| `CONTROL_APPOINTMENT_RECOMMENDED` | ACT | GLOB / SHARED_BOTTOM | immer | – | s. AU |
| `TRANSPORT_QUESTIONNAIRE_REQUEST` | ACT | GLOB / ATTACHED | immer | – | „Bitte beantworten Sie die Fragen zum Krankentransport…" |

---

### IMMUNIZATION

**Decision:** `IMMUNIZATION_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `IMMUNIZATION_DECISION` | DECISION | SPEC / ATTACHED | – | – | „Die angefragte Impfung kann durchgeführt werden." |
| `IMMUNIZATION_STANDARD_AVAILABLE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Grippeimpfung und COVID-Booster können direkt gebucht werden." |
| `IMMUNIZATION_RISK_REVIEW_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED | – | „Vor der Impfung ist eine ärztliche Einschätzung sinnvoll…" |
| `IMMUNIZATION_STATUS_UNCLEAR` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Zu den bisherigen Impfungen liegen uns keine ausreichenden Angaben vor." |
| `IMMUNIZATION_VACCINATION_RECORD_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | ✓ contact_person | „Für die Beurteilung des Impfstatus fehlt ein Impfpass…" |
| `IMMUNIZATION_TRAVEL_MEDICINE` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Reiseimpfungen liegen im Zuständigkeitsbereich reisemedizinisch spezialisierter Stellen." |
| `IMMUNIZATION_BOOK_VACCINATION` | ACT | SPEC / ATTACHED | `showWhenAny`: STANDARD_AVAILABLE=YES | ✓ | „Bitte buchen Sie den Impftermin … Labor → Impfung → gewünschte Impfung." |
| `IMMUNIZATION_BOOK_COUNSELING` | ACT | SPEC / ATTACHED | `showWhenAny`: RISK_REVIEW_REQUIRED=YES | ✓ | „Bitte buchen Sie für eine Impfberatung einen Termin…" |
| `IMMUNIZATION_BRING_VACCINATION_RECORD` | ACT | SPEC / ATTACHED | immer (außer TRAVEL_MEDICINE=YES) | ✓ | „Bitte bringen Sie Ihren Impfpass … zum Termin mit." |

---

### LAB

**Decision:** `LAB_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `LAB_DECISION` | DECISION | SPEC / ATTACHED | – | – | „Ein Termin für die Blutentnahme kann direkt vereinbart werden." |
| `LAB_MPU_EXCLUSION` | EXP | SPEC / ATTACHED | – | – | „Untersuchungen für eine MPU werden hier nicht durchgeführt." |
| `LAB_EXTERNAL_REFERRAL` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | Reiner Schalter; schaltet `LAB_BRING_REFERRAL`, `LAB_COST_COVERED_BY_REFERRAL` frei |
| `LAB_INTERNAL_ORDER` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | Reiner Schalter; schaltet `LAB_APPOINTMENT_INTERNAL` frei |
| `LAB_MEDICAL_CONSULTATION_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: MEDICAL_REVIEW_REQUIRED; m5Code: NEED_VISIT | – | „Für dieses Anliegen ist ein persönlicher Termin in der Praxis nötig." |
| `LAB_CHECKUP_RULES` | EXP | SPEC / ATTACHED | – | – | „Der gesetzliche Gesundheits-Check-up ist ab 35 Jahren alle drei Jahre … möglich." |
| `BILLING_COST_NOT_COVERED` | EXP | SPEC / ATTACHED | specificRole: RULE_COST_COVERAGE | – | „…keine Kassenleistung. Die Durchführung ist als Selbstzahlerleistung möglich." |
| `APPOINTMENT_DATA_INCOMPLETE` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | s. APPOINTMENT |
| `LAB_INTERNAL_ORDER_AVAILABLE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Für die Kontrolle Ihrer Blutwerte liegt bereits eine ärztliche Anordnung vor." |
| `LAB_CHECKUP_BASIC_LAB_INCLUDED` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Die angefragten Laborwerte gehören zum vorgesehenen Basislabor im Rahmen des Check-ups." |
| `LAB_SELF_PAYER_POSSIBLE` | EXP | SPEC / ATTACHED | specificRole: RULE_COST_COVERAGE | – | „Die angefragte Laborleistung kann als Selbstzahlerleistung durchgeführt werden." |
| `LAB_CONTROL_TIMING_NOT_DUE` | EXP | SPEC / ATTACHED | specificRole: RULE_TIME_LIMIT | – | „Die geplante Kontrolle … ist erst zu einem späteren Zeitpunkt vorgesehen." |
| `LAB_RESULTS_PENDING` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Ihre Laborergebnisse sind … noch nicht eingegangen. … werden automatisch zugesandt." |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | ACT | SPEC / ATTACHED | – | – | „Bitte vereinbaren Sie zeitnah einen Termin zur Besprechung…" |
| `LAB_APPOINTMENT_INTERNAL` | ACT | SPEC / ATTACHED | `showWhenAny`: INTERNAL_ORDER=YES; `hideWhenAny`: CHECKUP_RULES=YES | ✓ | „Labor → Ärztliche Anordnung → Blutwerte … Buchungscode {code}." *(praxisspezifisch)* |
| `LAB_APPOINTMENT_CHECKUP` | ACT | SPEC / ATTACHED | `showWhenAny`: CHECKUP_RULES=YES | ✓ | „Check-Up - 1. Termin (Basiswerte Labor) … kein Code erforderlich." |
| `LAB_APPOINTMENT_INDIVIDUAL` | ACT | SPEC / ATTACHED | `hideWhenAny`: INTERNAL_ORDER=YES | ✓ | „Bitte vereinbaren Sie einen Termin für individuelle Laborwerte." |
| `LAB_APPOINTMENT_DOCTOR` | ACT | SPEC / ATTACHED | `hideWhenAny`: INTERNAL_ORDER=YES oder EXTERNAL_REFERRAL=YES | – | „Für die Laboruntersuchung ist zunächst eine ärztliche Abklärung erforderlich." |
| `LAB_BRING_REFERRAL` | ACT | SPEC / ATTACHED | `showWhenAny`: EXTERNAL_REFERRAL=YES | ✓ | „Bitte bringen Sie die Überweisung … im Original zum Termin mit." |
| `LAB_COST_COVERED_BY_REFERRAL` | ACT | SPEC / ATTACHED | `showWhenAny`: EXTERNAL_REFERRAL=YES | – | „Mit einer gültigen Originalüberweisung … keine Selbstzahlerleistung." |
| `LAB_SELF_PAYER_NOTE` | ACT | SPEC / ATTACHED | `hideWhenAny`: INTERNAL_ORDER=YES oder EXTERNAL_REFERRAL=YES | – | „Laborwerte ohne ärztliche Anordnung … sind als Selbstzahlerleistung möglich." |
| `LAB_FASTING_REQUIRED` | ACT | SPEC / ATTACHED | immer (außer MPU_EXCLUSION=YES) | ✓ | „Bitte kommen Sie nüchtern … mindestens acht Stunden vorher nichts essen." |
| `LAB_RESULT_TIME` | ACT | SPEC / ATTACHED | immer (außer MPU_EXCLUSION=YES) | – | „Die Auswertung kann mehrere Tage dauern. Befunde werden übermittelt…" |

---

### SAMPLE_COLLECTION

**Decision:** `SAMPLE_COLLECTION_DECISION`

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `SAMPLE_COLLECTION_DECISION` | DECISION | SPEC / ATTACHED | – | – | „Die Probenabgabe kann wie besprochen durchgeführt werden." |
| `SAMPLE_COLLECTION_ORDER_AVAILABLE` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Für die gewünschte Probenabgabe liegt bereits eine ärztliche Anordnung vor." |
| `URINE_SAMPLE_INSTRUCTIONS` | ACT | SPEC / ATTACHED | immer | – | „Die Urinprobe sollte als Mittelstrahl in ein steriles Gefäß abgegeben werden." |
| `STOOL_SAMPLE_INSTRUCTIONS` | ACT | SPEC / ATTACHED | immer | – | „Stuhlprobe … mit dem Probenröhrchen entnehmen; kleine Menge ausreichend." |
| `SAMPLE_HANDOVER` | ACT | SPEC / ATTACHED | immer | – | „Die Probe … mit Name und Datum beschriften und zeitnah in der Praxis abgeben." |
| `URINE_SAMPLE_ONSITE` | ACT | GLOB / ATTACHED | `showWhenAny`: ORDER_AVAILABLE=YES | – | „Eine Urinprobe kann vor Ort in der Praxis abgegeben werden." |
| `LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED` | ACT | SPEC / ATTACHED | immer | – | s. LAB |

---

### ONBOARDING

**Decision:** – (kein Decision-Checkpoint)

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `ONBOARDING_WRONG_PRACTICE` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | Reiner Schalter; Text via `ONBOARDING_WRONG_PRACTICE_NOTICE` |
| `ONBOARDING_IDENTITY_MISMATCH` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | Reiner Schalter; Texte via `ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED` / `ONBOARDING_PROVIDE_IDENTITY_DATA` |
| `ONBOARDING_DATA_INCOMPLETE` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | Reiner Schalter; Text via `ONBOARDING_DATA_MISSING_CONTEXT` |
| `ONBOARDING_DATA_UPDATE_REQUIRED` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Ihre Patientendaten sind unvollständig oder nicht mehr aktuell." |
| `ONBOARDING_GKV_DOCUMENT_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | ✓ contact_person | „Für dieses Quartal haben wir noch keinen gültigen Versicherungsnachweis … erhalten." |
| `ONBOARDING_PKV_PAS_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | – | „Fehlen einmalig ein Identitätsnachweis … sowie das ausgefüllte PAS-Formular." |
| `ONBOARDING_DOCTOLIB_INFO` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | ✓ contact_person | „Für die Kommunikation mit unserer Praxis nutzen wir {Plattform}." *(praxisspezifisch)* |
| `INSURANCE_NUMBER_INVALID_FORMAT` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Die vorliegende Versichertennummer entspricht nicht dem erforderlichen Format." |
| `ONBOARDING_PRIMARY_CARE_CONFIRMATION` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „…Rückmeldung, ob wir weiterhin Ihre hausärztliche Praxis sind." |
| `ADULTS_ONLY_PRACTICE` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Die Praxis ist ausschließlich auf die Behandlung von erwachsenen … ausgerichtet." |
| `ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED` | ACT | SPEC / ATTACHED | `showWhenAny`: IDENTITY_MISMATCH=YES | ✓ | „Leider konnten wir Ihre Anfrage nicht eindeutig zuordnen." |
| `ONBOARDING_PROVIDE_IDENTITY_DATA` | ACT | SPEC / SHARED_BOTTOM | `showWhenAny`: IDENTITY_MISMATCH=YES | ✓ | „Bitte teilen Sie uns Ihren vollständigen Namen und Ihr Geburtsdatum mit…" |
| `ONBOARDING_DATA_MISSING_CONTEXT` | ACT | SPEC / ATTACHED | `showWhenAny`: DATA_INCOMPLETE=YES | ✓ | „Leider fehlen uns noch aktuelle Angaben…" |
| `ONBOARDING_WRONG_PRACTICE_NOTICE` | ACT | SPEC / ATTACHED | `showWhenAny`: WRONG_PRACTICE=YES | ✓ | „Leider konnten wir Sie nicht als Patient in unserem System finden." |
| `DOCUMENT_UPLOAD` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: GKV_MISSING=YES oder PKV_PAS_MISSING=YES | ✓ | s. APPOINTMENT |
| `INSURANCE_DATA_APP_TRANSFER` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: GKV_MISSING=YES | ✓ | s. APPOINTMENT |

---

### BILLING

**Decision:** – (kein Decision-Checkpoint)

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `BILLING_COST_NOT_COVERED` | EXP | SPEC / ATTACHED | specificRole: RULE_COST_COVERAGE | – | „…keine Kassenleistung. Durchführung als Selbstzahlerleistung möglich." |
| `BILLING_EXTERNAL_RESPONSIBILITY` | EXP | SPEC / ATTACHED | specificRole: EXTERNAL_RESPONSIBILITY | – | „Die Zuständigkeit … liegt bei der Krankenkasse oder einer anderen externen Stelle." |
| `BILLING_ADDRESS_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_INFORMATION | – | „Die aktuelle Postadresse … konnte nicht ermittelt werden." |
| `BILLING_DOCUMENT_MISSING` | EXP | SPEC / ATTACHED | specificRole: MISSING_DOCUMENT | – | „Fehlt: eine gültige Gesundheitskarte oder ein privatärztlicher Abrechnungsschein." |
| `BILLING_EXTERNAL_PROVIDER` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Die Rechnung erhalten Sie von einem externen Abrechnungsdienstleister…" |
| `BILLING_INVOICE_TIMING` | EXP | SPEC / ATTACHED | specificRole: PROCESS_INFO | – | „Die Abrechnung erfolgt in der Regel {Zyklus} über unsere Buchhaltung." *(praxisspezifisch)* |
| `BILLING_NOT_COVERED_BY_STATUTORY` | ACT | SPEC / ATTACHED | `showWhenAny`: COST_NOT_COVERED=YES | – | „Die angefragte Leistung wird nicht von der gesetzlichen Krankenkasse übernommen." |
| `BILLING_GOA_BILLING` | ACT | SPEC / ATTACHED | `showWhenAny`: COST_NOT_COVERED=YES | – | „Die Abrechnung erfolgt privat nach der Gebührenordnung für Ärzte (GOÄ)." |
| `BILLING_ONSITE_PAYMENT` | ACT | SPEC / SHARED_BOTTOM | `showWhenAny`: COST_NOT_COVERED=YES | – | „Selbstzahlerleistungen können vor Ort … per Karte bezahlt werden." |
| `BILLING_CONTACT_EXTERNAL_PARTY` | ACT | SPEC / ATTACHED | `showWhenAny`: EXTERNAL_RESPONSIBILITY=YES | ✓ | „… wenden Sie sich bitte direkt an Ihre Krankenkasse oder die zuständige Stelle." |
| `BILLING_ADDRESS_UPDATE_REQUESTED` | ACT | SPEC / SHARED_BOTTOM | `showWhenAny`: ADDRESS_MISSING=YES | – | „Bitte teilen Sie uns Ihre aktuelle Postadresse mit…" |
| `INSURANCE_DATA_APP_TRANSFER` | ACT | GLOB / SHARED_BOTTOM | `showWhenAny`: DOCUMENT_MISSING=YES | ✓ | s. APPOINTMENT |

---

### TECH_SUPPORT

**Decision:** – (kein Decision-Checkpoint)

| Checkpoint-ID | Art | Scope/Placement | Trigger / Binding | Audience-Variante | Kurzinhalt |
|---|---|---|---|---|---|
| `TECH_VIDEO_NOT_WORKING` | EXP | SPEC / ATTACHED | specificRole: CHANNEL_NOT_SUITABLE; m5Code: TECH | – | „…konnte die Videosprechstunde … nicht stattfinden. … Wenden Sie sich an {Kontakt}." *(praxisspezifisch)* |

---

## Teil 2 – Übersicht nach Checkpoint

Nur aktiv in mindestens einem Profil gebundene Checkpoints. Deprecated-Einträge am Ende in separatem Abschnitt.

### DECISION-Checkpoints

| Checkpoint-ID | Label | Profile | Audience-Variante | Sicher deaktivierbar? | Grund |
|---|---|---|---|---|---|
| `AU_DECISION` | AU-Entscheidung | AU | ✓ | Nein | Strukturell erforderlich für Profil AU |
| `PRESCRIPTION_DECISION` | Rezept-Entscheidung | PRESCRIPTION | ✓ | Nein | Strukturell erforderlich für Profil PRESCRIPTION |
| `LAB_DECISION` | Labor-Entscheidung | LAB | – | Nein | Strukturell erforderlich für Profil LAB |
| `SAMPLE_COLLECTION_DECISION` | Probenabgabe-Entscheidung | SAMPLE_COLLECTION | – | Nein | Strukturell erforderlich |
| `ACUTE_CARE_DECISION` | Akuttermin-Entscheidung | ACUTE_CARE | ✓ | Nein | Strukturell erforderlich |
| `REFERRAL_DECISION` | Überweisungs-Entscheidung | REFERRAL | ✓ | Nein | Strukturell erforderlich |
| `IMMUNIZATION_DECISION` | Impf-Entscheidung | IMMUNIZATION | – | Nein | Strukturell erforderlich |
| `HOSPITAL_ADMISSION_DECISION` | Krankenhauseinweisung-Entscheidung | HOSPITAL_ADMISSION | – | Nein | Strukturell erforderlich |
| `MEDICAL_DOCUMENTS_DECISION` | Attest-/Bescheinigungs-Entscheidung | MEDICAL_DOCUMENTS | – | Nein | Strukturell erforderlich |

---

### GLOBAL ACTION-Checkpoints (SHARED_BOTTOM / ATTACHED)

Werden profilübergreifend in mehreren Profilen wiederverwendet.

| Checkpoint-ID | Label | actionCategory | Placement | Profile (direkt gebunden) | Audience-Variante | Praxisspezifischer Wert | Sicher deaktivierbar? |
|---|---|---|---|---|---|---|---|
| `DIGITAL_REQUEST` | Digitale Anfrage | NEXT_STEP | SHARED_BOTTOM | AU, PRESCRIPTION, LAB, REFERRAL, HOSPITAL_ADMISSION, IMMUNIZATION, APPOINTMENT, HEILMITTELVERORDNUNG, MEDICAL_DOCUMENTS, ONBOARDING, BILLING, TECH_SUPPORT | ✓ | – | Unklar |
| `DIGITAL_REQUEST_PROCESSING_TIME` | Bearbeitungszeit digitale Anfrage | INFO | SHARED_BOTTOM | AU | – | `digitalRequestProcessingTimeMin/Max/Unit` | Unklar |
| `BOOK_APPOINTMENT` | Termin buchen | NEXT_STEP | SHARED_BOTTOM | AU, PRESCRIPTION, LAB, SAMPLE_COLLECTION, ACUTE_CARE, REFERRAL, IMMUNIZATION, APPOINTMENT, HEILMITTELVERORDNUNG, HOSPITAL_ADMISSION, MEDICAL_DOCUMENTS, BILLING | – | – | Unklar |
| `DOCUMENT_UPLOAD` | Unterlagen hochladen | NEXT_STEP | SHARED_BOTTOM | APPOINTMENT, PRESCRIPTION, ONBOARDING, REFERRAL, HEILMITTELVERORDNUNG, MEDICAL_DOCUMENTS, HOSPITAL_ADMISSION | ✓ | `uploadPlatformName`, `uploadPlatformAccountLabel` | Unklar |
| `INSURANCE_DATA_APP_TRANSFER` | eGK-Daten via Krankenkassen-App | NEXT_STEP | SHARED_BOTTOM | AU, PRESCRIPTION, REFERRAL, APPOINTMENT, ONBOARDING, BILLING | ✓ | – | Unklar |
| `CONTACT_PERSON_INFO` | Kontaktperson dokumentieren | NEXT_STEP | SHARED_BOTTOM | AU, REFERRAL, PRESCRIPTION | ✓ | – | Unklar |
| `ACUTE_OPEN_CONSULTATION_ACTION` | Offene Sprechstunde – Hinweis | INFO | SHARED_BOTTOM | ACUTE_CARE, AU, APPOINTMENT | – | `openConsultationDays/Hours/CapacityLimited` | Unklar |
| `CARE_CHANNEL_CHOICE` | Versorgungsweg – persönlich oder digital | INFO | SHARED_BOTTOM | AU, ACUTE_CARE | – | – | Unklar |
| `CONTROL_APPOINTMENT_RECOMMENDED` | Kontrolltermin empfohlen | NEXT_STEP | SHARED_BOTTOM | AU, PRESCRIPTION, HOSPITAL_ADMISSION | – | – | Unklar |
| `PAYMENT_ONSITE_INFO` | Zahlung vor Ort | NEXT_STEP | SHARED_BOTTOM | MEDICAL_DOCUMENTS | – | – | Unklar |
| `E_RECIPE_USE` | eRezept nutzen | INFO | ATTACHED | PRESCRIPTION | – | – | Unklar |
| `PHARMACY_INFORMATION` | Apotheke / Direktübermittlung | NEXT_STEP | ATTACHED | PRESCRIPTION | – | – | Unklar |
| `PROCESSING_DELAY` | Bearbeitungsverzögerung | INFO | SHARED_BOTTOM | PRESCRIPTION (via actionGuidanceRules) | – | – | Unklar |
| `TECHNICAL_ISSUE` | Technische Störung | INFO | SHARED_BOTTOM | PRESCRIPTION (via actionGuidanceRules) | – | – | Unklar |
| `URINE_SAMPLE_ONSITE` | Urinprobe vor Ort | NEXT_STEP | ATTACHED | SAMPLE_COLLECTION | – | – | Unklar |
| `TRANSPORT_QUESTIONNAIRE_REQUEST` | Fragebogen Krankentransport | NEXT_STEP | ATTACHED | HOSPITAL_ADMISSION | – | – | Unklar |
| `INFECTIOUS_CONTACT_DIGITALLY` | Infektionsschutz – digital melden | NEXT_STEP | SHARED_BOTTOM | ACUTE_CARE | – | – | Unklar |
| `INFECTIOUS_VIDEO_CONSULTATION` | Infektionsschutz – Videosprechstunde | NEXT_STEP | SHARED_BOTTOM | ACUTE_CARE | – | – | Unklar |
| `INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED` | Infektionsschutz – kein unangemeldetes Erscheinen | INFO | ATTACHED | ACUTE_CARE | – | – | Unklar |

---

### INTRO-Checkpoints (`actionCategory: "INTRO"`)

Genau ein aktiver INTRO-Checkpoint erscheint im `output.intro`. Kein M2-Schalter, kein Decision-Einfluss.

| Checkpoint-ID | Label | Audience-Variante | Text Patient | Sicher deaktivierbar? |
|---|---|---|---|---|
| `MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED` | Anfrage eingegangen | ✓ | „Vielen Dank für Ihre Anfrage." | Ja (UI only) |
| `MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED` | Fragebogen eingegangen | ✓ | „Vielen Dank für das Ausfüllen des Fragebogens." | Ja (UI only) |
| `MESSAGE_INTRO_PRACTICE_FOLLOWUP` | Nach Termin | ✓ | „Nach Ihrem letzten Termin" | Ja (UI only) |
| `MESSAGE_INTRO_MISSING_INFO` | Laufendes Anliegen | ✓ | „Zur Bearbeitung Ihres Anliegens" | Ja (UI only) |
| `MESSAGE_INTRO_APPOINTMENT_PREPARATION` | Vorbereitung Termin | ✓ | „Zur Vorbereitung Ihres Termins" | Ja (UI only) |

---

### SECTION_INTRO-Checkpoints (`actionCategory: "SECTION_INTRO"`)

M2-Schubladenauswahl. Wird nur an `output.intro` angehängt, wenn gleichzeitig ein Message-Intro E1/E2/E3 aktiv ist. Alle 6 Schubladen stehen in jedem der 14 Profile zur Verfügung (`availableSectionIntroIds`).

| Checkpoint-ID | Label | Text (Anschlussform) | Sicher deaktivierbar? |
|---|---|---|---|
| `SECTION_INTRO_INFO_MISSING` | Angaben fehlen | „fehlen uns noch einige Angaben." | Ja (UI only) |
| `SECTION_INTRO_DOCS_MISSING` | Unterlagen fehlen | „liegen uns noch nicht alle erforderlichen Unterlagen vor." | Ja (UI only) |
| `SECTION_INTRO_DOCS_COMPLETE` | Unterlagen vollständig | „liegen uns Ihre Unterlagen vollständig vor." | Ja (UI only) |
| `SECTION_INTRO_REVIEWED` | Anliegen geprüft | „haben wir Ihr Anliegen geprüft." | Ja (UI only) |
| `SECTION_INTRO_IN_PROGRESS` | Noch in Bearbeitung | „bitten wir noch um etwas Geduld." | Ja (UI only) |
| `SECTION_INTRO_NOT_RESPONSIBLE` | Nicht in unserer Praxis | „können wir Ihr Anliegen nicht in unserer Praxis bearbeiten." | Ja (UI only) |

---

### GLOBAL EXPLANATION-Checkpoints (Scope GLOBAL, nicht deprecated)

Profilübergreifend einsetzbar, aber derzeit nur in wenigen Profilen aktiv gebunden.

| Checkpoint-ID | Label | classification | Aktiv in Profil(en) | Sicher deaktivierbar? | Grund |
|---|---|---|---|---|---|
| `INFECTIOUS_PROTOCOL` | Infektionsschutz – Hinweis | MODULAR; m5Code: INFECTIOUS | ACUTE_CARE (`boundGlobalCheckpointIds`) | Unklar | Steuert 3 gebundene Actions |
| `TRANSPORT_APPROVED` | Krankenbeförderung zugesagt | MODULAR; exclusiveGroupId: TRANSPORT_STATUS | Unklar (keine Profil-Bindung gefunden) | Unklar | – |
| `TRANSPORT_NOT_APPROVED` | Krankenbeförderung nicht zugesagt | MODULAR; exclusiveGroupId: TRANSPORT_STATUS | Unklar | Unklar | – |
| `TRANSPORT_INFO_MISSING` | Angaben zur Krankenbeförderung fehlen | MODULAR; m5Code: NO_DATA; exclusiveGroupId: TRANSPORT_STATUS | Unklar | Unklar | – |
| `REQUIRED_INFORMATION_COMPLETE` | Erforderliche Informationen vollständig | MODULAR | Unklar | Unklar | – |
| `DOCUMENTS_RECEIVED_AND_ASSIGNED` | Unterlagen eingegangen und zugeordnet | MODULAR | Unklar | Unklar | – |
| `DIGITAL_REQUEST_MEDICAL_REVIEW` | Digitale Anfrage – ärztliche Prüfung | MODULAR | Unklar | Unklar | – |
| `TECHNICAL_ISSUE_DELAY` | Bearbeitung verzögert – technisches Problem | MODULAR | Unklar | Unklar | – |
| `STAFF_SHORTAGE_DELAY` | Bearbeitung verzögert – personelle Einschränkung | MODULAR | Unklar | Unklar | – |

---

### Checkpoints mit praxisspezifischen Werten

Diese Checkpoints beziehen Textwerte aus `PracticeInquiryConfig` (via `getInquiryCheckpointCatalog(cfg)`). Der Fallback ist `PILOT_PRACTICE_INQUIRY_CONFIG`.

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
| `BILLING_INVOICE_TIMING` | `billingCycleLabel` |
| `TECH_VIDEO_NOT_WORKING` | `videoSupportContact` |

---

## Teil 3 – Deprecated Checkpoints (im Katalog, nicht aktiv gebunden)

Diese Checkpoints existieren im Katalog, sind aber mit `@deprecated` markiert und nicht mehr in `specificCheckpointIds` oder `boundActionCheckpointIds` eines aktiven Profils aufgeführt.

| Checkpoint-ID | Ersetzt durch / Grund |
|---|---|
| `AU_DURATION_LIMIT` | Inhaltlich durch `AU_DECISION-Q2` abgedeckt (entfernt) |
| `AU_CONTINUITY_REQUIRED` | Falsch eingeordnet (enthielt Entscheidungsaussage statt Erklärung) |
| `AU_RETURN_TO_WORK` | Prozesshinweis ohne Entscheidungsbezug, falsch eingeordnet |
| `PRESCRIPTION_CONTROL_OVERDUE` | Inhalt via Termin-/Kontrollhinweise in M3 |
| `PRESCRIPTION_KNOWN_MEDICATION` | Legacy-Baustein aus früherer Rezept-Triage |
| `PRESCRIPTION_FOLLOW_UP` | Wiederverordnung heute über aktive Rezept-Logik |
| `PRESCRIPTION_SPECIALIST_REQUIRED` | Abgelöst durch `PRESCRIPTION_SPECIALIST_RESPONSIBLE` |
| `PRESCRIPTION_SPECIAL_TYPE` | Legacy-Baustein (BtM, Privatrezept, Pille) |
| `LAB_SELF_PAYER_IGEL` | Ersetzt durch `BILLING_COST_NOT_COVERED` + `BILLING_EXTERNAL_PROVIDER` |
| `LAB_DISCUSSION_PROCESS_CODE` | Ungebunden |
| `LAB_EXTERNAL_DOCUMENT_PRESENT` | Konsolidiert in `LAB_EXTERNAL_REFERRAL` |
| `LAB_SELF_PAY` | Konsolidiert in `LAB_SELF_PAYER_IGEL` (selbst deprecated) |
| `LAB_MEDICAL_INDICATION` | Abgelöst durch spezifischere LAB-Checkpoints |
| `LAB_CHECKUP_ELIGIBLE` | Ersetzt durch `LAB_CHECKUP_RULES` |
| `LAB_VALUES_DEFINED` | Legacy-Baustein zur früheren Laborwerte-Triage |
| `LAB_INTERNAL_ORDER_MISSING` | Nicht mehr in LAB.specificCheckpointIds |
| `LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED` | Nicht mehr in LAB.specificCheckpointIds |
| `LAB_EXTERNAL_BILLING` | Ersetzt durch `BILLING_EXTERNAL_PROVIDER` |
| `ACUTE_ONLY_LIMIT` | Ersetzt durch `ACUTE_PURPOSE` + `ACUTE_EXCLUSION` |
| `OPEN_CONSULTATION_INFO` | Ersetzt durch `ACUTE_OPEN_CONSULTATION_INFO` (selbst deprecated) |
| `NO_FIXED_TIME` | Ersetzt durch `OPEN_CONSULTATION_INFO` + `WAITING_TIME` |
| `CAPACITY_LIMIT` | Ersetzt durch `ACUTE_OPEN_CONSULTATION_INFO` |
| `WAITING_TIME` | Bitte `ACUTE_OPEN_CONSULTATION_ACTION` verwenden |
| `ACUTE_OPEN_CONSULTATION_INFO` | Bitte `ACUTE_OPEN_CONSULTATION_ACTION` (ACT) verwenden |
| `REF_DOCTOR_CONTACT_REQUIRED` | Ersetzt durch `REF_MEDICAL_CONSULTATION_REQUIRED` |
| `IMMUNIZATION_PASS_MISSING` | Nicht mehr in IMMUNIZATION.specificCheckpointIds (Nachfolger: `IMMUNIZATION_VACCINATION_RECORD_MISSING`) |
| `APPOINTMENT_PROCESS_MULTI_STEP` | Fachprozesswissen gehört ins Fachprofil |
| `APPOINTMENT_PREPARATION_REQUIRED` | Via `TERMIN_PREPARATION_REQUIRED` (GLOBAL) + globalHints |
| `APPOINTMENT_DOCUMENT_MISSING` | Dokumentenlogik gehört ins Fachprofil |
| `APPOINTMENT_VIDEO_LIMITATIONS` | Gehört ins Fachprofil |
| `APPOINTMENT_VIDEO_REQUIREMENTS` | Gehört in TECH_SUPPORT |
| `BILLING_PROCESS_EXTERNAL` | Ersetzt durch `BILLING_EXTERNAL_PROVIDER` |
| `BILLING_DATA_MISSING` | Ersetzt durch `BILLING_ADDRESS_MISSING` |
| `MEDICAL_DOCUMENT_REVIEW_REQUIRED` | Ersetzt durch globales `MEDICAL_CONSULTATION_REQUIRED` |
| `MEDICAL_DOCUMENT_DOCUMENTATION_MISSING` | Text zu unscharf |
| `MEDICAL_DOCUMENT_AU_DIFFERENCE` | Nicht mehr aktiv gebunden |
| `MEDICAL_DOCUMENT_PROCESS_INFO` | Generischer Ablaufhinweis ohne Entscheidungsbezug |
| `ONBOARDING_DOCUMENT_MISSING` | Abgelöst durch `ONBOARDING_GKV_DOCUMENT_MISSING` + `ONBOARDING_PKV_PAS_MISSING` |
| `ONBOARDING_PROCESS_REQUIRED` | Redundanter Baustein |
| `DIGITAL_REQUEST_REQUIRED` | Fachlich überholt; Fragebögen werden inzwischen direkt versendet |
| `IS_NEW_PATIENT` | Durch profilspezifische Checkpoints ersetzt |
| `PATIENT_NOT_IN_GERMANY` | Ersetzt durch `PRESCRIPTION_PATIENT_NOT_IN_GERMANY` |
| `DOCTOR_REVIEW_REQUIRED` | Durch profilspezifische Checkpoints ersetzt |
| `DATA_INCOMPLETE` | Durch profilspezifische Checkpoints ersetzt |
| `IS_CHRONIC_PATIENT` | Ersetzt durch `PRESCRIPTION_CHRONIC_PATIENT` |
| `MEDICAL_CONSULTATION_REQUIRED` | Durch profilspezifische Checkpoints ersetzt |
| `TERMIN_PREPARATION_REQUIRED` | Generisch; ACTION-Checkpoints bevorzugt |
| `HOSPITAL_DISCHARGE_REPORT_MISSING` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_NO_POSTAL_DELIVERY` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_NO_PRESCRIPTION_REQUIRED` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_MEDICATION_UNCLEAR` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_DOSAGE_UNCLEAR` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_MEDICATION_NOT_DOCUMENTED` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `PRESCRIPTION_SPECIALIST_REPORT_REQUIRED` | Nicht mehr in PRESCRIPTION.specificCheckpointIds |
| `SAMPLE_COLLECTION_INFORMATION_INCOMPLETE` | Nicht mehr in SAMPLE_COLLECTION.specificCheckpointIds |
| `SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING` | Nicht mehr in SAMPLE_COLLECTION.specificCheckpointIds |
| `APPOINTMENT_CAN_BE_BOOKED` | Nicht in APPOINTMENT.specificCheckpointIds |
| `APPOINTMENT_CANCEL_OR_RESCHEDULE` | Nicht in APPOINTMENT.specificCheckpointIds |
| `APPOINTMENT_TYPE_MATCH_CONFIRMED` | Nicht in APPOINTMENT.specificCheckpointIds |
| `ONLINE_ANAMNESIS` | Text leer; nicht aktiv gebunden |
| `BILLING_ONSITE_PAYMENT` | Dupliziert durch `PAYMENT_ONSITE_INFO`; per Billing noch aktiv (über `boundActionConditions` bei COST_NOT_COVERED), ist aber SHARED_BOTTOM im BILLING-Scope |

> Hinweis: „Deprecated" bedeutet ausschließlich, dass der Checkpoint in keinem aktiven Profil gebunden ist. Er kann weiterhin in historischen Inquiry-Sessions referenziert sein.
