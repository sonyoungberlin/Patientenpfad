# Anfrage-Einstellungen – Praxis-Owner-UI

**Stand:** Mai 2026  
**Status:** Spezifikation vor Implementierung

---

## 1. Ziel

Praxis-Owner (Rolle `OWNER`) und Praxis-Admins (Rolle `ADMIN`) sollen
praxisbezogene Variablen für die Patientenkommunikation selbst pflegen
können – ohne Eingriff eines Plattform-Admins.

Bisher sind diese Variablen ausschließlich über den Plattform-Admin-Bereich
(`/admin/practices/[id]`) bearbeitbar. Die neue Owner-Seite macht die
praxiseigenen Betriebsparameter direkt im eigenen Account zugänglich.

Die Seite folgt dem bestehenden Muster von `/practice/signature`:
kein Plattform-Admin-Bypass, `notFound()` für USER/Fremde.

---

## 2. Neue Routen

| Pfad | Art | Berechtigung |
|---|---|---|
| `/practice/inquiry-settings` | Server-Seite (Next.js App Router) | OWNER, ADMIN |
| `/api/practice/inquiry-settings` | API-Route (GET + PUT) | GET: OWNER, ADMIN, USER · PUT: OWNER, ADMIN |

Der bisherige Pfad `/practice/inquiry-info` (nur Info-Texte 1–3) wird in
`/practice/inquiry-settings` überführt. Die API-Route
`/api/practice/inquiry-info` wird entsprechend zu
`/api/practice/inquiry-settings` umbenannt und erweitert.

### Navigation

In `components/AppShell.tsx`, im `isPractice`-Block (nach dem Signatur-Link):

```typescript
sectionItems.push({ label: "Anfrage-Einstellungen", href: "/practice/inquiry-settings" });
```

---

## 3. Freigegebene Owner-Felder

Alle Felder sind in `prisma/schema.prisma` als nullable (`String?`, `Int?`,
`Boolean?`) definiert. `NULL` bedeutet: Fallback auf
`PILOT_PRACTICE_INQUIRY_CONFIG` im Resolver `lib/inquiries/practiceConfig.ts`.

### 3.1 Buchungskalender / Buchungscodes

| DB-Feld | Config-Schlüssel | UI-Label | Max |
|---|---|---|---|
| `inq_booking_calendar_name` | `bookingCalendarName` | Kalender-Name | 200 |
| `inq_findings_review_code` | `findingsReviewBookingCode` | Buchungscode Befundbesprechung | 200 |
| `inq_chronic_control_code` | `chronicControlBookingCode` | Buchungscode Chroniker-Kontrolle | 200 |
| `inq_checkup_second_code` | `checkupSecondBookingCode` | Buchungscode Check-Up (2. Termin) | 200 |
| `inq_doctor_order_code` | `doctorOrderBookingCode` | Buchungscode Ärztliche Anordnung | 200 |

Buchungscodes sind Termintyp-Identifier der Buchungsplattform (z. B. Doctolib).
Sie erscheinen im generierten Nachrichtentext unter `APPOINTMENT_BOOK_*`-
und `LAB_APPOINTMENT_INTERNAL`-Checkpoints.

### 3.2 Digitale Anfrage / Bearbeitungszeit

| DB-Feld | Config-Schlüssel | UI-Label | Typ | Grenzen |
|---|---|---|---|---|
| `inq_digital_req_time_min` | `digitalRequestProcessingTimeMin` | Bearbeitungszeit Min | `Int?` | 1–999 |
| `inq_digital_req_time_max` | `digitalRequestProcessingTimeMax` | Bearbeitungszeit Max | `Int?` | 1–999 |
| `inq_digital_req_time_unit` | `digitalRequestProcessingTimeUnit` | Einheit | `String?` | Whitelist: `"Stunden"`, `"Werktage"` |

Invariante: Min ≤ Max (nur wenn beide gesetzt). Betrifft Checkpoint
`DIGITAL_REQUEST_PROCESSING_TIME`.

### 3.3 Upload-Plattform

| DB-Feld | Config-Schlüssel | UI-Label | Max |
|---|---|---|---|
| `inq_upload_platform_name` | `uploadPlatformName` | Plattform-Name | 200 |
| `inq_upload_platform_account_label` | `uploadPlatformAccountLabel` | Account-Bezeichnung | 200 |

Betrifft Checkpoints `DOCUMENT_UPLOAD` und `ONBOARDING_DOCTOLIB_INFO`.

### 3.4 Offene Sprechstunde

| DB-Feld | Config-Schlüssel | UI-Label | Typ | Max |
|---|---|---|---|---|
| `inq_open_consultation_days` | `openConsultationDays` | Tage | `String?` | 200 |
| `inq_open_consultation_hours` | `openConsultationHours` | Uhrzeiten | `String?` | 200 |
| `inq_open_consultation_cap_limited` | `openConsultationCapacityLimited` | Kapazitätshinweis anzeigen | `Boolean?` | — |

Betrifft Checkpoint `ACUTE_OPEN_CONSULTATION_ACTION`.
`inq_open_consultation_cap_limited`: Checkbox; `NULL` → Fallback auf
Pilot-Default (`true`).

