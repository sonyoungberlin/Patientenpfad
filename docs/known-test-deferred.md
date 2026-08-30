# Historische zurückgestellte Test-Failures

Diese Datei bewahrt die Ursachenanalyse der früher zurückgestellten Fehlergruppen.
Alle unten aufgeführten Gruppen wurden am 30.08.2026 bereinigt. Sie sind keine
aktuell akzeptierten Fehler und dürfen bei neuen Fehlschlägen nicht mehr als
Ausnahme herangezogen werden.

Aktuell validierter Stand:

- Jest: 324 von 324 Suites und 6.558 von 6.558 Tests bestanden
- TypeScript: 0 Fehler
- Prisma-Schema: gültig
- Production Build: erfolgreich

Historische Status-Werte:
- `DEFERRED` – Ursache bekannt, Produktbereich gerade nicht in aktiver Entwicklung
- `NEEDS_DECISION` – Ursache bekannt, aber das korrekte Verhalten ist fachlich ungeklärt
- `TDD` – Test dokumentiert eine noch nicht implementierte Funktion; läuft absichtlich rot

> **Für Copilot-Analysen:** Die folgenden Einträge sind nur noch historische
> Begründungen. Neu auftretende Fehler müssen regulär untersucht werden.

---

## Gruppe 1 – GLOBAL_PROCESS_SHELF / GLOBAL_ACTION_SHELF (Inquiry-Renderer-Refactoring)

**Status:** `DEFERRED`  
**Build-Blocker:** Nein

**Betroffene Suites:**
- `tests/renderInquiryResponse.test.ts` (~37 Fehler)
- `tests/techUploadFailedReuse.test.ts` (~10 Fehler)
- `tests/techSupportM1BM3.test.ts` (~4 Fehler)
- `tests/processShelfGroups.test.ts` (1 Fehler)
- `tests/processShelfProfileBindings.test.ts` (3 Fehler)
- `tests/m2ProcessShelfGroupsView.test.ts` (~4 Fehler)
- `tests/digitalRequestMedicalReview.test.ts` (3 Fehler)
- `tests/evaluateActionGuidance.test.ts` (1 Fehler)

**Produktbereich:** Inquiry / M2-M3 Renderer / Process Shelf

**Bekannte Ursache:**  
`TECH_UPLOAD_FAILED`, `DIGITAL_REQUEST_MEDICAL_REVIEW`, `REQUIRED_INFORMATION_COMPLETE`,
`DOCUMENTS_RECEIVED_AND_ASSIGNED` und `TECHNICAL_ISSUE_DELAY` wurden aus profil-spezifischen
Bindings in einen `GLOBAL_PROCESS_SHELF` verschoben (siehe `lib/inquiries/processShelfProfileBindings.ts`,
Kommentare `"// entfernt, da jetzt im GLOBAL_PROCESS_SHELF"`).  
`PROCESSING_DELAY`, `TECHNICAL_ISSUE` und `DOCUMENT_UPLOAD` befinden sich in
`GLOBAL_ACTION_SHELF`. Der Render-Pfad in `renderInquiryResponse` und
`InquiryM2Client.tsx` wertet diese globalen Shelves noch nicht vollständig aus.
Profile haben außerdem leere `boundGlobalCheckpointIds`-Arrays, obwohl
`DIGITAL_REQUEST_MEDICAL_REVIEW` global verfügbar sein soll.

**Warum zurückgestellt:**  
Das Refactoring ist in Arbeit. Die globalen Shelves sind definiert, aber die
Renderer-Integration ist unvollständig. Das Fertigstellen erfordert Änderungen
an Produktlogik und UI-Komponenten.

**Wann erneut untersuchen:**  
Beim nächsten Arbeitspaket am Inquiry-Renderer oder Process-Shelf-Konzept.

---

## Gruppe 2 – Reha- und Pflege-Supplement-Checkpoints (K11-Trigger-Logik)

**Status:** `NEEDS_DECISION`  
**Build-Blocker:** Nein

**Betroffene Suites:**
- `tests/rehaSupplementCheckpoints.test.ts` (~8 Fehler + 2 TypeScript-Fehler)
- `tests/pflegeSupplementCheckpoints.test.ts` (~8 Fehler)

**Produktbereich:** Inquiry / M1 / Formularanliegen-Trigger (K11)

**Bekannte Ursache:**  
Der JSDoc-Kommentar in `ensureSelectionConditionalCheckpoints`
(`lib/logic/checkpointCatalog.ts`) beschreibt, dass K11 "Reha-Antrag" die
Checkpoints K03–K07, K14, K15 ergänzt. Die Implementierung ergänzt aktuell
nur K14/K15 (für Reha) bzw. K16/K17 (für Pflege). Die Tests prüfen das im
Kommentar dokumentierte Verhalten.  
Zusätzlich: TypeScript-Fehler in `rehaSupplementCheckpoints.test.ts` –
`null` ist nicht `M1BlockStatus`.

