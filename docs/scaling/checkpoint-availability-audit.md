# Checkpoint Availability Audit

Audit-Grundlage für spätere praxisspezifische Checkpoint-Deaktivierung.  
Stand: Mai 2026. Kein Produktcode — reine Planungsgrundlage.

---

## 1. Ziel

Praxen sollen aus den vorhandenen System-Checkpoints auswählen können, welche in ihrem Account nicht angezeigt werden — weil das Angebot nicht existiert, nicht kommuniziert werden soll oder Verwechslungsgefahr besteht.

**Explizit nicht möglich:**
- Praxen erstellen eigene Checkpoints
- Praxen schreiben freie Patiententexte für Core-Checkpoints
- Praxen ändern medizinische Entscheidungslogik
- Praxen verändern `boundActionConditions` oder die Checkpoint-Reihenfolge

Standard: alle Checkpoints aktiv. Deaktivierung ist ein expliziter Opt-out.

---

## 2. Grundprinzip

**Deaktivierung ≠ Löschen**

Deaktivierung betrifft ausschließlich die Verfügbarkeit im Workflow einer Praxis:

- Der Katalog (`inquiryCheckpointCatalog.ts`) bleibt unverändert
- Die medizinische Wahrheit des Checkpoints bleibt unverändert
- Bestehende Sessions und Snapshots bleiben stabil — ein in `checkpoint_statuses` gespeicherter Zustand eines deaktivierten Checkpoints wird beim Rendering ignoriert, aber nicht gelöscht
- Deaktivierung bedeutet: Checkpoint erscheint nicht als auswählbarer Schalter oder Action im Workflow
- Deaktivierung ist keine inhaltliche Änderung, sondern eine Verfügbarkeitsentscheidung

---

## 3. Kategorien

| Kategorie | Bedeutung |
|---|---|
| `DEACTIVATABLE` | Kann pro Praxis deaktiviert werden — beschreibt ein praxisspezifisches Betriebsangebot |
| `CONFIG_CONTROLLED` | Wird bereits durch einen booleschen Praxisparameter gesteuert — keine separate Deaktivierung nötig |
| `CORE_LOCKED` | Darf nicht deaktiviert werden — medizinische, rechtliche oder strukturelle Kernlogik |
| `REVIEW_REQUIRED` | Deaktivierbarkeit unklar — vor einer Freigabe durch medizinisch-fachliche Review |

---

## 4. Potenziell deaktivierbare Checkpoints

### 4a. Plattform und Kanal

| Checkpoint-ID | Kategorie | Warum deaktivierbar | Abhängiger Praxisparameter | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `ONBOARDING_DOCTOLIB_INFO` | `DEACTIVATABLE` | Nur relevant wenn Doctolib als Plattform | `uploadPlatformName` — wenn Plattform wechselt, ist der Text plattformspezifisch | Praxis deaktiviert, obwohl Plattform weiterhin genutzt wird — Patienten kennen sie nicht | Deaktivierbar; bei Plattformwechsel automatisch prüfen |
| `DOCUMENT_UPLOAD` | `REVIEW_REQUIRED` | Nur relevant wenn digitaler Dokumenten-Upload angeboten wird | `uploadPlatformName`, `uploadPlatformAccountLabel` | Upload-Hinweis fehlt bei benötigten Unterlagen | Vor Freigabe prüfen: gibt es Profile ohne Upload-Bedarf? |
| `TECH_VIDEO_NOT_WORKING` | `CONFIG_CONTROLLED` | Nur relevant wenn Videosprechstunde angeboten wird | `videoConsultationOffered: boolean` — bei `false` sollte der Checkpoint automatisch inaktiv sein | Checkpoint bleibt aktiv obwohl keine Video-Sprechstunde — erzeugt Verwirrung | Kein manueller Opt-out nötig; wird durch `videoConsultationOffered` gesteuert |

### 4b. Sprechstunde und digitale Anfrage

| Checkpoint-ID | Kategorie | Warum deaktivierbar | Abhängiger Praxisparameter | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `ACUTE_OPEN_CONSULTATION_ACTION` | `DEACTIVATABLE` | Nur relevant wenn offene Sprechstunde angeboten wird | `openConsultationDays`, `openConsultationHours` | Praxis deaktiviert, obwohl Sprechstunde existiert — Patientenführung bricht ab | Deaktivierbar; Praxis muss aktiv bestätigen, dass Sprechstunde nicht angeboten wird |
| `DIGITAL_REQUEST` | `DEACTIVATABLE` | Nur relevant wenn digitale Anfragen aktiv geschaltet sind | `digitalRequestUrl` — leer wenn nicht aktiv | Praxis deaktiviert, obwohl URL gesetzt ist — inkonsistent | Deaktivierbar; idealerweise automatisch via `digitalRequestUrl = ""` |
| `DIGITAL_REQUEST_PROCESSING_TIME` | `DEACTIVATABLE` | Nur sinnvoll wenn digitale Anfragen aktiv sind | `digitalRequestProcessingTimeMin/Max/Unit` | SLA-Angabe fehlt — Patientenerwartung unklar | Deaktivierbar, aber nur zusammen mit `DIGITAL_REQUEST` |

