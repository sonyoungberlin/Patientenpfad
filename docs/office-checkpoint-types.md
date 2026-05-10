# Office-Checkpoint-Typen: Architektur-Grundlagen

**Version:** 1.0 (Draft für Implementierung Phase B+)  
**Status:** Fachliche Architektur (nicht codegeneriert)  
**Bindung:** Verbindlichkeit ab nächstem Code-Slice

---

## Grundmodell: Neutrale Checkpoints mit Typverhalten

### Kernprinzipien

1. **Ein Checkpoint trägt genau eine neutrale Information.**
   - Beispiel: "Liegt eine gültige Approbation vor?" — nicht: "Hat der Kandidat alle Qualifikationen?"
   
2. **Der Falltyp entscheidet, welche Checkpoints benötigt werden.**
   - Beispiel: Falltyp "Arzt anstellen" braucht Approbation; Falltyp "MVZ-Eröffnung" braucht sie auch, aber andere Checkpoints zusätzlich.
   
3. **Der Checkpoint weiß nicht, in welchem Fall er verwendet wird.**
   - Checkpoints sind falltyp-agnostisch; der Katalog ordnet sie je Fall.
   
4. **Der Checkpoint-Typ bestimmt sein Verhalten in M1–M5.**
   - M1: Fallinitialisierung (Welche Checkpoints laden?)
   - M2: Vorbereitung (Sammelt M2 Ja/Nein-Antworten?)
   - M3: Bewertung (Wie bewertet der Prüfer?)
   - M4: Followup (Erzeugt der Checkpoint Aktionen/Aufgaben?)
   - M5: Dokumentation (Wie wird das Ergebnis festgehalten?)
   
5. **M2 sammelt einfache Vorbereitungsantworten, falls nötig.**
   - M2 ist optional pro Checkpoint; M2-Fragen sind ja/nein/unklar.
   - M2 bereitet M3 vor, aber erzwingt nicht M2.
   
6. **M3 bewertet den Checkpoint unabhängig.**
   - M3-Bewertung kann eigenes Ergebnis haben, auch wenn M2 "ok" sagte.
   - Beispiel: M2="Nachweis vorhanden?" → Ja. M3="Ist Nachweis akzeptabel?" → Nein (abgelaufen).
   
7. **M4 erzeugt Folgeaktionen.**
   - Fallweise: M4 löst Aufgaben aus (z.B. "Schreibe an KV", "Prüfer reviewen").
   
8. **M5 erzeugt Dokumentation/Ergebnis.**
   - M5 beschreibt neutral: Stand, Nachweise, offene Punkte, nächste Schritte.
   
9. **Reine Regelhinweise sind keine Checkpoints.**
   - Beispiel: "Facharztweiterbildung dauert mind. 5 Jahre" ist ein Hinweis, nicht ein Checkpoint.
   - Hinweise sind Kontextinformationen in M3 (Tooltip) oder M5 (Referenz).

---

## Checkpoint-Typen: Definitionen und Verhalten

### 1. NACHWEIS_PFLICHT

**Definition:**  
Ein Checkpoint, bei dem eine Information/Qualifikation/Status durch Dokument (Urkunde, Attest, Register-Auszug, Bescheinigung) oder amtliche Quelle nachgewiesen sein **muss**, um tätigen oder verfahrensrechtlich anerkannt zu sein.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Approbation, Facharztqualifikation, Berufshaftpflicht, ärztliche Registrierungen |
| **M2 (Vorbereitung)** | Optional (Ja: "Liegt Nachweis vor?") |
| **M3 (Bewertung)** | Ja |
| **Nachweis erforderlich** | Ja |
| **Externe Stelle erforderlich** | Optional (Verifikation durch Register/Behörde möglich) |
| **Typische externe Stellen** | Approbationsbehörde, Ärztekammer, Medizinisches Berufsregister |
| **M2-Verhalten** | Wenn M2: Ja/Nein/Unklar auf "Nachweis vorhanden?" und "Gültig?" |
| **M3-Bewertungsform** | Select: `Nachweis akzeptabel` (YES) / `Nachweis unzureichend/ungültig` (NO) / `Information fehlt` (OPEN) |
| **M4-Folgeaktion** | Bei negativer oder offener Bewertung: Task "Nachweis anfordern" oder "Gültigkeitsprüfung"; External: Kontakt zur Quelle |
| **M5-Dokumentation** | Art, Nummer, Ausstellerdatum, Gültigkeitsfrist des Nachweises; ggf. Registerreferenz |
| **failureEffect** | checkpoint-spezifisch; typischerweise siehe konkreter Checkpoint |
| **outcomeAudience** | CHEF (Freigabe), BACKOFFICE (Archivierung), EXTERNE_STELLE (falls nötig) |

**Hinweis:**  
- NACHWEIS_PFLICHT ≠ automatisch M2 (kann auch direkt in M3 geprüft werden).
- Beispiel: "Approbation liegt vor?" könnte in M2 geklärt sein, oder M3-Prüfer lädt Register selbst.

---

### 2. EXTERNE_BESTAETIGUNG

**Definition:**  
Ein Checkpoint, bei dem eine Information aus einer externen Stelle (Behörde, KV, Versicherung, Register) kommen **muss**, wenn sie lokal unklar ist. Das Checkpoint-Ergebnis hängt von der Rückmeldung ab.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Registerstatus (online/extern), KV-Genehmigungsstatus, Versicherungs-Gültigkeit, Zulassungs-Status |
| **M2 (Vorbereitung)** | Ja (Ja/Nein/Unklar: "Können wir Status intern klären?" oder "Wurde Anfrage gesendet?") |
| **M3 (Bewertung)** | Ja |
| **Nachweis erforderlich** | Optional (Nur bei positiver Antwort) |
| **Externe Stelle erforderlich** | Ja |
| **Typische externe Stellen** | KV, Approbationsbehörde, Ärztekammer, Versicherung, Online-Register |
| **M2-Verhalten** | Ja/Nein/Unklar auf "Status intern geklärt?" oder "Anfrage gesendet?"; ggf. Tracking: "Antwort erwartet am [Datum]" |
| **M3-Bewertungsform** | Select: `Externe Stelle hat bestätigt` (YES) / `Externe Stelle hat abgelehnt` (NO) / `Anfrage ausstehend` (OPEN) |
| **M4-Folgeaktion** | Wenn OPEN: Task "Anfrage nachfassen"; Wenn NO: Task "Alternative prüfen" |
| **M5-Dokumentation** | Anfrage-Datum, Stelle, Inhalt der Anfrage; Antwort-Datum, Inhalt, Ansprechpartner |
| **failureEffect** | `BLOCKER` (wenn negative Antwort oder Timeout) |
| **outcomeAudience** | BACKOFFICE (Follow-up), EXTERNE_STELLE (Kontakt), CHEF (Entscheidung) |