**Warum zurückgestellt:**  
Die fachliche Entscheidung ist offen: Sollen K03–K07 bei einem Reha-Antrag
automatisch ergänzt werden, oder wurde das bewusst entfernt (weil sie über
M1-Block-Aktivierung abgedeckt werden)? Der Kommentar und die Tests
widersprechen der Implementierung – es fehlt eine bewusste Entscheidung.

**Wann erneut untersuchen:**  
Beim nächsten Arbeitspaket zur Reha- oder Pflegeantrag-Logik oder nach
fachlicher Klärung des K11-Trigger-Verhaltens.

---

## Gruppe 3 – Inquiry-Profil-Texte und Struktur (einzelne Profile)

**Status:** `NEEDS_DECISION`  
**Build-Blocker:** Nein

**Betroffene Suites:**
- `tests/heilmittelverordnungProfile.test.ts` (1 Fehler)
- `tests/immunizationM1BM3.test.ts` (1 Fehler)
- `tests/medicalDocumentsM1BM3.test.ts` (1 Fehler)
- `tests/onboardingM1BM3.test.ts` (1 Fehler)
- `tests/appointmentM1BM3.test.ts` (4 Fehler)
- `tests/inquiryProfileDisplayOrder.test.ts` (1 Fehler)

**Produktbereich:** Inquiry / Profil-Katalog (M2/M3)

**Bekannte Ursachen (je Suite):**
- `heilmittelverordnungProfile`: Checkpoint-Text in Katalog lautet
  "sind eingegangen", Test erwartet "liegen für die weitere Bearbeitung vor".
- `immunizationM1BM3` / `medicalDocumentsM1BM3`: Checkpoint-Texte in
  `inquiryCheckpointCatalog.ts` geändert, Tests nicht nachgezogen.
- `onboardingM1BM3`: `TECHNICAL_ISSUE` fehlt in `ONBOARDING.availableActionIds`
  (bewusst entfernt oder Versehen – unklar).
- `appointmentM1BM3`: APPOINTMENT-Profil hat 11 statt 10 `specificCheckpointIds`
  (neuer Checkpoint hinzugefügt); `boundActionConditions` für
  BOOK_FINDINGS_REVIEW/CHECKUP_SECOND/CHRONIC_CONTROL enthält zusätzliche
  `APPOINTMENT_TYPE_QUESTION`-Bedingung.
- `inquiryProfileDisplayOrder`: HEILMITTELVERORDNUNG (displayOrder=55) nachträglich
  als 14. Profil eingefügt; Test-Erwartungsliste kennt nur 13 Profile.

**Warum zurückgestellt:**  
Textänderungen und Profilstruktur-Erweiterungen wurden ohne Test-Synchronisierung
eingecheckt. Korrektheit der neuen Texte / Strukturen muss fachlich bestätigt
werden, bevor Tests angepasst werden.

**Wann erneut untersuchen:**  
Bei Arbeit am jeweiligen Profil (HEILMITTELVERORDNUNG, IMMUNIZATION,
MEDICAL_DOCUMENTS, ONBOARDING, APPOINTMENT).

---

## Gruppe 4 – Questionnaire Block-Ordnung und i18n

**Status:** `NEEDS_DECISION`  
**Build-Blocker:** Nein

**Betroffene Suites:**
- `tests/patientQuestionnaireDeduplizierung.test.ts` (2 Fehler)
- `tests/qTokenPageI18n.test.tsx` (1 Fehler)

**Produktbereich:** Questionnaire / Fragebogen-Blöcke

**Bekannte Ursachen:**
- `patientQuestionnaireDeduplizierung`: Tests erwarten HEILMITTELVERORDNUNG bei
  `displayOrder ≈ 9` (zwischen VERSICHERUNG und KONTAKT). Tatsächlich:
  `HEILMITTELVERORDNUNG.displayOrder = 100`, `KONTAKT.displayOrder = 20`,
  `VERSICHERUNG.displayOrder = 50`. Die geplante Ordnung im Test-Kommentar
  stimmt nicht mit dem Katalog überein.
- `qTokenPageI18n`: Test erwartet englische Übersetzung von `ANAMNESE_GP`
  ("Do you have a general practitioner") – vermutlich stimmt entweder die
  Test-Mock-Session oder die `text_en`-Formulierung nicht mit der Erwartung
  überein.

**Warum zurückgestellt:**  
Die korrekte Block-Reihenfolge für den Fragebogen muss fachlich definiert werden.
`displayOrder`-Werte in `blockCatalog.ts` und die Test-Erwartungen widersprechen
sich. Die i18n-Assertion muss zusammen mit dem Fragebogen-Übersetzungs-Feature
untersucht werden.