### 4c. Terminbuchung

| Checkpoint-ID | Kategorie | Warum deaktivierbar | Abhängiger Praxisparameter | Risiko | Empfehlung |
|---|---|---|---|---|---|
| `APPOINTMENT_BOOK_FINDINGS_REVIEW` | `DEACTIVATABLE` | Nur wenn dieser Termintyp im Buchungskalender aktiv ist | `findingsReviewBookingCode` | Buchungscode gesetzt, Checkpoint deaktiviert — Code ist wirkungslos | Deaktivierbar; Code-Feld sollte bei Deaktivierung als ungenutzt markiert werden |
| `APPOINTMENT_BOOK_CHRONIC_CONTROL` | `DEACTIVATABLE` | Nur wenn dieser Termintyp aktiv ist | `chronicControlBookingCode` | s. o. | s. o. |
| `APPOINTMENT_BOOK_CHECKUP_SECOND` | `DEACTIVATABLE` | Nur wenn dieser Termintyp aktiv ist | `checkupSecondBookingCode` | s. o. | s. o. |
| `APPOINTMENT_BOOK_EKG_ORDER` | `DEACTIVATABLE` | Nur wenn EKG-Termintyp aktiv ist | `doctorOrderBookingCode` (geteilt mit LAB_APPOINTMENT_INTERNAL) | Gemeinsamer Code — Deaktivierung von EKG beeinflusst Lab-Checkpoint nicht direkt | Deaktivierbar; Code-Feld bleibt aktiv für Lab-Checkpoint |
| `LAB_APPOINTMENT_INTERNAL` | `DEACTIVATABLE` | Nur wenn interner Labor-Termin über Buchungskalender aktiv ist | `doctorOrderBookingCode` (geteilt mit EKG) | s. o. | Deaktivierbar; Code-Feld bleibt aktiv für EKG-Checkpoint |
| `APPOINTMENT_BOOK_GENERAL` | `REVIEW_REQUIRED` | Fallback-Buchungshinweis — unklar ob praxisspezifisch | `bookingCalendarName` | Praxis deaktiviert generischen Buchungshinweis — Patienten ohne Orientierung | Vor Freigabe prüfen: gibt es Praxen ohne Online-Buchungskalender? |

### 4d. Praxisregeln (boolesch gesteuert)

Die folgenden Checkpoints beschreiben praxisspezifische Leistungsgrenzen, die bereits als boolesche Parameter in `practiceConfig.ts` vorhanden sind. Für sie ist kein separater Deaktivierungs-Opt-out nötig — sie werden direkt durch den Parameterwert gesteuert.

| Checkpoint-ID | Kategorie | Abhängiger Praxisparameter | Anmerkung |
|---|---|---|---|
| `NO_HOME_VISITS` | `CONFIG_CONTROLLED` | `homeVisitsOffered: false` | Checkpoint aktiv wenn `homeVisitsOffered = false` |
| `PRESCRIPTION_NO_POSTAL_DELIVERY` | `CONFIG_CONTROLLED` | `prescriptionPostalDeliveryAllowed: false` | Checkpoint aktiv wenn `false` |
| `ADULTS_ONLY_PRACTICE` | `CONFIG_CONTROLLED` | `adultsOnlyPractice: true` | Checkpoint aktiv wenn `true` |

---

## 5. Nicht deaktivierbare Checkpoint-Gruppen

Diese Checkpoints dürfen unter keinen Umständen deaktiviert werden, unabhängig vom Praxiskontext.

### 5a. DECISION-Checkpoints (alle)

Jeder Checkpoint mit `kind = DECISION` ist der Kern der Antwortgenerierung. Er erzeugt die Hauptaussage (möglich / nicht möglich / unklar). Ohne ihn ist das Profil nicht funktionsfähig.

Beispiele: `AU_DECISION`, `PRESCRIPTION_DECISION`, `LAB_DECISION`, `ACUTE_CARE_DECISION`, alle weiteren `*_DECISION`.

### 5b. Medizinisch-rechtliche Ausschlüsse (`specificRole: EXTERNAL_RESPONSIBILITY`)

Beschreiben gesetzlich oder medizinisch geregelte Zuständigkeitsgrenzen. Eine Praxis darf diese Grenzen nicht unsichtbar machen.

Beispiele: `AU_WORK_ACCIDENT`, `PRESCRIPTION_BTM_ADHS_RULES`, `PRESCRIPTION_GYN_EXCLUSIVITY`.

### 5c. Fehlende Unterlagen / Informationen (`specificRole: MISSING_DOCUMENT | MISSING_INFORMATION`)

Beschreiben fehlende Voraussetzungen. Ohne sie ist die Bearbeitung nicht möglich — der Checkpoint muss sichtbar bleiben, damit Mitarbeiter wissen, was fehlt.