---

### 3. REGEL_PARAMETER

**Definition:**  
Ein Checkpoint, der einen Wert/Parameter festlegt oder prüft, der gegen ein Compliance-Kriterium (Grenzwert, Qualitäts-Standard, Struktur-Anforderung) gemessen wird. Keine externe Quelle nötig, aber interne Dokumentation.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Tätigkeitsumfang (max. Stunden/Woche), Selbstversorgung-Anteil, Betriebsstättenstruktur, Kapazität |
| **M2 (Vorbereitung)** | Optional (Ja/Nein/Unklar: "Ist Wert dokumentiert?") |
| **M3 (Bewertung)** | Ja |
| **Nachweis erforderlich** | Optional (Interne Dokumentation) |
| **Externe Stelle erforderlich** | Nein |
| **Typische externe Stellen** | Praxisintern, ggf. KV zur Validierung |
| **M2-Verhalten** | Ja/Nein/Unklar auf "Wert dokumentiert?" und "Compliance-Bedenken?" |
| **M3-Bewertungsform** | Select: `Kriterium erfüllt` (YES) / `Kriterium nicht erfüllt` (NO) / `Daten fehlen` (OPEN) |
| **M4-Folgeaktion** | Wenn NO: Task "Parameter anpassen"; Wenn OPEN: Task "Daten einholen" |
| **M5-Dokumentation** | Wert selbst, Messmethode, Prüf-Ergebnis, Compliance-Status |
| **failureEffect** | checkpoint-spezifisch; typischerweise siehe konkreter Checkpoint |
| **outcomeAudience** | CHEF (Entscheidung), BACKOFFICE (Tracking), ggf. EXTERNE_STELLE |

---

### 4. VERFAHRENSWEG

**Definition:**  
Ein Checkpoint, der einen administrativen oder prozessualen Weg definiert oder prüft (z.B. Antrag bei Stelle X, dann Genehmigung durch Stelle Y, dann Registereintrag). Die Reihenfolge und Form MÜSSEN eingehalten werden.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Antragsweg (KV → Kammer → Register), Genehmigungsreihenfolge, Anmeldung bei Behörde |
| **M2 (Vorbereitung)** | Optional (Ja/Nein/Unklar: "Ist Weg bekannt?" oder "Wurden Schritte eingeleitet?") |
| **M3 (Bewertung)** | Ja |
| **Nachweis erforderlich** | Optional (Eingangsbestätigungen, Quittungen) |
| **Externe Stelle erforderlich** | Ja |
| **Typische externe Stellen** | KV, Ärztekammer, Zulassungsausschuss, Register |
| **M2-Verhalten** | Ja/Nein/Unklar auf "Weg bekannt?" oder "Schritt 1 eingeleitet?" |
| **M3-Bewertungsform** | Select: `Korrekt eingeleitet` (YES) / `Fehlerhaft eingeleitet` (NO) / `Status unklar` (OPEN) |
| **M4-Folgeaktion** | Wenn NO: Task "Antrag korrigieren"; Wenn OPEN: Task "Status erfragen" |
| **M5-Dokumentation** | Weg-Beschreibung, Schritte mit Daten, Status je Stelle, Eingang-Bestätigungen |
| **failureEffect** | `BLOCKER` (wenn Form nicht akzeptiert und Neustart nötig) |
| **outcomeAudience** | BACKOFFICE (Tracking), EXTERNE_STELLE (Kontakt), CHEF (Eskalation) |

---

### 5. INTERNE_ENTSCHEIDUNG

**Definition:**  
Ein Checkpoint, bei dem die Praxis/der Fall selbst eine Entscheidung trifft (nicht extern vorgegeben). Beispiele: Vertragstyp mit Arzt, Tätigkeit, Verantwortlichkeiten, Team-Struktur. M3 prüft, ob die Entscheidung konsistent dokumentiert ist.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Vertragstyp (Angestellter, Freiberufler), Tätigkeit/Schwerpunkt, Verantwortlichkeiten, Schulungs-Planung |
| **M2 (Vorbereitung)** | Often (Ja/Nein/Unklar: "Ist Entscheidung getroffen?") |
| **M3 (Bewertung)** | Ja |
| **Nachweis erforderlich** | Often (Vertrag, Beschluss, Schriftliche Vereinbarung) |
| **Externe Stelle erforderlich** | Nein |
| **Typische externe Stellen** | Praxisintern, ggf. Rechtsanwalt/Steuerberater |
| **M2-Verhalten** | Ja/Nein/Unklar auf "Entscheidung getroffen?" und "Dokumentiert?" |
| **M3-Bewertungsform** | Select: `Entscheidung getroffen & dokumentiert` (YES) / `Entscheidung ausstehend` (NO) / `Dokumentation unklar` (OPEN) |
| **M4-Folgeaktion** | Wenn NO: Task "Entscheidung herbeiführen"; Wenn OPEN: Task "Dokumentation vervollständigen" |
| **M5-Dokumentation** | Entscheidung, Datum getroffen, Begründung/Vertragsref, Unterschriften |
| **failureEffect** | checkpoint-spezifisch; typischerweise siehe konkreter Checkpoint |
| **outcomeAudience** | CHEF (Freigabe), BACKOFFICE (Tracking), ARZT (Information) |

---

### 6. KONTEXT_INFORMATION

**Definition:**  
Ein Checkpoint, der Hintergrund-Information trägt, die die Beurteilung erleichtern kann, aber nicht entscheidungstragend ist. Beispiele: Praxis seit Jahrzehnten etabliert, Übergangs-Regelung relevant, Besonderheiten des Falls.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Praxis-Geschichte, Übergangsfrist-Anwendbarkeit, Vorherige Genehmigungen, Besonderheiten |
| **M2 (Vorbereitung)** | Nein |
| **M3 (Bewertung)** | Optional (Prüfer nutzt, falls relevant) |
| **Nachweis erforderlich** | Nein |
| **Externe Stelle erforderlich** | Nein |
| **Typische externe Stellen** | Keine |
| **M2-Verhalten** | — (nicht in M2) |
| **M3-Bewertungsform** | ReadOnly oder Checkbox "Berücksichtigt" |
| **M4-Folgeaktion** | Wenn kontextrelevant: Task "Information in Dokumentation erwähnen" |
| **M5-Dokumentation** | Optional; nur wenn für Entscheidung relevant |
| **failureEffect** | `NONE` |
| **outcomeAudience** | CHEF (Information), BACKOFFICE (History) |

