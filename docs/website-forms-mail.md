# Website-Forms — Mail-Transport (`MAIL_TRANSPORT`)

Phase 3d. Diese Doku beschreibt die ENV-Variable `MAIL_TRANSPORT`, das aktuelle
Verhalten des Mail-Layers und die Begründung, warum SMTP in dieser
Hardening-Phase **bewusst nicht** aktiviert wird.

Source of Truth ist `lib/mail/sendWebsiteFormConfirmationEmail.ts`. Diese Doku
darf von dort nicht abweichen.

---

## Zweck

Beim Submit eines öffentlichen Website-Formulars (`POST /api/p/[slug]/submit`)
wird eine `PatientQuestionnaireSession` mit Status
`awaiting_email_confirmation` angelegt und ein Bestätigungs-Token erzeugt
(Klartext nur in der URL der Bestätigungs-Mail, in der DB ausschließlich der
SHA-256-Hash). Der Mail-Layer ist dafür zuständig, dem Patienten / der
Patientin diese Bestätigungs-URL zuzustellen.

`MAIL_TRANSPORT` wählt aus, **wie** das passiert.

## Unterstützte Werte

| Wert      | Verhalten                                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `console` | Default. Es wird **keine** echte E-Mail versendet. Stattdessen schreibt der Server einen `console.info`-Eintrag mit Empfänger, Subject und Bestätigungs-URL. Geeignet für Dev, Test und Pilotbetrieb mit Log-Zugriff.                              |
| _andere_  | Identisches Verhalten wie `console`, zusätzlich eine Warnung im Server-Log (`[mail] Unbekannter MAIL_TRANSPORT="…" – fällt auf console zurück.`). Defensives Fallback, damit ein Tippfehler oder ein nicht-gepatchter Deploy keinen Stillstand erzeugt. |

Es gibt in Phase 3d **keinen** echten SMTP- oder HTTP-Transport. Siehe Abschnitt
[„SMTP-Entscheidung"](#smtp-entscheidung).

## Daten in der Mail

Die Bestätigungs-Mail enthält ausschließlich:

- die Bestätigungs-URL (`/p/confirm/<klartext-token>`) — der Klartext-Token
  existiert nur dort, niemals in der DB,
- einen statischen Hinweistext (Subject, Erklärung der 48-h-Gültigkeit, „falls
  Sie das Formular nicht abgesendet haben, ignorieren Sie diese Mail").

Bewusst **nicht** in der Mail enthalten:

- keine der eingereichten Antworten,
- kein Praxis-/Account-Identifier,
- keine personenbezogenen Daten außerhalb der Empfänger-Adresse selbst.

Auch im `console`-Log werden **nur** Empfänger, Subject und URL geloggt — keine
Antworten, keine DB-IDs, keine Hashes.

## Operatives Verhalten bei Fehlern

Wenn `sendWebsiteFormConfirmationEmail(...)` fehlschlägt, gilt:

- die Session bleibt in der DB als `awaiting_email_confirmation`,
- der Submit-Endpoint loggt den Fehler strukturiert
  (`[website-form/submit] outcome=mail_failed`, siehe
  [`website-forms-operations.md`](./website-forms-operations.md)) und liefert
  trotzdem den generischen Erfolgs-Redirect, damit kein Detail nach außen
  leakt,
- die Session läuft nach 48 h ab und wird beim nächsten Lauf des
  `cleanup-unconfirmed-website-submits.mjs`-Skripts entfernt.

Es gibt **kein** automatisches Retry und **kein** Resend-Skript. Begründung:
Klartext-Empfängeradresse und Klartext-Token werden bewusst nicht persistiert;
ein erneuter Versand würde einen neuen Token + manuell mitgegebene
Empfängeradresse benötigen und damit zwingend ein neues Feature darstellen.
Patient:innen, die keine Mail erhalten, müssen das Formular erneut absenden.

## SMTP-Entscheidung

Stand Phase 3d: **SMTP wird nicht aktiviert. Default `console` bleibt.**

Begründung:

- Phase 3d wurde explizit als „Mail-Layer minimal halten, console-Default"
  geplant. Ein echter SMTP-Transport wäre ein neues Produktfeature und damit
  außerhalb des Scopes einer reinen Review-/Hardening-Phase.
- Echtes SMTP bringt eigene Betriebsthemen mit, die nicht nebenbei in einer
  Hardening-Phase entschieden werden sollten:
  - Provider-Auswahl und Vertrag (AVV nach DSGVO),
  - Secrets-Handling (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, …),
  - Domain-Reputation (SPF, DKIM, DMARC),
  - Bounce-/Complaint-Handling,
  - Logging-Sensitivität (Empfänger-Adresse darf nicht in Log-Aggregatoren
    landen, die nicht datenschutzkonform betrieben werden).
- Für einen kontrollierten Pilotbetrieb mit einer Testpraxis genügt
  `MAIL_TRANSPORT=console`, sofern jemand operativ Zugriff auf die Server-Logs
  hat und die Bestätigungs-URL bei Bedarf manuell zustellt — alternativ wird
  der Pilotbetrieb so lange ausgesetzt, bis SMTP in einer eigenen Phase als
  Feature eingeführt wird.

### Offene Punkte für eine spätere SMTP-Aktivierung

Diese Liste ist nicht Teil von Phase 3d, sondern Vorbereitung für eine künftige
Phase:

- ENV-Schema für SMTP (`MAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`).
- Auswahl einer Mail-Library (z. B. `nodemailer`) und Sicherheitsprüfung
  (Versionspinning, Vulnerability-Check).
- Entscheidung Header-`From`/`Reply-To` (Praxis-Adresse vs. Plattform-Adresse).
- Fehler-Klassen: temporärer Bounce vs. permanenter Bounce vs. Throttling —
  und was davon den Submit-Endpoint sehen darf (Empfehlung: nichts, Logs
  reichen).
- Datenschutz-Folgenabschätzung für die Speicherung der Empfängeradresse beim
  Provider.
- Erst dann ggf. ein dediziertes Resend-/Retry-Verfahren.

## Verweise

- Code: [`lib/mail/sendWebsiteFormConfirmationEmail.ts`](../lib/mail/sendWebsiteFormConfirmationEmail.ts)
- Submit-Endpoint: [`app/api/p/[slug]/submit/route.ts`](../app/api/p/%5Bslug%5D/submit/route.ts)
- Confirm-Route: [`app/p/confirm/[token]/page.tsx`](../app/p/confirm/%5Btoken%5D/page.tsx)
- Cleanup-Skript: [`scripts/cleanup-unconfirmed-website-submits.mjs`](../scripts/cleanup-unconfirmed-website-submits.mjs)
- Betrieb / Logs: [`website-forms-operations.md`](./website-forms-operations.md)
- ENV-Beispiel: [`.env.example`](../.env.example)