Beispiele: `AU_MISSING_EGK`, `ONBOARDING_DATA_INCOMPLETE`.

### 5d. Medizinische Überprüfung erforderlich (`specificRole: MEDICAL_REVIEW_REQUIRED`)

Weist auf einen ärztlichen Entscheidungsbedarf hin. Deaktivierung würde diesen Hinweis für Mitarbeiter verbergen.

Beispiele: `PRESCRIPTION_DOCTOR_REVIEW_REQUIRED`.

### 5e. Zeit- und Regelgrenzen (`specificRole: RULE_TIME_LIMIT | RULE_COST_COVERAGE`)

Beschreiben gesetzliche oder praxisweite Regelgrenzen (Rückdatierungsfristen, Kassenleistungsgrenzen). Deaktivierung entspräche einer inkorrekten Zusage an den Patienten.

Beispiele: `AU_BACKDATE_LIMIT`, `PRESCRIPTION_PRIVATE_ONLY`, `LAB_SELF_PAYER_IGEL`.

### 5f. Strukturelle Checkpoints (Profil-Integrität)

Checkpoints, deren Deaktivierung das Profil strukturell defekt machen würde (z. B. ein Action-Checkpoint, auf den mehrere `boundActionConditions` zeigen, ohne den die abhängigen Actions nie erscheinen).

---

## 6. Technische Notizen für die spätere Implementierung

**Filterung zuerst nur auf UI-Ebene.** Deaktivierte Checkpoints werden nicht als auswählbarer Schalter oder Action gerendert. Die Renderlogik erhält eine Liste deaktivierter Checkpoint-IDs und überspringt diese.

**Katalog bleibt unverändert.** Kein Checkpoint wird aus `INQUIRY_CHECKPOINT_CATALOG_V2` entfernt.

**Bestehende Snapshots bleiben stabil.** `checkpoint_statuses` ist ein JSON-Blob ohne referenzielle Integrität. Ein gespeicherter Status für einen deaktivierten Checkpoint erzeugt keinen Fehler — er wird beim Rendering übersprungen. Sessions müssen nicht migriert werden.

**`boundActionConditions` müssen beim Laden validiert werden.** Wenn ein Checkpoint, auf den eine Bedingung zeigt, deaktiviert ist, wird die abhängige Action nie sichtbar. Das ist kein Fehler, aber ein potenziell unerwartetes Verhalten, das beim Konfigurieren einer Praxis geprüft werden muss.

**Keine Rückwirkung auf History-Ansichten.** Wenn ein Checkpoint nach einer Session deaktiviert wird, muss der History-Renderer einen Fallback-Label anzeigen: z. B. „[Checkpoint nicht aktiv in dieser Praxis]" statt Fehler.

**Gemeinsam genutzte Buchungscodes prüfen.** `doctorOrderBookingCode` wird von `APPOINTMENT_BOOK_EKG_ORDER` und `LAB_APPOINTMENT_INTERNAL` geteilt. Wird einer der beiden Checkpoints deaktiviert, bleibt der Code für den anderen weiterhin aktiv — kein Problem, muss aber in der UI-Oberfläche des Adminbereichs sichtbar sein.

---

## 7. Anti-Patterns

- **Praxis erstellt eigene Checkpoints** — nicht vorgesehen, nicht gebaut
- **Praxis deaktiviert `*_DECISION`-Checkpoints** — technisch blockieren
- **Deaktivierung als medizinische Entscheidung** — z. B. `PRESCRIPTION_DOCTOR_REVIEW_REQUIRED` deaktivieren, weil die Praxis keine Reviews durchführen möchte — verboten
- **Profil kaputt konfigurieren** — Checkpoint deaktivieren, auf den mehrere Conditions zeigen, ohne die das Profil unvollständig wird — Validierung erforderlich
- **Versteckte Defaults** — eine neue Praxis darf nie von einem stillschweigend deaktivierten Checkpoint betroffen sein; Standard ist immer „alles aktiv"
- **Rückwirkende Änderung gespeicherter Sessions** — Deaktivierung darf gespeicherte Snapshots nicht verändern oder löschen

---

## 8. Empfohlene Implementierungsreihenfolge

1. **Jetzt (dieser Stand):** Audit dokumentiert. Keine Codeänderung.

2. **Nächster Schritt:** Statische Klassifizierungsliste (`DEACTIVATABLE` / `CONFIG_CONTROLLED` / `CORE_LOCKED`) als Kommentar-Annotation im Checkpoint-Katalog oder als separate Konstante hinterlegen. Keine Laufzeitwirkung.

3. **Dann:** Optionales Feld `disabledCheckpointIds?: readonly string[]` in `PracticeInquiryConfig` einführen. Pilot-Config: leeres Array. Noch keine Renderlogik.

4. **Dann:** Renderlogik an einer Stelle erweitern, die die Liste auswertet. Kein Builder, kein Runtime-Generator.

5. **Zuletzt:** Admin-UI-Formular für das Feld — nur für Checkpoints der Kategorie `DEACTIVATABLE`.