---

### 7. REGELHINWEIS (NICHT als Checkpoint!)

**Definition:**  
Reine Informationen zu Regeln, Gesetzen, Standards, die **nicht als Checkpoint modelliert werden**, sondern als Tooltip/Info-Box in M3 oder Referenz in M5 auftauchen. Regelhinweise helfen dem Prüfer, den Checkpoint richtig zu bewerten.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | "Facharztweiterbildung mind. 5 Jahre (Teilzeit prolongiert)", "Berufshaftpflicht gesetzlich verpflichtend", "Approbation gültig X Jahre" |
| **M2 (Vorbereitung)** | Nein |
| **M3 (Bewertung)** | nicht anwendbar — kein Checkpoint |
| **Nachweis erforderlich** | Nein |
| **Externe Stelle erforderlich** | Nein |
| **Typische externe Stellen** | Keine |
| **M2-Verhalten** | — (nicht in M2; keine Frage) |
| **M3-Bewertungsform** | nicht anwendbar — kein Checkpoint |
| **M4-Folgeaktion** | nicht anwendbar — kein Checkpoint |
| **M5-Dokumentation** | Optional; Referenz auf Regel-Quelle (z.B. "nach Vorgabe § XY") |
| **failureEffect** | nicht anwendbar — kein Checkpoint |
| **outcomeAudience** | Alle (Information) |

**Wichtig:**  
Regelhinweise sind **NICHT** als Checkpoints im Katalog zu modellieren. Sie sind separate Strukturen (Hinweis-Typ), keyed by Checkpoint-ID, damit UI "bei Approbation diesen Hinweis zeigen" kann.

---

### 8. GATEKEEPER / AUSSCHLUSS_CHECK

**Definition:**  
Ein Checkpoint, dessen negatives Ergebnis den Fall **sofort stoppt** und nicht weiter bearbeitet wird. Beispiel: "Hat Kandidat Approbation?" → Nein → Fall vorbei.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Approbation (wenn nicht vorhanden, kein Arzt), Schweiz/EU-Status (wenn nicht erfüllt, keine Tätigkeit), Berufserlaubnis |
| **M2 (Vorbereitung)** | Optional (Ja/Nein/Unklar) |
| **M3 (Bewertung)** | Ja; M3 entscheidet "bestanden" / "nicht bestanden" |
| **Nachweis erforderlich** | Ja |
| **Externe Stelle erforderlich** | Often |
| **Typische externe Stellen** | Approbationsbehörde, Register, Behörde |
| **M2-Verhalten** | Wenn M2: "Liegt Voraussetzung vor?" |
| **M3-Bewertungsform** | `Gatekeeper bestanden` (YES) / `Gatekeeper nicht bestanden` (NO) |
| **M4-Folgeaktion** | Wenn NO: Automatische Fall-Archivierung oder "Kandidat nicht geeignet" |
| **M5-Dokumentation** | "Fall nicht fortsetzbar: [Grund]. Gatekeeper nicht erfüllt." |
| **failureEffect** | `GATEKEEPER` (Fall stoppt) |
| **outcomeAudience** | CHEF (Freigabe/Ablehnung), ARZT (falls relevant), BACKOFFICE (Archivierung) |

**Hinweis:**  
GATEKEEPER ist ein Attribut (failureEffect + Typ), nicht ein separater Typ. Ein NACHWEIS_PFLICHT kann GATEKEEPER sein, wenn sein Fehlen fatal ist.

---

### 9. BLOCKER

**Definition:**  
Ein Checkpoint, dessen negatives Ergebnis den Fall nicht sofort stoppt, aber blockiert, bis geklärt. Beispiel: "KV-Genehmigung erhalten?" → Nein → Warte auf Antwort; Fall nicht freizugeben.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | KV-Genehmigung, Zulassungs-Status, Versicherungs-Gültigkeit (während Klärung) |
| **M2 (Vorbereitung)** | Often (Ja/Nein/Unklar) |
| **M3 (Bewertung)** | Ja |
| **Nachweis erforderlich** | Often |
| **Externe Stelle erforderlich** | Often |
| **Typische externe Stellen** | KV, Zulassungsausschuss, Versicherung |
| **M2-Verhalten** | Wenn M2: "Anfrage gesendet?" oder "Status geklärt?" |
| **M3-Bewertungsform** | `Blocker erfüllt` (YES) / `Blocker nicht erfüllt` (NO) / `Warte auf Klärung` (OPEN) |
| **M4-Folgeaktion** | Wenn NO/OPEN: Task "Anfrage nachfassen", "Eskalation zu Stelle X", "Fall in Warte-Queue" |
| **M5-Dokumentation** | "Fall auf Blocker wartend: [Checkpoint]. Letzte Verfolgung: [Datum]" |
| **failureEffect** | `BLOCKER` (Fall fortgesetzt nur mit Bestätigung) |
| **outcomeAudience** | BACKOFFICE (Tracking/Escalation), EXTERNE_STELLE (Kontakt), CHEF (Eskalation) |

---

### 10. RISIKO

**Definition:**  
Ein Checkpoint, dessen negatives Ergebnis ein Risiko trägt (z.B. Qualitäts-Problem, Compliance-Warnung), aber nicht unbedingt den Fall blockiert. Beispiel: "Berufserfahrung < 3 Jahre" → Risiko, aber mit Begleitung fortbar; "Fortbildungsstatus unklar" → Risiko, kann später geklärt werden.

| Attribut | Wert |
|----------|------|
| **Typische Beispiele** | Wenig Erfahrung, Karriere-Lücken, Fortbildung-Rückstand, Sprachkenntnisse fraglich |
| **M2 (Vorbereitung)** | Often (Ja/Nein/Unklar) |
| **M3 (Bewertung)** | Ja; M3 entscheidet "akzeptabel", "mit Auflagen", "Risiko" |
| **Nachweis erforderlich** | Optional |
| **Externe Stelle erforderlich** | Optional |
| **Typische externe Stellen** | Praxisintern, ggf. Kammer zur Beratung |
| **M2-Verhalten** | Ja/Nein/Unklar auf "Ist Faktor erfüllt?" |
| **M3-Bewertungsform** | Select: `Kein Risiko` (YES) / `Risiko erkannt` (OPEN) / `Kritisches Risiko` (NO) |
| **M4-Folgeaktion** | Wenn OPEN/NO: Task "Risiko dokumentieren", "Auflagen definieren", "Supervision planen" |
| **M5-Dokumentation** | "Risikohinweis: [Checkpoint]. Empfehlte Maßnahmen: [Details]" |
| **failureEffect** | `RISK` (Fall mit Auflagen fortbar) |
| **outcomeAudience** | CHEF (Entscheidung), ARZT (Information), BACKOFFICE (Maßnahmen-Tracking) |