### 3.5 Video-Support / Technik

| DB-Feld | Config-Schlüssel | UI-Label | Max |
|---|---|---|---|
| `inq_video_support_contact` | `videoSupportContact` | Video-Support-Kontakt | 200 |

Betrifft Checkpoint `TECH_VIDEO_NOT_WORKING`.

### 3.6 Zusätzliche Praxisinformationen (Info-Texte 1–3)

| DB-Feld | Config-Schlüssel | UI-Label | Max |
|---|---|---|---|
| `inq_info_text_1` | `inqInfoText1` | Info 1 | 300 |
| `inq_info_text_2` | `inqInfoText2` | Info 2 | 300 |
| `inq_info_text_3` | `inqInfoText3` | Info 3 | 300 |

Freitext, max. 300 Zeichen, Zeilenumbrüche und einfache Listen mit „-"
erlaubt. Erscheinen in M3 als optional zuschaltbare Bausteine unter
„Zusätzliche Praxisinformationen". Werden **nicht** durch
`getInquiryCheckpointCatalog()` injiziert, sondern zur Laufzeit aus
`practiceConfig` gelesen (siehe Abschnitt 7).

**Gesamt Owner-Felder: 17** (14 klassische Config-Felder + 3 Info-Texte).

---

## 4. Admin-only Felder

Das folgende Feld bleibt ausschließlich über den Plattform-Admin-Bereich
(`/admin/practices/[id]`) bearbeitbar:

| DB-Feld | Config-Schlüssel | Begründung |
|---|---|---|
| `inq_billing_cycle_label` | `billingCycleLabel` | Der Abrechnungsrhythmus ist ein vertrags- und compliance-gebundener Parameter, der sich auf externe Dritte (Abrechnungspartner, Labore) bezieht. Eine falsche oder eigenmächtige Änderung durch den Praxis-Owner könnte gegenüber Patienten falsche Erwartungen zur Rechnungslegung wecken. Änderungen erfordern explizite Admin-Prüfung. |

Alle anderen `inq_*`-Felder sind Owner-freigegeben.

> Hinweis: `bookingCalendarUrl` und `digitalRequestUrl` sind nicht in der
> DB gespeichert – sie sind reine Pilot-Defaults in
> `PILOT_PRACTICE_INQUIRY_CONFIG` und werden perspektivisch separat
> behandelt.

---

## 5. Validierungsregeln

### 5.1 String-Felder (Buchungscodes, Plattform, Sprechstunde, Video)

- Maximale Länge: **200 Zeichen** (nach `trim()`)
- Leerstring nach `trim()` → wird als `null` gespeichert (Fallback aktiv)
- Kein HTML, kein Markdown – reiner Plaintext
- Zeilenumbrüche: **nicht erlaubt** (außer Info-Texte, s. u.)

### 5.2 Info-Texte (inq_info_text_1/2/3)

- Maximale Länge: **300 Zeichen** (nach `trim()`)
- Leerstring nach `trim()` → `null` (Baustein in M3 deaktiviert)
- Zeilenumbrüche und einfache Listen mit „-" sind **erlaubt**
- Kein Rich Text, kein HTML, kein Markdown

### 5.3 Integer-Felder (Bearbeitungszeit)

- Nur ganze Zahlen im Bereich **1–999**
- Leerstring → `null` (Fallback auf Pilot-Default)
- Keine Dezimalzahlen
- Wenn beide Felder gesetzt: `min ≤ max`; andernfalls Validierungsfehler

### 5.4 time_unit-Whitelist

- Erlaubte Werte: `"Stunden"`, `"Werktage"`
- Leerstring → `null` (Fallback)
- Jeder andere Wert → Validierungsfehler (kein stilles Fallback)

### 5.5 Boolean-Feld (cap_limited)

- Checkbox-Semantik: vorhanden = `true`, nicht gesendet = `false`
- Niemals `null` im Update-Objekt – immer explizit `true` oder `false`

### 5.6 Semantische Invariante: Placeholder ≠ gespeicherter Wert

Die UI zeigt Pilot-Default-Werte als `placeholder`-Attribut in
Eingabefeldern. Ein leeres Feld, das visuell den Fallback anzeigt, speichert
`null` – **nicht** den Placeholder-String. Damit ist immer klar: `null` = 
aktiver Fallback, gesetzter Wert = praxisspezifische Überschreibung.

**Keine Pilot-Defaults dürfen als Wert gespeichert werden**, auch wenn der
User sie manuell eintippen sollte. (Dafür ist kein automatischer Check
vorgesehen – die Semantik gilt auf Designebene, nicht als Validator-Regel.)

---

## 6. Architekturregeln

### 6.1 Kein direkter Prisma-Write ohne Validator

Der API-Handler (`/api/practice/inquiry-settings`) schreibt nie direkt in
die DB. Alle Eingaben laufen durch einen dedizierten Validator:

```
lib/practice/validatePracticeInquirySettings.ts
```

Dieser Validator ist eigenständig – analog zu
`lib/admin/validatePracticeInquiryConfig.ts`. Beide existieren
nebeneinander ohne gegenseitige Abhängigkeit.