**Wann erneut untersuchen:**  
Beim nächsten Arbeitspaket zur Fragebogen-Reihenfolge oder i18n-Unterstützung.

---

## Gruppe 5 – Office Compliance Footer (Link-Rendering)

**Status:** `NEEDS_DECISION`  
**Build-Blocker:** Nein

**Betroffene Suites:**
- `tests/officeComplianceFooter.test.tsx` (1 Fehler)

**Produktbereich:** Office / Compliance

**Bekannte Ursache:**  
`components/office/OfficeComplianceFooter.tsx` rendert Rechtsquellen als `<span>`
ohne klickbaren Link. Der Test erwartet `<a href="...">` mit `target="_blank"` und
`rel="noreferrer noopener"`. Der `sourceUrl`-Wert ist im Datenmodell (`LegalSource`)
vorhanden, wird von der Komponente aber nicht verwendet.

**Warum zurückgestellt:**  
Unklar, ob die Links absichtlich entfernt wurden (z. B. UX-Entscheidung oder
Sicherheitsüberlegung) oder ob es ein Versehen ist. Fachliche Rückfrage
erforderlich.

**Wann erneut untersuchen:**  
Beim nächsten Arbeitspaket am Office-Compliance-Bereich.

---

## Gruppe 6 – TypeScript-Typfehler in Workflow/Internal-Protocol-Tests

**Status:** `DEFERRED`  
**Build-Blocker:** Nein (nur `tsc --noEmit`; `next build` ignoriert Test-Dateien)

**Betroffene Suites / Dateien (via `npm run typecheck`):**
- `tests/internalProtocolSourceLoader.test.ts` (7 Fehler, TS2345)
- `tests/internalProtocolNarrative.test.ts` (2 Fehler, TS2339)
- `tests/internalProtocolProcessMode.test.ts` (1 Fehler, TS2367)
- `tests/internalProtocolQuestions.test.ts` (2 Fehler, TS2352)

**Produktbereich:** Workflow / Internal Protocol

**Bekannte Ursachen:**
- `internalProtocolSourceLoader`: `SessionPractice`-Typ um Pflichtfelder erweitert
  (`slug`, `name`, `is_approved`, `inquiry_assistant_enabled` + weitere). Test-Fixtures
  verwenden noch die alte, kürzere Form `{ id: string; current_practice: { id: string } }`.
- `internalProtocolNarrative`: `ProtocolQuestion`-Union enthält nicht mehr auf
  allen Varianten ein `options`-Feld; Testzugriff auf `q.options` schlägt fehl.
- `internalProtocolProcessMode`: TS2367-Vergleich zweier nicht-überlappender
  String-Literal-Typen (`"CURRENT_STATE"` vs. `"TARGET_STATE"`).
- `internalProtocolQuestions`: `as ProtocolQuestion`-Casts zu eng; Lösung: `as unknown as ProtocolQuestion`.

**Warum zurückgestellt:**  
Produktcode für `SessionPractice` und `ProtocolQuestion` wurde legitim erweitert.
Die Test-Fixtures und -Casts spiegeln die neuen Typen noch nicht wider.
Reparatur ist rein mechanisch, erfordert aber Kenntnis des Internal-Protocol-Bereichs.

**Wann erneut untersuchen:**  
Beim nächsten Arbeitspaket am Workflow / Internal-Protocol-Feature.

---

## Gruppe 7 – TDD: Onboarding M2 Section Intro Migration

**Status:** `TDD`  
**Build-Blocker:** Nein

**Betroffene Suites:**
- `tests/m2OnboardingNoDuplicateAccordions.test.ts` (1 Fehler)

**Produktbereich:** Inquiry / M2 / Onboarding

**Bekannte Ursache:**  
Der Test prüft, ob `InquiryM2Client.tsx` einen `ONBOARDING`-Eintrag in
`SECTION_INTRO_GROUPS_BY_PROFILE`, eine `OnboardingSpecificSection`-Funktion
und einen End-Marker-Kommentar enthält. Diese Strukturen existieren absichtlich
noch nicht – der Test ist ein Vorwärts-Kontrakt für die geplante Migration des
ONBOARDING-Profils von flachen Accordions zu `ProfileSectionIntroDrawers`.

**Warum zurückgestellt:**  
Feature noch nicht implementiert. Test läuft absichtlich rot als TDD-Marker.

**Wann erneut untersuchen:**  
Wenn die ONBOARDING-M2-Migration gestartet wird.

---

*Historischer Stand ursprünglich verifiziert: 2026-08-16*
*Bereinigung und grüner Gesamtstand verifiziert: 2026-08-30*