---

## Beispiel: Arzt anstellen / Nachbesetzung

### Informationsbausteine – Typisierung & Klassifizierung

| Information | Typ | M2? | M3? | failureEffect | Kategorie | Hinweise |
|-------------|-----|-----|-----|---------------|-----------|----------|
| **Approbation** | NACHWEIS_PFLICHT + GATEKEEPER | Optional | Ja | GATEKEEPER | **A: M2-Checkpoint** | Ohne Approbation kein Arzt; Register abrufbar oder externe Prüfung |
| **Arztregisterstatus** | EXTERNE_BESTAETIGUNG | Ja | Ja | BLOCKER | **B: Ohne M2** | Optional: Kann in M3 direkt via Online-Register geprüft werden |
| **Facharztqualifikation** | NACHWEIS_PFLICHT | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Falls relevant für Tätigkeit; Nachweis durch Kammer/Register |
| **Berufshaftpflicht** | NACHWEIS_PFLICHT | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Gesetzlich verpflichtend; Police oder Verbandszugehörigkeit |
| **Fortbildungsstatus** | RISIKO | Ja | Ja | RISK | **A: M2-Checkpoint** | Weniger kritisch; Risiko bei Rückstand, aber kein Stopp |
| **Verfahrensweg** | VERFAHRENSWEG | Optional | Ja | BLOCKER | **B: Ohne M2** | Antragsreihenfolge: KV → Kammer → Register (M3 prüft Einhaltung) |
| **Genehmigungsstatus (KV)** | EXTERNE_BESTAETIGUNG + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | KV-Genehmigung erforderlich; externe Abfrage |
| **Tätigkeitsumfang** | REGEL_PARAMETER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Stunden/Woche, Schwerpunkt; gegen interne/externe Kriterien prüfen |
| **Betriebsstätte ist bestimmt** | REGEL_PARAMETER | Ja | Ja | RISK | **C: Optional** | Struktur (Einzelpraxis, MVZ, Zweigstelle) ist eindeutig festgelegt |
| **Einsatzort ist bestimmt** | REGEL_PARAMETER | Ja | Ja | RISK | **C: Optional** | Einsatzort ist eindeutig festgelegt |
| **Persönliche Leitung ist gewahrt** | INTERNE_ENTSCHEIDUNG + GATEKEEPER | Ja | Ja | GATEKEEPER | **A: M2-Checkpoint** | Medizinische Verantwortlichkeit ist eindeutig zugeordnet |
| **Kapazitätsgrenze ist eingehalten** | REGEL_PARAMETER + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Kapazitätsgrenze ist dokumentiert und eingehalten |
| **Starttermin** | INTERNE_ENTSCHEIDUNG | Ja | Ja | RISK | **C: Optional** | Praxis festgelegt; Konsistenz mit Genehmigungsstand prüfen |
| **Karriereplanung / Perspektive** | KONTEXT_INFORMATION | Nein | Optional | NONE | **C: Optional** | Langfristige Perspektive als optionale Kontextinformation |

### Detaillierte Klassifizierung

#### **A. Echte Checkpoints mit M2 (7 Checkpoints)**
Diese beantworten einfache Fragen in M2, bevor M3 bewertet:
1. ✅ **Approbation** (NACHWEIS_PFLICHT + GATEKEEPER)
   - M2: "Liegt gültige Approbation vor?" → Ja/Nein/Unklar
   - M3: Nachweis akzeptabel? (mit Registerprüfung)
   - failureEffect: GATEKEEPER
   
2. ✅ **Facharztqualifikation** (NACHWEIS_PFLICHT)
   - M2: "Liegt Fachkundenachwei vor?" → Ja/Nein/Unklar
   - M3: Nachweis akzeptabel?
   - failureEffect: BLOCKER (falls für Tätigkeit erforderlich)
   
3. ✅ **Berufshaftpflicht** (NACHWEIS_PFLICHT)
   - M2: "Ist Haftpflicht aktuell?" → Ja/Nein/Unklar
   - M3: Police gültig?
   - failureEffect: BLOCKER
   
4. ✅ **Genehmigungsstatus (KV)** (EXTERNE_BESTAETIGUNG + BLOCKER)
   - M2: "Wurde KV-Antrag eingereicht?" → Ja/Nein/Unklar
   - M3: KV-Genehmigung vorhanden?
   - failureEffect: BLOCKER
   
5. ✅ **Tätigkeitsumfang** (REGEL_PARAMETER)
   - M2: "Ist Umfang dokumentiert?" → Ja/Nein/Unklar
   - M3: Erfüllt Compliance-Kriterien?
   - failureEffect: BLOCKER

6. ✅ **Persönliche Leitung ist gewahrt** (INTERNE_ENTSCHEIDUNG + GATEKEEPER)
   - M2: "Ist die persönliche Leitung eindeutig gewahrt?" → Ja/Nein/Unklar
   - M3: Verantwortlichkeit eindeutig und belastbar dokumentiert?
   - failureEffect: GATEKEEPER

7. ✅ **Kapazitätsgrenze ist eingehalten** (REGEL_PARAMETER + BLOCKER)
   - M2: "Ist die Kapazitätsgrenze eingehalten?" → Ja/Nein/Unklar
   - M3: Kapazitätsnachweis ausreichend?
   - failureEffect: BLOCKER

#### **B. Echte Checkpoints ohne M2 (2 Checkpoints)**
Diese werden direkt in M3 bewertet, ohne M2-Vorbereitung:
1. ⚠️ **Registerstatus** (EXTERNE_BESTAETIGUNG)
   - M2: Entfällt (oder optional: "Bereits geprüft?")
   - M3: Status im Register verifiziert?
   - failureEffect: BLOCKER
   
2. ⚠️ **Verfahrensweg** (VERFAHRENSWEG)
   - M2: Entfällt (oder optional: "Ablauf bekannt?")
   - M3: Korrekte Reihenfolge eingehalten?
   - failureEffect: BLOCKER

