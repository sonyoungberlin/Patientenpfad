# Website-Forms — Manuelle E2E-Checkliste

Phase 3d Hardening. Diese Checkliste ist für eine manuelle Durchsprache des
gesamten Website-Form-Flows in einer lokalen Umgebung gedacht, mit
`MAIL_TRANSPORT=console` (Bestätigungs-URL aus dem Server-Log abgreifen).

Die Checkliste ist bewusst kurz gehalten und deckt nur die in Phase 3d
ausgelieferten Pfade ab. Sie ersetzt **kein** automatisiertes E2E-Setup; das
ist eine eigene Phase.

Vorbereitung:

- Lokale DB mit einer Praxis (`is_approved=true`,
  `patient_communication_enabled=true`, `website_forms_enabled=true`),
- ein aktives Praxisformular mit bekanntem `slug`,
- `MAIL_TRANSPORT=console`,
- ein zweites, deaktiviertes Praxisformular für die Negativ-Tests,
- Server-Log im Blickfeld, um die strukturierten Marker
  `[website-form/submit]`, `[website-form/confirm]`,
  `[website-form/cleanup]` (siehe
  [`website-forms-operations.md`](./website-forms-operations.md)) zu sehen.

Für jeden Punkt: ✅ bestanden / ❌ Abweichung notieren.

---

## 1. Happy Path

- [ ] `GET /p/<slug>` rendert das Formular.
- [ ] Submit mit gültiger E-Mail → Browser landet auf `/p/<slug>/eingereicht`.
- [ ] Server-Log zeigt `[website-form/submit] outcome=success` mit
  `sessionId`, `practiceFormId`, `slug`.
- [ ] Server-Log zeigt `[mail:console] Bestätigungs-E-Mail` mit Empfänger
  und `confirmationUrl`.
- [ ] Bestätigungs-URL aus dem Log im Browser öffnen → Erfolgsseite mit
  `data-public-confirm-success`.
- [ ] Server-Log zeigt `[website-form/confirm] outcome=success` mit
  `sessionId`.
- [ ] Eintrag erscheint in `/questionnaires` der Praxis (Status completed).

## 2. Honeypot

- [ ] Submit mit ausgefülltem Honeypot-Feld → identischer Erfolgs-Redirect.
- [ ] **Kein** neuer DB-Eintrag (per `PatientQuestionnaireSession`-Count
  vorher/nachher prüfen).
- [ ] Server-Log zeigt `[website-form/submit] outcome=honeypot`.

## 3. Validierung

- [ ] Submit ohne E-Mail-Feld → 400, `outcome=invalid_email`.
- [ ] Submit mit „kein-at-zeichen" → 400, `outcome=invalid_email`.
- [ ] Submit mit übergroßer Antwort (z. B. > sanitizer-Limit) → Submit
  bleibt erlaubt, Antwort wird gekürzt (sanitizeAnswers); Verhalten
  unverändert.
- [ ] Submit mit unbekannten `questionId`s → diese Antworten werden
  verworfen, restliche bleiben erhalten.

## 4. Negative Confirm-Pfade

- [ ] `/p/confirm/kaputt` → Fehlerseite, kein DB-Roundtrip,
  `outcome=invalid_token_format`.
- [ ] `/p/confirm/<gültiges-Format-aber-unbekannt>` → Fehlerseite,
  `outcome=not_found`.
- [ ] Bestätigungs-URL **zweimal** öffnen → erster Klick: Erfolg,
  zweiter Klick: „bereits bestätigt"-Hinweis (`data-public-confirm-already-confirmed`),
  Log: `outcome=already_confirmed`.
- [ ] Token in der DB manuell mit abgelaufenem `confirm_token_expires_at`
  versehen → `outcome=expired`.
- [ ] Praxis-Account zwischenzeitlich `website_forms_enabled=false`
  setzen → `outcome=owner_disabled`.
- [ ] Praxisformular zwischenzeitlich `is_active=false` setzen →
  `outcome=form_inactive`.

## 5. Rate-Limit

- [ ] > 5 Submits derselben IP innerhalb 10 min → 429,
  `outcome=rate_limited_ip`. Nach Fenster wieder zugelassen.
- [ ] > 3 Submits derselben E-Mail-Adresse → 429,
  `outcome=rate_limited_email`.

## 6. Sichtbarkeit

- [ ] Unbestätigte Website-Sessions tauchen **nicht** in
  `/questionnaires` auf.
- [ ] `GET /api/questionnaire/<id>` für eine unbestätigte Session: 404
  (kein 403, kein 200).
- [ ] Interne Sessions (Patientenlink) sind unverändert sichtbar.

## 7. Cleanup-Skript

- [ ] Eine bestätigte Session, eine unbestätigte abgelaufene Session und
  eine unbestätigte gültige Session anlegen.
- [ ] `node scripts/cleanup-unconfirmed-website-submits.mjs` (Dry-Run) →
  zeigt nur die abgelaufene unbestätigte; Log:
  `[website-form/cleanup] outcome=dry_run candidate_count=1`.
- [ ] `node scripts/cleanup-unconfirmed-website-submits.mjs --apply` →
  löscht ausschließlich diese; Log: `outcome=apply_started` gefolgt
  von `outcome=apply_finished deleted_count=1`.
- [ ] Bestätigte und gültige Sessions sind unverändert vorhanden.

## 8. Smoke / Build

- [ ] `npm test` grün vor und nach manuellen DB-Manipulationen
  (Manipulationen rückgängig machen!).
- [ ] `npx next build` läuft fehlerfrei durch (sofern lokal vorgesehen).

---

Ergebnisse + Datum / Tester:in:

```
Datum:     ____________
Tester:in: ____________
Befunde:   ____________
```