### 6.2 Owner-Validator und Admin-Validator bleiben getrennt

`lib/admin/validatePracticeInquiryConfig.ts` (15 Felder) und
`lib/practice/validatePracticeInquirySettings.ts` (17 Felder) sind
voneinander unabhängig. Es gibt keine gemeinsame Basisklasse und kein
shared Schema.

Begründung: Admin- und Owner-Felder sind nicht deckungsgleich
(`inq_billing_cycle_label` nur im Admin-Validator). Eine geteilte Basis
würde entweder versehentlich Felder freigeben oder erfordert komplexe
Opt-out-Logik.

### 6.3 PracticeConfig bleibt Runtime-Quelle der Wahrheit

`lib/inquiries/practiceConfig.ts` → `getPracticeInquiryConfig()` ist die
einzige autorisierte Quelle für den Checkpoint-Renderer. Die Owner-Seite
schreibt in die DB; der Resolver liest daraus. Kein direktes Durchreichen
von Formularwerten an Renderer oder Session-Objekte.

### 6.4 Statischer Checkpoint-Katalog bleibt unverändert

Die Owner-Felder steuern Textwerte innerhalb bestehender Checkpoints.
Sie erzeugen keine neuen Checkpoints, verändern keine
`specificCheckpointIds`, keine `boundActionCheckpointIds` und keine
`decisionCheckpointId`. Der Katalog in
`lib/inquiries/inquiryCheckpointCatalog.ts` ist read-only für Owner.

### 6.5 Berechtigungsmodell

```
API PUT /api/practice/inquiry-settings
  → requirePracticeRole(req, [OWNER, ADMIN])
  → Praxis-ID aus account.current_practice.id (nie aus Body/URL)

Seite /practice/inquiry-settings
  → requirePracticeRoleFromCookies([OWNER, ADMIN])
  → USER: notFound() (404)
  → kein Plattform-Admin-Bypass
```

---

## 7. M3-Praxisinformationen (PRACTICE_INFO_1/2/3)

### 7.1 Virtuelle Runtime-IDs

`PRACTICE_INFO_1`, `PRACTICE_INFO_2`, `PRACTICE_INFO_3` sind **virtuelle
Action-IDs**. Sie erscheinen nicht im statischen Checkpoint-Katalog
(`INQUIRY_CHECKPOINT_CATALOG_V2`). Der Renderer ignoriert unbekannte IDs
stillschweigend – das ist die korrekte Funktionsweise, kein Bug.

### 7.2 Geltungsbereich: nur M3

Die Bausteine sind ausschließlich in M3 zuschaltbar. In M1 und M2 haben
sie keine Auswirkung. Ein Praxis-Owner kann die Texte in der Datenbank
hinterlegen; die Sichtbarkeit in M3 steuert die MFA durch Toggles.

### 7.3 Initialisierung und Persistenz

- Initialzustand in M3: **INACTIVE** (nie automatisch aktiv)
- Toggle-Zustand wird in `InquirySession.action_statuses` als
  `"PRACTICE_INFO_1": "ACTIVE"` / `"INACTIVE"` gespeichert
- Beim Bestätigen (`POST /api/inquiries/[id]/confirm`) liest
  `confirmInquirySession()` die aktiven IDs aus `action_statuses` und
  holt den Text aus `practiceConfig`
- Aktive, nicht-leere Texte werden als `practiceInfoTexts: string[]` in
  `InquirySession.generated_output` persistiert

### 7.4 Datenfluss

```
Owner speichert Text                     in Practice.inq_info_text_1
                                                    ↓
MFA öffnet M3                            practiceConfig.inqInfoText1 (via getPracticeInquiryConfig)
                                                    ↓
MFA aktiviert PRACTICE_INFO_1            action_statuses["PRACTICE_INFO_1"] = "ACTIVE"
                                                    ↓
MFA bestätigt                            confirmInquirySession():
                                           activeInfoTexts = ["Text aus inqInfoText1"]
                                           finalOutput = { ...generatedOutput, practiceInfoTexts }
                                                    ↓
Nachricht kopieren                       inquiryOutputToPlainText():
                                           "Zusätzliche Praxisinformationen\n\n<Text>"
```

### 7.5 Rückwärtskompatibilität

`practiceInfoTexts` ist optional (`practiceInfoTexts?: string[]`) im Typ
`InquiryResponseV2Output`. Ältere Sessions ohne dieses Feld bleiben
vollständig lesbar. Die Plain-Text-Funktion zeigt den Abschnitt nur, wenn
mindestens ein Text vorhanden ist.

---

## 8. Verhältnis zu bestehenden Dokumenten

| Dokument | Verhältnis |
|---|---|
| `docs/scaling/practice-config-audit.md` | Inventur aller Config-Felder; diese Datei beschreibt die Owner-Freigabe |
| `docs/scaling/practice-parameter-boundaries.md` | Governance-Grenzen (was kein Praxisparameter ist); gilt weiterhin unverändert |
| `docs/inquiry-checkpoint-inventory.md` | Welche Checkpoints welche Config-Felder nutzen; unverändert |
