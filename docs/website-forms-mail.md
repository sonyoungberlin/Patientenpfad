# Website-Forms — Mail-Transport (`MAIL_TRANSPORT`)

Diese Doku beschreibt die ENV-Variable `MAIL_TRANSPORT`, das Verhalten des
Mail-Layers und die SMTP-Konfiguration für den Produktivbetrieb.

Source of Truth ist `lib/mail/sendWebsiteFormConfirmationEmail.ts` zusammen
mit `lib/mail/smtpTransport.ts`. Diese Doku darf von dort nicht abweichen.

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
| `console` | Default. Auch aktiv, wenn die Variable nicht gesetzt oder explizit `console` ist. Es wird **keine** echte E-Mail versendet. Stattdessen schreibt der Server einen `console.info`-Eintrag mit Empfänger, Subject und Bestätigungs-URL. Geeignet für Dev und Test. |
| `smtp`    | Versendet eine echte E-Mail über einen SMTP-Server. Erfordert die SMTP-Variablen (siehe unten). Bei fehlender oder ungültiger Konfiguration wird **geworfen** — es gibt **keinen** stillen Fallback auf `console`.                                |
| _andere_  | Defensives Fallback: identisches Verhalten wie `console`, zusätzlich eine Warnung im Server-Log (`[mail] Unbekannter MAIL_TRANSPORT="…" – fällt auf console zurück.`).                                                                            |

## SMTP-Konfiguration

Wird ausschließlich gelesen, wenn `MAIL_TRANSPORT=smtp` gesetzt ist.

| Variable      | Pflicht | Beschreibung                                                                |
| ------------- | ------- | --------------------------------------------------------------------------- |
| `SMTP_HOST`   | ja      | Hostname des SMTP-Servers (z. B. `smtp.example.com`).                       |
| `SMTP_PORT`   | ja      | TCP-Port als Integer (typisch `465` für TLS, `587` für STARTTLS).           |
| `SMTP_USER`   | ja      | SMTP-Login.                                                                 |
| `SMTP_PASS`   | ja      | SMTP-Passwort. Geheim. Niemals loggen, niemals committen.                   |
| `SMTP_FROM`   | ja      | Absenderadresse (Header `From`), idealerweise mit Display-Name.             |
| `SMTP_SECURE` | nein    | `"true"`/`"1"`/`"yes"` → impliziertes TLS (Port 465). Default `false` → STARTTLS. |

Validiert wird beim Mailversand (nicht beim App-Boot), damit der
Console-Default unbeeinträchtigt bleibt. Fehlt eine Pflichtvariable oder ist
`SMTP_PORT` ungültig, wird `SmtpConfigError` mit der Liste der Schlüssel
(NICHT der Werte) geworfen.

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
Antworten, keine DB-IDs, keine Hashes. Im strukturierten
`[website-form/submit]`-Log des Submit-Endpoints werden **weder Empfänger
noch Bestätigungs-URL noch SMTP-Passwort** ausgegeben.

## Operatives Verhalten bei Fehlern

Wenn `sendWebsiteFormConfirmationEmail(...)` fehlschlägt — egal ob durch
fehlende SMTP-Konfiguration, Netz-/Auth-Fehler oder unerreichbaren Server —
gilt unverändert:

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

## Vercel-Setup

In Vercel → Project → Settings → Environment Variables anlegen, jeweils für
die Environments **Production** (und ggf. **Preview**):

1. `MAIL_TRANSPORT` = `smtp` (Plain).
2. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM` als Plain-Variablen.
3. `SMTP_PASS` als **Sensitive**/Secret-Variable hinterlegen, damit der Wert
   nach dem Speichern nicht mehr im Klartext angezeigt wird.
4. `SMTP_SECURE` optional setzen (`true` für Port 465, sonst weglassen).

Anschließend einmal neu deployen, damit die Variablen in der Laufzeit aktiv
sind. Validierung im Betrieb:

- Ein Test-Submit auf einem aktiven Website-Form auslösen.
- In den Vercel-Function-Logs nach `[website-form/submit]` mit
  `outcome=success` suchen.
- Bei `outcome=mail_failed` enthält das Log eine kurze `detail`-Message
  (Klasse + Provider-Fehlertext, ohne Empfänger/Token/Passwort).

Hinweise zum Produktivbetrieb:

- Auswahl des Providers mit AVV nach DSGVO erforderlich.
- SPF/DKIM/DMARC für die Absender-Domain einrichten, damit Bestätigungs-Mails
  nicht im Spam landen.
- Bei Limits/Throttling des Providers: Submit-Endpoint sieht ohnehin nur
  „mail_failed" und behält die Session — kein Datenverlust.

## Verweise

- Code: [`lib/mail/sendWebsiteFormConfirmationEmail.ts`](../lib/mail/sendWebsiteFormConfirmationEmail.ts)
- SMTP-Transport: [`lib/mail/smtpTransport.ts`](../lib/mail/smtpTransport.ts)
- Submit-Endpoint: [`app/api/p/[slug]/submit/route.ts`](../app/api/p/%5Bslug%5D/submit/route.ts)
- Confirm-Route: [`app/p/confirm/[token]/page.tsx`](../app/p/confirm/%5Btoken%5D/page.tsx)
- Cleanup-Skript: [`scripts/cleanup-unconfirmed-website-submits.mjs`](../scripts/cleanup-unconfirmed-website-submits.mjs)
- Betrieb / Logs: [`website-forms-operations.md`](./website-forms-operations.md)
- ENV-Beispiel: [`.env.example`](../.env.example)
