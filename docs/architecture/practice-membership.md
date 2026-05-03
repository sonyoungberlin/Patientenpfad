# Practice / Membership — Architektur-Dokument (Phase P0)

Status: **Entwurf, akzeptiert als Planungsgrundlage.**
Phase: **P0 — nur Doku.** Keine Prisma-Migration, keine Routen-, UI- oder Test-Änderungen.

Dieses Dokument hält das Zielmodell und die geplanten Umbauphasen fest. Es ist die Referenz für alle nachfolgenden PRs (P1–P6). Spätere Phasen dürfen dieses Dokument fortschreiben, aber das Zielmodell und die Leitentscheidungen sind bewusst stabil zu halten.

---

## 1. Leitentscheidungen

Diese Entscheidungen sind getroffen und werden in den Folgephasen nicht erneut diskutiert:

- **Practice = Mandant.** Eine Praxis ist die fachliche und datenrechtliche Einheit. Alle medizinisch oder organisatorisch geteilten Ressourcen (Fragebogen-Sessions, Website-Formulare, Mail-Konfiguration, Feature-Flags) gehören zur Practice.
- **Account = Login/Nutzer.** Ein Account ist eine Person mit Zugangsdaten. Ein Account selbst „besitzt" keine Praxisdaten mehr.
- **PracticeMembership = Rolle/Zugriff.** Die Beziehung „dieser Account darf in jener Praxis arbeiten, mit dieser Rolle" ist eine eigene Entität.
- **Kein Admin-Bypass.** Das Plattform-Admin-Flag (`Account.is_admin`) öffnet ausschließlich die Plattform-Admin-Routen unter `/admin/*`. Es gewährt **keinen** lesenden oder schreibenden Zugriff auf Praxisdaten. Auch Plattform-Admins benötigen eine Membership, um Praxisdaten zu sehen.
- **SMTP gehört zur Practice, nicht zum Account.** Mailversand-Konfiguration (Server, Absender, Anzeigename, Reply-To, …) wird in einer späteren Phase an `Practice` modelliert. Es wird kein SMTP am Account eingeführt — auch nicht übergangsweise.
- **Kein ENV-Slug-Mapping als Dauerlösung.** Die Zuordnung „Slug → Praxis" wird ausschließlich über DB-Felder (`Practice` / `PracticeQuestionnaireForm`) abgebildet. Es wird keine ENV-Variable als persistentes Mapping eingeführt.

---

## 2. Ziel-Datenmodell

Drei Konzepte; alles andere bleibt namentlich erhalten und tauscht nur seinen Owner-Fremdschlüssel.

### 2.1 `Practice` (neu)

Der Mandant. Trägt alle praxis-weiten Einstellungen.

- `id` (cuid)
- `name` — Anzeigename, freier Text
- `slug` — global eindeutiger, URL-/admin-tauglicher Bezeichner; perspektivisch für Branding/öffentliche Praxis-Seite nutzbar
- `is_approved` (vormals `Account.is_approved`)
- `inquiry_assistant_enabled` (vormals `Account.*`)
- `patient_communication_enabled` (vormals `Account.*`)
- `website_forms_enabled` (vormals `Account.*`)
- `created_at`, `updated_at`
- Backrelations: `memberships`, `cases`, `inquiry_sessions`, `patient_questionnaire_sessions`, `practice_questionnaire_forms`

> **Reserviert, aber in P0 nicht modelliert:** SMTP-Felder (Host, Port, Auth, Absender, Reply-To, KIM-Adresse, Briefkopf, Logo). Werden in einem eigenen späteren Vorhaben *nach* P5 ergänzt — nicht im Rahmen dieses Umbaus.

### 2.2 `PracticeMembership` (neu)

Die m:n-Beziehung zwischen Account und Practice mit Rolle.

- `id` (cuid)
- `account_id` → `Account.id`, `onDelete: Cascade` (wenn der Login gelöscht wird, verschwindet die Mitgliedschaft; die Praxisdaten bleiben)
- `practice_id` → `Practice.id`, `onDelete: Cascade`
- `role` — Enum `PracticeRole`, siehe §3
- `created_at`, `updated_at`
- `@@unique([account_id, practice_id])` — pro Paar genau eine Rolle
- `@@index([practice_id, role])`