#### **C. Optionale Kontext-Checkpoints (4 Checkpoints)**
Diese sind informativ; Fehlen blockiert nicht:
1. ℹ️ **Betriebsstätte ist bestimmt** (REGEL_PARAMETER)
   - M2: Optional
   - M3: Optional (Struktur-Compliance prüfen)
   - failureEffect: RISK

2. ℹ️ **Einsatzort ist bestimmt** (REGEL_PARAMETER)
   - M2: Optional
   - M3: Optional (Einsatzort-Klarheit prüfen)
   - failureEffect: RISK

3. ℹ️ **Starttermin** (INTERNE_ENTSCHEIDUNG)
   - M2: Optional
   - M3: Optional (Konsistenz-Check)
   - failureEffect: RISK

4. ℹ️ **Karriereplanung / Perspektive** (KONTEXT_INFORMATION)
   - M2: Nein
   - M3: Optional (Kontext)
   - failureEffect: NONE

#### **D. Reine Regelhinweise (0 Hinweise; nicht Checkpoint)**
- Keine separaten Regelhinweise in diesem Fallabschnitt.

#### **E. Gatekeeper / Ausschluss-Checks (1 Checkpoint)**
1. 🚫 **Persönliche Leitung ist gewahrt** (INTERNE_ENTSCHEIDUNG + GATEKEEPER)
   - M2: "Ist Verantwortlichkeit eindeutig geklärt?" → Ja/Nein/Unklar
   - M3: Persönliche Leitung belastbar dokumentiert?
   - failureEffect: GATEKEEPER
   - Hinweis: Ohne gewahrte persönliche Leitung ist der Fall nicht fortsetzbar

#### **F. Blocker (bereits oben impliziert)**
- Genehmigungsstatus, Registerstatus, Facharztqualifikation, Tätigkeitsumfang, Kapazitätsgrenze: Alle können BLOCKER sein

#### **G. Risiken (bereits oben impliziert)**
- Fortbildungsstatus, Betriebsstätte, Einsatzort, Starttermin: Alle können RISK tragen

---

## M2/M3/M5 Workflow für "Arzt anstellen"

### Typischer Ablauf

```
M2 (Vorbereitung):
  ✅ Approbation: "Liegt vor?" → [Ja/Nein/Unklar] + ggf. Register-ref
  ✅ Facharztqualifikation: "Liegt vor?" → [Ja/Nein/Unklar]
  ✅ Berufshaftpflicht: "Gültig?" → [Ja/Nein/Unklar]
  ✅ KV-Genehmigung: "Antrag eingereicht?" → [Ja/Nein/Unklar]
  ✅ Tätigkeitsumfang: "Dokumentiert?" → [Ja/Nein/Unklar]
  (optional) Registerstatus: "Intern geklärt?" → [Ja/Nein/Unklar]
  (optional) Verfahrensweg: "Ablauf klar?" → [Ja/Nein/Unklar]

M3 (Bewertung):
  Falls M2 "Unklar", dann M3 klärt direkt oder fordert nach
  Ein Checkpoint pro Card, mit Vorbereitung (M2-Antwort) und Bewertungs-Select
  Select: [Geklärt] [Nicht geklärt] [Offen], ggf. Text

  Wenn failureEffect=GATEKEEPER und Ergebnis=NO:
    → Fall-Status: "Nicht fortsetzbar"
    → UI zeigt: Case closed, Grund dokumentiert
    
  Wenn failureEffect=BLOCKER und Ergebnis=NO/OPEN:
    → Fall-Status: "Anhängig", Blockade dokumentiert
    → M4: Task erzeugt, Liste "Offene Punkte" aktualisiert
    
  Wenn failureEffect=RISK und Ergebnis=RISK:
    → Fall-Status: "Mit Auflagen" oder "Mit Monitoring"
    → M5: Risiko-Hinweis in Summary

M5 (Dokumentation):
  - Ist-Stand je Checkpoint
  - Nachweise (Referenzen auf Archiv, Register, externe Quelle)
  - Offene Punkte mit nächsten Schritten
  - Risiken/Auflagen mit Verantwortlichen
  - Regelhinweise (z.B. "Facharztweiterbildung: 7 Jahre, erfüllt")
```

---

## Beispiel: Urlaubszeit / Praxisschließung / Vertretung

### Informationsbausteine – Typisierung & Klassifizierung

| Information | Typ | M2? | M3? | failureEffect | Kategorie | Hinweise |
|-------------|-----|-----|-----|---------------|-----------|----------|
| **Formale Vertretungsberechtigung liegt vor** | NACHWEIS_PFLICHT + GATEKEEPER | Optional | Ja | GATEKEEPER | **A: M2-Checkpoint** | Nachweis der formalen Vertretungsberechtigung |
| **Fachliche Eignung der Vertretung liegt vor** | NACHWEIS_PFLICHT + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Nachweis der fachlichen Eignung für die konkrete Vertretung |
| **Vertretungszeitraum intern festgelegt** | INTERNE_ENTSCHEIDUNG | Ja | Ja | TODO | **A: M2-Checkpoint** | Genau ein Zeitraum; keine Abhängigkeit zu anderen Checkpoints |
| **Meldung an zuständige Stelle erfolgt** | VERFAHRENSWEG + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Prozessschritt als einzelne Information |
| **Externe Bestätigung der Vertretung liegt vor** | EXTERNE_BESTAETIGUNG + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Externe Rückmeldung separat vom Prozessschritt modelliert |
| **Patientenkommunikation zur Schließung vorbereitet** | REGEL_PARAMETER | Ja | Ja | RISK | **A: M2-Checkpoint** | Prüft nur Kommunikationsparameter (z. B. Erreichbarkeitshinweis vorhanden) |
| **Notfall-Weiterleitung dokumentiert** | REGEL_PARAMETER + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Eine Information: Notfallpfad vorhanden/fehlt |
| **Dokumentierte Übergabe an Vertretung vorhanden** | NACHWEIS_PFLICHT | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Übergabeprotokoll/Nachweis separat erfasst |
| **Aktueller Bearbeitungsstatus externer Rückmeldung** | EXTERNE_BESTAETIGUNG | Nein | Ja | TODO | **B: Ohne M2** | M3-only Statusprüfung (eingegangen/offen) |
| **Interne Entscheidung zu Ausnahmeregelung dokumentiert** | INTERNE_ENTSCHEIDUNG | Nein | Ja | RISK | **B: Ohne M2** | Einzelentscheidung ohne M2-Vorbereitung |
| **Saisonale Auslastung im Zeitraum** | KONTEXT_INFORMATION | Nein | Optional | NONE | **C: Optional** | Reiner Kontext zur Einordnung |
| **Historische Vertretungsstabilität der Praxis** | KONTEXT_INFORMATION | Nein | Optional | NONE | **C: Optional** | Reiner Kontext, keine Entscheidungslogik |