### 2.3 `Account` (Bestand, abgespeckt)

Behält ausschließlich Login- und persönliche Felder.

- `id`, `email` (unique), `is_admin` (**Plattform**-Admin der Hostingbetreiberin, **kein** Praxis-Admin), `createdAt`, `updatedAt`
- `message_signature` — bleibt vorerst personenbezogen (Produktentscheid bewusst aufgeschoben)
- Relations: `sessions`, `memberships`
- **Entfällt nach Migration:** `is_approved`, `inquiry_assistant_enabled`, `patient_communication_enabled`, `website_forms_enabled` und alle direkten Owner-Backrelations zu Praxisdaten.

### 2.4 Owner-FK-Umstellung

Alle bisher `owner_account_id` werden zu `owner_practice_id`. Vier Tabellen sind betroffen:

| Tabelle                         | Heute (`owner_account_id`) | Ziel (`owner_practice_id`) | Cascade-Verhalten |
|---------------------------------|----------------------------|----------------------------|-------------------|
| `CaseSession`                   | nullable                   | nullable                   | `SetNull` (Bestands-/Gastfälle) |
| `InquirySession`                | nullable                   | nullable                   | `SetNull` |
| `PatientQuestionnaireSession`   | NOT NULL                   | NOT NULL                   | `Restrict` (medizinisch dokumentationspflichtig) |
| `PracticeQuestionnaireForm`     | NOT NULL                   | NOT NULL                   | `Restrict` |

Indexe `(owner_account_id, createdAt)` werden auf `(owner_practice_id, createdAt)` umgestellt.

### 2.5 Bewusst **nicht** umgestellt