### Detaillierte Klassifizierung

#### **A. Echte Checkpoints mit M2 (8 Checkpoints)**
Diese beantworten vorbereitende Ja/Nein/Unklar-Fragen in M2 und werden in M3 separat bewertet:
1. ✅ **Formale Vertretungsberechtigung liegt vor** (NACHWEIS_PFLICHT + GATEKEEPER)
   - M2: "Liegt ein gültiger Nachweis der formalen Vertretungsberechtigung vor?" → Ja/Nein/Unklar
   - M3: Nachweis akzeptabel?
   - failureEffect: GATEKEEPER

2. ✅ **Fachliche Qualifikation/Fachgruppen-Eignung liegt vor** (NACHWEIS_PFLICHT + BLOCKER)
   - M2: "Liegt ein gültiger Nachweis der fachlichen Qualifikation/Fachgruppen-Eignung vor?" → Ja/Nein/Unklar
   - M3: Nachweis ausreichend für die konkrete Vertretung?
   - failureEffect: BLOCKER

3. ✅ **Vertretungszeitraum intern festgelegt** (INTERNE_ENTSCHEIDUNG)
   - M2: "Ist Zeitraum verbindlich festgelegt?" → Ja/Nein/Unklar
   - M3: Entscheidung dokumentiert?
   - failureEffect: TODO

4. ✅ **Meldung an zuständige Stelle erfolgt** (VERFAHRENSWEG + BLOCKER)
   - M2: "Wurde Meldung eingeleitet?" → Ja/Nein/Unklar
   - M3: Verfahrensschritt korrekt erfolgt?
   - failureEffect: BLOCKER

5. ✅ **Externe Bestätigung der Vertretung liegt vor** (EXTERNE_BESTAETIGUNG + BLOCKER)
   - M2: "Liegt eine externe Rückmeldung vor?" → Ja/Nein/Unklar
   - M3: Bestätigung ausreichend?
   - failureEffect: BLOCKER

6. ✅ **Patientenkommunikation zur Schließung vorbereitet** (REGEL_PARAMETER)
   - M2: "Sind Kommunikationsparameter hinterlegt?" → Ja/Nein/Unklar
   - M3: Parameter ausreichend?
   - failureEffect: RISK

7. ✅ **Notfall-Weiterleitung dokumentiert** (REGEL_PARAMETER + BLOCKER)
   - M2: "Ist Notfallweg dokumentiert?" → Ja/Nein/Unklar
   - M3: Dokumentation ausreichend?
   - failureEffect: BLOCKER

8. ✅ **Dokumentierte Übergabe an Vertretung vorhanden** (NACHWEIS_PFLICHT)
   - M2: "Liegt Übergabenachweis vor?" → Ja/Nein/Unklar
   - M3: Nachweis vollständig?
   - failureEffect: BLOCKER

#### **B. Echte Checkpoints ohne M2 (2 Checkpoints)**
Diese werden in M3 direkt als Einzelinformation bewertet:
1. ⚠️ **Aktueller Bearbeitungsstatus externer Rückmeldung** (EXTERNE_BESTAETIGUNG)
   - M2: entfällt
   - M3: Status eingegangen/offen?
   - failureEffect: TODO

2. ⚠️ **Interne Entscheidung zu Ausnahmeregelung dokumentiert** (INTERNE_ENTSCHEIDUNG)
   - M2: entfällt
   - M3: Entscheidung dokumentiert?
   - failureEffect: RISK

#### **C. Optionale Kontext-Checkpoints (2 Checkpoints)**
Diese liefern Kontext, ohne Gesamtentscheidung auszulösen:
1. ℹ️ **Saisonale Auslastung im Zeitraum** (KONTEXT_INFORMATION)
2. ℹ️ **Historische Vertretungsstabilität der Praxis** (KONTEXT_INFORMATION)

#### **D. Reine Regelhinweise (nicht als Checkpoint)**
- Vertretung muss in der Regel vor Beginn gemeldet sein (frühzeitig planen).
- Erreichbarkeitshinweise für Patienten müssen konsistent an allen Kontaktpunkten erscheinen.
- Notfallkommunikation muss lokal eindeutig und widerspruchsfrei veröffentlicht sein.

#### **E. Gatekeeper (1 Checkpoint)**
- 🚫 **Formale Vertretungsberechtigung liegt vor**: ohne validen Nachweis ist der Fall nicht fortsetzbar (`GATEKEEPER`).

#### **F. Blocker**
- Fachliche Qualifikation/Fachgruppen-Eignung liegt vor
- Meldung an zuständige Stelle erfolgt
- Externe Bestätigung der Vertretung liegt vor
- Notfall-Weiterleitung dokumentiert
- Dokumentierte Übergabe an Vertretung vorhanden

#### **G. Risiken**
- Patientenkommunikation zur Schließung vorbereitet
- Interne Entscheidung zu Ausnahmeregelung dokumentiert

---

## Beispiel: Regressforderung / Prüfverfahren / Rückforderung

### Informationsbausteine – Typisierung & Klassifizierung

| Information | Typ | M2? | M3? | failureEffect | Kategorie | Hinweise |
|-------------|-----|-----|-----|---------------|-----------|----------|
| **Frist zur Erwiderung eingehalten** | VERFAHRENSWEG + GATEKEEPER | Ja | Ja | GATEKEEPER | **A: M2-Checkpoint** | Einzelinformation zur Fristlage; Fristversäumnis kann Verfahren abschneiden |
| **Prüfbescheid vollständig dokumentiert** | NACHWEIS_PFLICHT | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Nur Vollständigkeit des Bescheids, keine Bewertung der Forderung |
| **Forderungsgrund eindeutig klassifiziert** | REGEL_PARAMETER | Ja | Ja | RISK | **A: M2-Checkpoint** | Einzelklassifikation des Grundes |
| **Beleglage zur Abrechnung vollständig** | NACHWEIS_PFLICHT + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Nachweislage je Informationseinheit |
| **Externe Anfrage wurde gestellt** | VERFAHRENSWEG + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Einzelinformation zum Verfahrensschritt der Anfrage |
| **Externe Antwort liegt vor** | EXTERNE_BESTAETIGUNG + BLOCKER | Ja | Ja | BLOCKER | **A: M2-Checkpoint** | Einzelinformation zum Eingang der externen Rückmeldung |
| **Interne Entscheidung zur Strategie dokumentiert** | INTERNE_ENTSCHEIDUNG | Ja | Ja | TODO | **A: M2-Checkpoint** | Einzelentscheidung (z. B. Widerspruch ja/nein) |
| **Verfahrensstatus bei externer Stelle aktuell** | EXTERNE_BESTAETIGUNG | Nein | Ja | TODO | **B: Ohne M2** | M3-only Statusprüfung |
| **Eskalationsweg intern festgelegt** | VERFAHRENSWEG | Nein | Ja | RISK | **B: Ohne M2** | Einzelinformation zum internen Ablauf |
| **Finanzielle Spannbreite der Rückforderung** | REGEL_PARAMETER | Nein | Optional | RISK | **C: Optional** | Kontext für Priorisierung |
| **Vorherige vergleichbare Prüfungen im Haus** | KONTEXT_INFORMATION | Nein | Optional | NONE | **C: Optional** | Reiner Kontext ohne harte Wirkung |
| **Kommunikationshistorie mit externer Stelle** | KONTEXT_INFORMATION | Nein | Optional | NONE | **C: Optional** | Reiner Kontext |

### Detaillierte Klassifizierung

#### **A. Echte Checkpoints mit M2 (7 Checkpoints)**
Diese bereiten in M2 vor und werden in M3 einzeln bewertet:
1. ✅ **Frist zur Erwiderung eingehalten** (VERFAHRENSWEG + GATEKEEPER)
   - M2: "Ist Fristlage klar und eingehalten?" → Ja/Nein/Unklar
   - M3: Fristkriterium erfüllt?
   - failureEffect: GATEKEEPER

2. ✅ **Prüfbescheid vollständig dokumentiert** (NACHWEIS_PFLICHT)
   - M2: "Liegen alle Bescheidteile vor?" → Ja/Nein/Unklar
   - M3: Nachweis vollständig?
   - failureEffect: BLOCKER

3. ✅ **Forderungsgrund eindeutig klassifiziert** (REGEL_PARAMETER)
   - M2: "Ist der Grund eindeutig klassifiziert?" → Ja/Nein/Unklar
   - M3: Klassifikation ausreichend?
   - failureEffect: RISK

4. ✅ **Beleglage zur Abrechnung vollständig** (NACHWEIS_PFLICHT + BLOCKER)
   - M2: "Sind relevante Belege vollständig?" → Ja/Nein/Unklar
   - M3: Nachweise belastbar?
   - failureEffect: BLOCKER

5. ✅ **Externe Anfrage wurde gestellt** (VERFAHRENSWEG + BLOCKER)
   - M2: "Wurde die externe Anfrage gestellt?" → Ja/Nein/Unklar
   - M3: Verfahrensschritt Anfrage korrekt dokumentiert?
   - failureEffect: BLOCKER

6. ✅ **Externe Antwort liegt vor** (EXTERNE_BESTAETIGUNG + BLOCKER)
   - M2: "Liegt eine externe Antwort vor?" → Ja/Nein/Unklar
   - M3: Externe Antwort verwertbar?
   - failureEffect: BLOCKER

7. ✅ **Interne Entscheidung zur Strategie dokumentiert** (INTERNE_ENTSCHEIDUNG)
   - M2: "Ist Strategieentscheidung dokumentiert?" → Ja/Nein/Unklar
   - M3: Entscheidung konsistent?
   - failureEffect: TODO

#### **B. Echte Checkpoints ohne M2 (2 Checkpoints)**
Diese werden direkt in M3 geprüft:
1. ⚠️ **Verfahrensstatus bei externer Stelle aktuell** (EXTERNE_BESTAETIGUNG)
   - M2: entfällt
   - M3: Status aktuell/offen?
   - failureEffect: TODO

2. ⚠️ **Eskalationsweg intern festgelegt** (VERFAHRENSWEG)
   - M2: entfällt
   - M3: Eskalationsweg vorhanden?
   - failureEffect: RISK

#### **C. Optionale Kontext-Checkpoints (3 Checkpoints)**
Diese liefern Einordnung, ohne harte Gesamtwirkung:
1. ℹ️ **Finanzielle Spannbreite der Rückforderung** (REGEL_PARAMETER)
2. ℹ️ **Vorherige vergleichbare Prüfungen im Haus** (KONTEXT_INFORMATION)
3. ℹ️ **Kommunikationshistorie mit externer Stelle** (KONTEXT_INFORMATION)

#### **D. Reine Regelhinweise (nicht als Checkpoint)**
- Regressfristen sind streng; Fristmanagement muss priorisiert dokumentiert sein.
- Begründungstexte müssen konsistent mit den eingereichten Nachweisen bleiben.
- Kommunikationsschritte mit externen Stellen sollten revisionssicher protokolliert sein.

#### **E. Gatekeeper (1 Checkpoint)**
- 🚫 **Frist zur Erwiderung eingehalten**: bei negativem Ergebnis ist der Fall in der Regel nicht fortsetzbar (`GATEKEEPER`).

#### **F. Blocker**
- Prüfbescheid vollständig dokumentiert
- Beleglage zur Abrechnung vollständig
- Externe Anfrage wurde gestellt
- Externe Antwort liegt vor

#### **G. Risiken**
- Forderungsgrund eindeutig klassifiziert
- Eskalationsweg intern festgelegt
- Finanzielle Spannbreite der Rückforderung

---

## Implementierungsnotizen

### Diese Architektur ist fachlich verbindlich.

1. **Sofortumsetzung nicht erforderlich.**
   - Existierender Code (S1–S4) orientiert sich noch an vorigen Mustern.
   - Spätere Code-Slices orientieren sich an diesem Dokument.

2. **Keine Governance-Container als Primärmodell.**
   - "HR-GOV-A/B/C/D" war ein Zwischenmodell (S1).
   - Künftig: Checkpoint-Typen sind die Grundlage; Governance ist Aggregation.
   - Beispiel: Fallabschluss-Check = Aggregation over Checkpoints (Approbation YES AND Haftpflicht YES AND Genehmigung YES).

3. **Keine universelle Formularmaske.**
   - Jeder Checkpoint-Typ hat sein eigenes Verhalten in M2/M3/M5.
   - UI ist typ-bewusst; Select-Labels sind typ-spezifisch.
   - Beispiel: NACHWEIS_PFLICHT zeigt "Nachweis akzeptabel / unzureichend"; EXTERNAL_BESTAETIGUNG zeigt "Stelle hat bestätigt / hat abgelehnt".