- `Session` (Browser-Session) — gehört zum Login, kein Mandant.
- `PrefillRun.created_by_account_id` — Personen-Audit („wer hat eingefroren"), kein Mandanten-FK. Bleibt am Account.
- `Account.is_admin` — Plattform-Rolle.
- `Account.message_signature` — Produktentscheid offen, bleibt vorerst Status quo.

---

## 3. Rollenmodell (minimal)

```
enum PracticeRole { OWNER, ADMIN, USER }
```

- **OWNER** — Praxis-Eigner:in. Mindestens **eine** OWNER-Rolle pro Practice ist Pflicht (Service-Layer-Constraint, ggf. später DB-CHECK). Darf alles, inkl. Practice umbenennen, OWNER-Rolle übertragen, Practice löschen.
- **ADMIN** — Praxis-Admin. Verwaltet Memberships (außer OWNER-Entzug für sich selbst, wenn dadurch der letzte OWNER wegfiele) und Praxis-Einstellungen (später inkl. SMTP). Verwaltet Website-Formulare und Feature-spezifische Konfiguration.
- **USER** — Arzt:in, MFA. Darf alle fachlichen Flows lesen/schreiben (Cases, Patientenfragebögen, Inquiry-Sessions) im Rahmen der Practice-Feature-Flags. Keine Membership- oder Praxis-Einstellungs-Rechte.

**Kapselung:** Berechtigungen werden über Rollen-Sets abgefragt (`requirePracticeRole(req, ['OWNER','ADMIN'])`), niemals per String-Vergleich verstreut. So sind spätere Rollen ohne Refactor ergänzbar.

**Zur Klarstellung: Plattform-Admin ≠ Praxis-Admin.** Ein Account mit `is_admin = true` darf `/admin/*` bedienen, aber ohne Membership *keine* Praxisdaten sehen oder schreiben.

---

## 4. Betroffene Tabellen / Felder (Übersicht)

| Tabelle                         | Heute                                                                                                              | Ziel                                                                 |
|---------------------------------|--------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| `Account`                       | `is_approved`, `is_admin`, `inquiry_assistant_enabled`, `patient_communication_enabled`, `website_forms_enabled`, `message_signature` + Owner-Backrelations | `email`, `is_admin`, `message_signature`; Backrelations: `sessions`, `memberships` |
| `Session`                       | unverändert                                                                                                        | unverändert                                                          |
| `Practice` *(neu)*              | —                                                                                                                  | `id`, `name`, `slug`, `is_approved`, `*_enabled`, Timestamps         |
| `PracticeMembership` *(neu)*    | —                                                                                                                  | `id`, `account_id`, `practice_id`, `role`, Timestamps                |
| `CaseSession`                   | `owner_account_id?`                                                                                                | `owner_practice_id?`                                                 |
| `InquirySession`                | `owner_account_id?`                                                                                                | `owner_practice_id?`                                                 |
| `PatientQuestionnaireSession`   | `owner_account_id` NOT NULL + Index                                                                                | `owner_practice_id` NOT NULL + Index                                 |
| `PracticeQuestionnaireForm`     | `owner_account_id` NOT NULL + Index                                                                                | `owner_practice_id` NOT NULL + Index                                 |
| `PrefillRun`                    | `created_by_account_id?` (Personen-Audit)                                                                          | unverändert                                                          |

---

## 5. Migrationsphasen P1–P6

Jede Phase ist **ein** PR mit klarem Rollback-Pfad. Ziel: zu jeder Zeit lauffähig, kein Datenverlust, keine Downtime.

### Phase P1 — Additive Schemamigration + Backfill

- Neue Tabellen `Practice`, `PracticeMembership`, Enum `PracticeRole` anlegen.
- Auf den 4 Owner-Tabellen `owner_practice_id` *zusätzlich* zur bestehenden `owner_account_id` als nullable Spalte einführen. Neue Indexe additiv.
- `Practice`-Spalten `is_approved` und `*_enabled` mit Default `false` anlegen.
- **Datenbackfill** (idempotent, in derselben Migration):
  - Pro `Account` eine `Practice` erzeugen: `name = email`, `slug = slugify(email) + "-" + shortId`. Carry-Over der Flags `is_approved`, `inquiry_assistant_enabled`, `patient_communication_enabled`, `website_forms_enabled` 1:1 vom Account auf die Practice.
  - Pro Account eine `PracticeMembership` mit `role = OWNER` zur frisch erzeugten Practice.
  - Für jede der 4 Owner-Tabellen: `owner_practice_id` aus der eindeutigen OWNER-Membership zum bisherigen `owner_account_id` ableiten.
- **Verifikation am Migrationsende:** Für jede der 4 Tabellen muss
  `COUNT(*) WHERE owner_account_id IS NOT NULL AND owner_practice_id IS NULL = 0` gelten. Bei Verstoß: Migration mit `RAISE EXCEPTION` abbrechen.
- **App-Logik bleibt unverändert.** Lesepfade laufen weiter über `owner_account_id` und Account-Flags.

### Phase P2 — Auth-Layer auf Membership umstellen

- `SessionAccount` um `memberships` und `current_practice` erweitern.
- Neue Helfer `getCurrentPractice(account)` und `requirePracticeRole(req, allowedRoles, opts?)`.
- Bestehende `requireApprovedAccount`, `requirePatientCommunicationAccess`, `requireWebsiteForms*` werden Wrapper, die ihre Flags aus `current_practice` lesen statt aus dem Account.
- Registrierung (`POST /api/auth/register`) legt zusätzlich Practice + OWNER-Membership in derselben Transaktion an.
- Übergangs-Invariante: jeder Account hat genau **eine** Membership (1:1-Mapping aus dem Backfill).

### Phase P3 — Datenpfade auf `owner_practice_id` umstellen

Sub-PRs in dieser Reihenfolge, jeweils klein, jeder mit Doppelschreiben auf die alte Spalte zur Sicherheit bis P5:

- **P3a:** `PracticeQuestionnaireForm`-Pfade (CRUD + öffentliche Submit-Route).
- **P3b:** `PatientQuestionnaireSession`-Pfade (`/questionnaires`, `/api/questionnaire*`).
- **P3c:** `CaseSession`-Pfade.
- **P3d:** `InquirySession`-Pfade.

Pro Sub-PR: alle Owner-Filter umstellen, betroffene Tests aktualisieren. Konvention beibehalten: `notFound()` statt 403 für fremde IDs.

### Phase P4 — Admin- und Member-UI

- **Plattform-Admin:** `/admin/practices` als Hauptansicht (Liste der Practices, Mitglieder, Feature-Flags). `/admin/accounts` bleibt als Untersicht zur Login-Sperre erhalten.
- **Praxis-Admin:** `/practice/members` für ADMIN+OWNER der jeweiligen Practice (Mitglied hinzufügen, Rolle ändern, entfernen).
- **Header:** Anzeige der aktuell aktiven Practice (im Pilot statisch).

### Phase P5 — Constraints anziehen

- `owner_practice_id` auf `PatientQuestionnaireSession` und `PracticeQuestionnaireForm` auf `NOT NULL` setzen (nach Verifikation, dass keine NULL-Zeilen existieren).
- Alte `(owner_account_id, createdAt)`-Indexe droppen.
- Doppelschreiben auf die alten Spalten in den Service-Layern abschalten.

### Phase P6 — Cleanup

- Spalten `owner_account_id` aus den 4 Tabellen droppen.
- Account-Spalten `is_approved`, `inquiry_assistant_enabled`, `patient_communication_enabled`, `website_forms_enabled` droppen.
- Account-seitige Backrelations zu Praxisdaten entfernen.
- Letzte Code-Reste, die noch auf `account.is_approved` o. ä. zugreifen, entfernen.

> **Faustregel:** P1 + P2 + P3 sind die produktiven Risikoschritte. P4 ist UI-Polish. P5 + P6 sind Aufräumen.

---

## 6. Pilotpraxis und Test-Accounts

Da heute jeder Account *faktisch* einer Praxis entspricht, mappt der Backfill aus P1 sauber 1:1.

1. **Backfill** (Teil der P1-Migration, idempotent): jeder Account → eine Practice + OWNER-Membership; alle Owner-FKs werden remappt.
2. **Verifikation** in der Migration (siehe P1).
3. **Manuelle Politur** nach dem Cutover (optional, separates kleines Skript oder UI-Aktion):
   - Pilot-Practice umbenennen (`name`, `slug` sprechend setzen, z. B. `praxis-musterstadt`).
   - Weitere Logins für MFA/Ärzt:innen anlegen und der Pilot-Practice als `ADMIN`/`USER` hinzufügen — **nicht mehr** denselben Account teilen.
4. **Kommunikation:** Pilotpraxis vorab informieren, dass nach dem Cutover je Person ein eigener Login angelegt werden muss.

---

## 7. Brüche und Gegenmaßnahmen (Übersicht)

| Flow                                                | Risiko                                                                  | Gegenmaßnahme                                                                 |
|-----------------------------------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| Login / `SessionAccount`                            | Form ändert sich (Flags weg, Memberships dazu)                          | Übergangsweise alte Felder als `@deprecated` aus `current_practice` befüllen  |
| Registrierung                                       | Legt heute nur Account an                                               | P2: zusätzlich Practice + OWNER-Membership in einer Transaktion               |
| Admin-Approve (`PATCH /api/admin/accounts`)         | Toggelt heute Account-Flags                                             | Auf `Practice`-Flags umstellen; in Übergangsphase optional doppelt schreiben  |
| Owner-Filter `where: { owner_account_id }`          | Breit gestreut im Codebase                                              | Zentraler `byCurrentPractice`-Helfer; pro Sub-PR ersetzen                     |
| `canSeeQuestionnaire`                               | Vergleicht Account-IDs                                                  | Vergleicht Practice-IDs                                                       |
| Patientenroute `/p/[slug]`                          | Form-Slug ≠ Practice-Slug — Verwechslungsgefahr                         | Naming klar dokumentieren                                                     |
| Plattform-Admins                                    | Erwartung „Admin sieht alles"                                           | Explizit dokumentieren: kein Bypass; Admins brauchen Membership               |
| `message_signature`                                 | Produktentscheid offen                                                  | Bleibt vorerst am Account                                                     |

---

## 8. Teststrategie

Schichtenweise; jede Phase grün, bevor die nächste startet.

- **Schema-/Backfill-Tests** (vor Code-Cutover): Migration auf Pilot-DB-Kopie, Zähler vor/nach, Idempotenz, Verifikations-Queries.
- **Unit-Tests:** `requirePracticeRole`-Matrix `{kein Login, eingeloggt ohne Membership, USER, ADMIN, OWNER}` × `{erlaubte Rollen}`. `canSeeQuestionnaire` mit Practice-IDs. Backfill-Mapper als pure function.
- **Routen-/Integrationstests:** Bestehende Owner-Tests auf `practice_id` umstellen; **Cross-Tenant-Isolation** als neuer Test (Account aus Practice B greift auf Ressource aus Practice A → `notFound()` auf jeder Schicht); **„Plattform-Admin ohne Membership darf nicht"** als expliziter Test.
- **Server-Component-Pages:** vorhandenes `renderToStaticMarkup`-Pattern mit Practice-Setup statt Account-Setup parametrisieren.
- **Doppelschreib-Phase (P3–P5):** zusätzliche Tests, die alte und neue Owner-Spalte konsistent bestätigen.
- **Manuelle Acceptance vor Cutover:** Pilot-Account sieht *exakt* dieselbe Liste wie vorher; Plattform-Admin sieht in `/admin/practices` die migrierten Practices.

---

## 9. Out of Scope (bewusst nicht in diesem Vorhaben)

Nicht Teil von P0–P6. Wird separat geplant, sonst wird der Scope unbeherrschbar:

- **Mandantenfähiger SMTP / E-Mail-Versand pro Practice** — eigenes Vorhaben *nach* P5. SMTP-Felder werden in P1 bewusst noch nicht angelegt.
- **ENV-Slug-Mapping** als persistente Lösung — explizit verworfen. Slugs leben in der DB.
- **Praxis-Wechsler-UI** für Accounts mit mehreren Memberships — Schema unterstützt es, UI wird erst gebaut, wenn ein echter Use-Case auftritt.
- **Granulare Rollen** jenseits OWNER/ADMIN/USER (z. B. „read-only Vertretung", „Abrechnung").
- **Self-Service-Einladungs-Flow per E-Mail-Token.** Im Pilot werden Mitglieder über das Plattform-Admin-UI manuell hinzugefügt.
- **Audit-Log für Membership-/Rollen-Änderungen.**
- **DB-CHECK-Constraint** für „mind. 1 OWNER pro Practice" — Service-Layer reicht im Pilot.
- **Praxis-Stammdaten** (Adresse, KIM, IK-Nr., Briefkopf, Logo) — kommen mit dem SMTP-/Branding-Vorhaben.
- **Migration `message_signature` von Account auf Practice** — Produktentscheid offen.
- **OWNER-Übertragung / Praxis-Löschung** als Self-Service-UI — nur Plattform-Admin im Notfall.
- **Praxis-Bypass für Plattform-Admins** — explizit ausgeschlossen, jetzt und in Folgephasen.

---

## 10. Tickets-Skizze (Backlog)

- **T1 (P0, dieses Dokument):** Architektur-Doku einchecken. ✅
- **T2 (P1):** Prisma-Migration `add_practice_and_membership` + Backfill + Tests.
- **T3 (P2):** Auth-Layer + `requirePracticeRole` + Registrierung legt Practice + OWNER an.
- **T4–T7 (P3a–d):** je ein Sub-PR pro Datenbereich (Forms → Sessions → Cases → Inquiries).
- **T8 (P4a):** `/admin/practices`.
- **T9 (P4b):** `/practice/members`.
- **T10 (P5):** NOT-NULL-Migration, alte Indexe weg, Doppelschreib aus.
- **T11 (P6):** Cleanup-Migration + Code-Cleanup.