4. **Checkpoints sind neutrale Infos mit Typverhalten.**
   - Ein Checkpoint NICHT: "Arzt kann tätig werden" (zu aggregiert).
   - Ein Checkpoint JA: "Approbation vorhanden", "KV-Genehmigung vorhanden", "Haftpflicht gültig" (je eins).
   - Aggregation: Falltyp-Katalog sagt, welche Checkpoints für "Arzt anstellen" nötig sind; M5 aggregiert zu "An Stellvertreter freigegeben".

5. **M2 ist nicht erzwungen.**
   - M2 ist Vorbereitung; M3 kann M2 skippen und direkt prüfen.
   - Beispiel: Registerstatus könnte M2 sein ("Intern geklärt?") oder M3-only ("M3 prüft online Register").
   - UI/UX entscheidet, ob/wann M2 angeboten wird.

6. **Externe Stellen sind vorkonfiguriert.**
   - Checkpoint-Katalog enthält Optional-Liste: "typische externe Stellen".
   - M4/Followup nutzt dies für Task-Generierung ("Anfrage an KV", "Kammer kontaktieren").

7. **Regelhinweise sind separate Strukturen.**
   - Nicht im Checkpoint-Katalog als `Checkpoint-Typ=REGELHINWEIS`.
   - Stattdessen: eigene Registry "Hints", keyed by `checkpoint_id`.
   - Beispiel: `hints["NC-APPROBATION"] = "Approbation gültig 5 Jahre (mit Ausnahmen)"`
   - M3-UI zeigt Hinweis als Tooltip bei Checkpoint.

8. **Tests müssen Typ-Konformität prüfen.**
   - Test: "Wenn Checkpoint NACHWEIS_PFLICHT, dann failureEffect ∈ [GATEKEEPER, BLOCKER, NONE]"
   - Test: "Wenn Checkpoint EXTERNAL_BESTAETIGUNG, dann braucht externe Stelle"
   - Test: "Wenn Checkpoint REGELHINWEIS, dann nicht in checkpointCatalog"

9. **Später: M4-Engine muss Type-aware sein.**
   - M4 (nicht in S1–S4 implementiert) soll Aufgaben/Tasks generieren.
   - Beispiel: Checkpoint NACHWEIS_PFLICHT + NO → Task "Nachweis anfordern"
   - Beispiel: Checkpoint EXTERNAL_BESTAETIGUNG + OPEN → Task "Stelle anfragen"

10. **Backwards Compatibility:**
    - Bestehende Checkpoints erhalten einen Typ (z.B. "NC-APPROBATION" → NACHWEIS_PFLICHT + GATEKEEPER).
    - Alte Snapshots ohne Typ: Fallback-Typ-Inferenz (z.B. DECISION → NACHWEIS_PFLICHT).
    - Migrationstest: "Alle bestehenden Checkpoints haben einen validen Typ".

---

## Glossar

| Begriff | Erklärung |
|---------|-----------|
| **Checkpoint** | Neutrale Informationseinheit; trägt genau ein Thema (z.B. "Approbation vorhanden?"). |
| **Checkpoint-Typ** | Verhaltensmuster: bestimmt M2/M3/M4/M5-Logik (z.B. NACHWEIS_PFLICHT). |
| **failureEffect** | Was passiert, wenn Checkpoint NO/OPEN ist: NONE, RISK, TODO, BLOCKER, GATEKEEPER. |
| **outcomeAudience** | Wer braucht das Ergebnis: CHEF, BACKOFFICE, ARZT, EXTERNE_STELLE. |
| **Falltyp** | Art des Office-Falls (z.B. "Arzt anstellen"). Falltyp → Checkpoint-Set. |
| **M2** | Vorbereitung: einfache Ja/Nein/Unklar-Fragen (optional). |
| **M3** | Bewertung: Prüfer bewertet Checkpoint (obligatorisch). |
| **M4** | Followup: Aufgaben/Tasks generieren (future). |
| **M5** | Dokumentation: neutraler Summary (obligatorisch). |
| **Regelhinweis** | Informations-Kontext (nicht Checkpoint); z.B. Gesetzes-Referenz. |
| **Gatekeeper** | Checkpoint, dessen Fehlen Fall stoppt (z.B. Approbation). |
| **Blocker** | Checkpoint, dessen Fehlen Fall blockiert bis geklärt. |
| **Risiko** | Checkpoint, dessen Fehlen Fall mit Auflagen fortbar. |

---

# Typologie-Validierung über Fälle

- **Stabilisierte Typen:** NACHWEIS_PFLICHT, EXTERNE_BESTAETIGUNG, VERFAHRENSWEG, REGEL_PARAMETER, INTERNE_ENTSCHEIDUNG und KONTEXT_INFORMATION funktionieren konsistent in allen dokumentierten Fällen.
- **Sichtbare Überschneidungen:** EXTERNE_BESTAETIGUNG und VERFAHRENSWEG treten häufig gemeinsam auf, bleiben aber fachlich trennbar als zwei Einzelinformationen (Status/Rückmeldung vs. Prozessschritt).
- **Häufige Typen:** NACHWEIS_PFLICHT, EXTERNE_BESTAETIGUNG und VERFAHRENSWEG treten überdurchschnittlich oft auf; KONTEXT_INFORMATION ergänzt in beiden neuen Fällen.
- **Neue Typen nötig?:** Aktuell nein. Die bestehenden Typen decken die dokumentierten Fälle ohne strukturelle Lücke ab.

# Offene fachliche Fragen

- Formulierungsqualität für unerfahrene Nutzer: Welche Formulierungen minimieren Missverständnisse in M2- und M3-Bewertungen?
- Platzierung von Regelhinweisen: Wo werden Hinweise am zuverlässigsten wahrgenommen, ohne als Checkpoint missverstanden zu werden?
- Unterschied Risiko vs Blocker: Welche klaren Schwellenwerte gelten je Falltyp für die Zuordnung?
- Wann M2 sinnvoll ist: Für welche Checkpoints bringt vorbereitende Erhebung nachweislich einen robusteren M3-Durchlauf?
- Wann M3-only sinnvoll ist: Bei welchen Checkpoints ist direkte M3-Prüfung fachlich robuster als M2-Vorbereitung?

---

**Version:** 1.0  
**Status:** Architektur-Grundlage für Phase B+  
**Nächste Phase:** Code-Refactoring nach diesem Modell
