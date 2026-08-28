# Praxisprozess-Bibliothek — Aktueller Stand

**Quelle:** Statischer Katalog (`lib/practiceProcesses/checkpointCatalog.ts` + `caseProfileCatalog.ts`)
**DB-Architektur:** DB-Einträge würden den Katalog überschreiben (DB-first via `checkpointLibrary.ts` / `caseProfileLibrary.ts`). DB-Overrides konnten in dieser Umgebung nicht abgerufen werden — dieser Export gibt ausschließlich den **statischen Fallback-Katalog** wieder.
**Stand:** 2026-08-20

---

## Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Gesamtzahl Checkpoints | **41** |
| Gesamtzahl Orientierungsanker | **172** |
| Gesamtzahl Praxisfälle | **29** |
| Checkpoints ohne Praxisfall-Referenz | **3** |
| Bewusst offene Checkpoints (EXTERNAL_REVIEW_NEEDED) | **3** |

**Checkpoints ohne Praxisfall-Referenz:**
- `termin-vorhanden`
- `hausarztvermittlungsfall`
- `kontrollinhalt-festlegen`

**Bewusst offene Checkpoints (EXTERNAL_REVIEW_NEEDED):**
- `einwilligung-vorhanden` — konkrete gesetzliche Formerfordernisse (z. B. Schriftformgebot)
- `hausarztvermittlungsfall` — Anker erfordern Klärung der regulatorischen Voraussetzungen des Hausarztvermittlungsfalls
- `berechtigung-pruefen` — rechtliche Anforderungen an Nachweis und Form der Bevollmächtigung

**Praxisfälle mit den meisten Checkpoints:**

| Praxisfall | Anzahl Checkpoints |
|---|---|
| `medikamentenaenderung` | 20 |
| `rezeptanfrage-ohne-arzt` | 17 |
| `krankenhausbrief-eingegangen` | 12 |
| `facharztbericht-bearbeiten` | 11 |
| `facharztbericht-eingegangen` | 10 |
| `patient-bringt-unterlagen` | 10 |
| `neupatient` | 10 |

---

## A. Checkpoint-Katalog

### 1. `patient-bekannt` — Patient bekannt

**Beschreibung:** Der Patient ist der Praxis als Bestandspatient bekannt.

**Orientierungsanker (8):**

| Anker-ID | Ankertext |
|---|---|
| patient-bekannt-a1 | Patient ist im Praxissystem angelegt |
| patient-bekannt-a2 | Name ist erfasst |
| patient-bekannt-a3 | Geburtsdatum ist erfasst |
| patient-bekannt-a4 | Adresse ist erfasst |
| patient-bekannt-a5 | Telefonnummer ist erfasst |
| patient-bekannt-a6 | Mobilnummer für SMS-Kommunikation ist erfasst |
| patient-bekannt-a7 | E-Mail-Adresse ist erfasst |
| patient-bekannt-a8 | Patient nutzt das von der Praxis eingesetzte digitale Kommunikations-/Terminportal |

**Referenziert in Praxisfällen (15):** rezeptanfrage-ohne-arzt, medikamentenaenderung, krankenhausbrief-eingegangen, facharztbericht-eingegangen, patient-bringt-unterlagen, neupatient, terminanfrage, ueberweisungsanfrage, impfung-empfehlen, unterlagen-aushaendigen, patient-ohne-unterlagen, versicherungsnachweis-fehlt, akteneinsicht, angehoerige-ohne-berechtigung, unzustellbare-post

---

### 2. `dauermedikation-vorhanden` — Dauermedikation vorhanden

**Beschreibung:** Die Dauermedikation des Patienten ist in der Praxis bekannt und dokumentiert.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| dauermedikation-vorhanden-a1 | Dauermedikation wurde bereits durch die Praxis verordnet |
| dauermedikation-vorhanden-a2 | Dauermedikation ist im Krankenblatt / in der Patientenakte dokumentiert |
| dauermedikation-vorhanden-a3 | Dauermedikation ist im Praxissystem für den Patienten erkennbar hinterlegt |
| dauermedikation-vorhanden-a4 | Dauermedikation aus externer Verordnung ist in der Patientenakte dokumentiert |

**Referenziert in Praxisfällen (3):** rezeptanfrage-ohne-arzt, medikamentenaenderung, neupatient

---

### 3. `dauermedikation-abgleichen` — Dauermedikation abgleichen

**Beschreibung:** Extern vorliegende Medikationsinformationen werden mit der in der Praxis dokumentierten Dauermedikation abgeglichen.

**Orientierungsanker (8):**

| Anker-ID | Ankertext |
|---|---|
| dauermedikation-abgleichen-a1 | Medikament / Wirkstoff wird abgeglichen |
| dauermedikation-abgleichen-a2 | Dosierung wird abgeglichen |
| dauermedikation-abgleichen-a3 | Einnahmeschema wird abgeglichen |
| dauermedikation-abgleichen-a4 | Verordnender / behandelnder Arzt wird abgeglichen |
| dauermedikation-abgleichen-a5 | Abgleich mit Facharztberichten |
| dauermedikation-abgleichen-a6 | Abgleich mit Krankenhaus-/Entlassunterlagen |
| dauermedikation-abgleichen-a7 | Abgleich mit Pflegedokumentation / Pflegeeinrichtung |
| dauermedikation-abgleichen-a8 | Abgleich mit E-Medikationsplan |

**Referenziert in Praxisfällen (4):** rezeptanfrage-ohne-arzt, medikamentenaenderung, krankenhausbrief-eingegangen, facharztbericht-bearbeiten

---

### 4. `kontrolle-aktuell` — Kontrolle aktuell

**Beschreibung:** Es ist geklärt, ob eine für den jeweiligen Praxisfall relevante Kontrolle ausreichend aktuell ist.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| kontrolle-aktuell-a1 | Kontrolle hat in der eigenen Praxis stattgefunden |
| kontrolle-aktuell-a2 | Kontrolle durch eine externe behandelnde Stelle wird berücksichtigt |
| kontrolle-aktuell-a3 | Praxisübliches Kontrollintervall wird berücksichtigt |
| kontrolle-aktuell-a4 | Datum der letzten Kontrolle ist dokumentiert |

**Referenziert in Praxisfällen (2):** rezeptanfrage-ohne-arzt, medikamentenaenderung

---

### 5. `diagnose-dokumentiert` — Diagnose dokumentiert

**Beschreibung:** Eine relevante Diagnose des Patienten ist in der Praxis nachvollziehbar dokumentiert.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| diagnose-dokumentiert-a1 | Diagnose ist in der Patientenakte dokumentiert |
| diagnose-dokumentiert-a2 | Datum der Erstdiagnose ist dokumentiert |
| diagnose-dokumentiert-a3 | Diagnose wurde fachärztlich bestätigt |
| diagnose-dokumentiert-a4 | Fachärztlicher Bericht zur Diagnose liegt vor |

**Referenziert in Praxisfällen (3):** rezeptanfrage-ohne-arzt, medikamentenaenderung, neupatient

---

### 6. `anamnese-dokumentiert` — Anamnese dokumentiert

**Beschreibung:** Eine für den jeweiligen Praxisprozess relevante Anamnese ist im Krankenblatt dokumentiert.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| anamnese-dokumentiert-a1 | Eigenangaben des Patienten sind erfasst |
| anamnese-dokumentiert-a2 | Vorinformationen / Fremdangaben aus anderen Quellen sind erfasst |
| anamnese-dokumentiert-a3 | Datum der Anamnese ist dokumentiert |

**Referenziert in Praxisfällen (1):** neupatient

---

### 7. `versicherungsnachweis-vorhanden` — Versicherungs-/Abrechnungsstatus geklärt

**Beschreibung:** Es ist grundsätzlich geklärt, auf welcher Grundlage der Patient behandelt bzw. abgerechnet wird.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| versicherungsnachweis-vorhanden-a1 | Status ist für das aktuelle Quartal geklärt |
| versicherungsnachweis-vorhanden-a2 | Status aus dem vorherigen Quartal kann berücksichtigt werden |
| versicherungsnachweis-vorhanden-a3 | Status ist innerhalb des von der Praxis festgelegten Zeitraums geklärt worden |

**Referenziert in Praxisfällen (5):** rezeptanfrage-ohne-arzt, medikamentenaenderung, ueberweisungsanfrage, neupatient, versicherungsnachweis-fehlt

---

### 8. `einwilligung-vorhanden` — Einwilligung vorhanden

> ⚠️ **EXTERNAL_REVIEW_NEEDED:** konkrete gesetzliche Formerfordernisse (z. B. Schriftformgebot)

**Beschreibung:** Wenn für den jeweiligen Vorgang eine Einwilligung relevant ist, wird abgebildet, in welcher Form sie nach Praxisstandard vorliegen soll.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| einwilligung-vorhanden-a1 | Mündliche Einwilligung liegt vor |
| einwilligung-vorhanden-a2 | Schriftliche Einwilligung liegt vor |
| einwilligung-vorhanden-a3 | Digitale / elektronische Einwilligung liegt vor |
| einwilligung-vorhanden-a4 | Einwilligung ist im Krankenblatt dokumentiert |

**Referenziert in Praxisfällen (1):** neupatient

---

### 9. `unterlagen-vorhanden` — Dokument vorhanden

**Beschreibung:** Ein relevantes Dokument liegt der Praxis vor.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| unterlagen-vorhanden-a1 | Dokument ist lesbar |
| unterlagen-vorhanden-a2 | Dokument liegt in vollständiger Fassung vor |
| unterlagen-vorhanden-a3 | Dokumentdatum ist bekannt |
| unterlagen-vorhanden-a4 | Absender ist bekannt |

**Referenziert in Praxisfällen (5):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, patient-bringt-unterlagen, neupatient

---

### 10. `termin-vorhanden` — Termin vorhanden

**Beschreibung:** Für den aktuellen Anlass ist ein Termin vereinbart.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| termin-vorhanden-a1 | Hat der Patient einen Termin für diesen Anlass? |
| termin-vorhanden-a2 | Ist ein vom Krankenhaus empfohlener Folgetermin bereits vereinbart? |

**Referenziert in Praxisfällen (0):** — nicht referenziert

---

### 11. `patientenzuordnung-pruefen` — Patientenzuordnung prüfen

**Beschreibung:** Es wird geprüft, ob das vorliegende Dokument bzw. die vorliegende Information eindeutig dem richtigen Patienten zugeordnet ist.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| patientenzuordnung-pruefen-a1 | Name stimmt überein |
| patientenzuordnung-pruefen-a2 | Geburtsdatum stimmt überein |
| patientenzuordnung-pruefen-a3 | Weitere Patientenkennung stimmt überein |
| patientenzuordnung-pruefen-a4 | Zuordnung im Praxissystem ist eindeutig |

**Referenziert in Praxisfällen (7):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, patient-bringt-unterlagen, dokument-unklar, dokument-nicht-zuordenbar, dokument-fehlzugeordnet

---

### 12. `dokument-digitalisieren` — Dokument digitalisieren

**Beschreibung:** Ein physisch vorliegendes Dokument wird eingescannt und digital im Praxissystem verfügbar gemacht.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| dokument-digitalisieren-a1 | Ist das Dokument vollständig und lesbar eingescannt? |
| dokument-digitalisieren-a2 | Ist das digitalisierte Dokument im Praxissystem gespeichert und abrufbar? |

**Referenziert in Praxisfällen (4):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, patient-bringt-unterlagen

---

### 13. `dokument-kennzeichnen` — Dokument kennzeichnen

**Beschreibung:** Das Dokument wird mit den notwendigen Metadaten (Dokumenttyp, Datum, Absender) versehen, sodass es ohne Rückfrage eingeordnet werden kann.

**Hinweis:** Mindestens Dokumenttyp und Datum müssen erkennbar sein.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| dokument-kennzeichnen-a1 | Ist der Dokumenttyp erkennbar oder eingetragen? |
| dokument-kennzeichnen-a2 | Ist das Dokumentdatum vermerkt? |
| dokument-kennzeichnen-a3 | Ist der Absender bzw. die ausstellende Stelle erkennbar? |

**Referenziert in Praxisfällen (7):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, patient-bringt-unterlagen, dokument-unklar, dokument-nicht-zuordenbar, dokument-fehlzugeordnet

---

### 14. `dokument-weiterleiten` — Dokument weiterleiten

**Beschreibung:** Ein Dokument bzw. Vorgang wird an eine andere Person oder Stelle weitergeleitet.

**Orientierungsanker (7):**

| Anker-ID | Ankertext |
|---|---|
| dokument-weiterleiten-a1 | Postalische Weiterleitung |
| dokument-weiterleiten-a2 | Weiterleitung per Fax |
| dokument-weiterleiten-a3 | Weiterleitung per E-Mail |
| dokument-weiterleiten-a4 | Weiterleitung über einen digitalen Übermittlungsweg / ein digitales System |
| dokument-weiterleiten-a5 | Empfangsbestätigung/Rückmeldung ist erforderlich |
| dokument-weiterleiten-a6 | Weiterleitung wird dokumentiert |
| dokument-weiterleiten-a7 | Grund der Weiterleitung wird dokumentiert |

**Referenziert in Praxisfällen (9):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, facharztbericht-bearbeiten, patient-bringt-unterlagen, dokument-unklar, dokument-nicht-zuordenbar, dokument-fehlzugeordnet, eingang-mit-maengeln

---

### 15. `dokument-dem-patienten-bereitstellen` — Dokument bereitstellen

**Beschreibung:** Ein Dokument wird einem vorgesehenen Empfänger zugänglich gemacht.

**Hinweis:** Dokument bereitstellen: Empfänger erhält Zugang zum Dokument. Dokument weiterleiten: Dokument/Vorgang wird im Prozess zur weiteren Bearbeitung weitergegeben.

**Orientierungsanker (9):**

| Anker-ID | Ankertext |
|---|---|
| dokument-dem-patienten-bereitstellen-a1 | Patient |
| dokument-dem-patienten-bereitstellen-a2 | Weiterbehandelnder Arzt / andere Praxis |
| dokument-dem-patienten-bereitstellen-a3 | Andere beteiligte Stelle |
| dokument-dem-patienten-bereitstellen-a4 | Persönliche Aushändigung |
| dokument-dem-patienten-bereitstellen-a5 | Postalischer Versand |
| dokument-dem-patienten-bereitstellen-a6 | Bereitstellung per E-Mail |
| dokument-dem-patienten-bereitstellen-a7 | Bereitstellung über digitales Portal / Kommunikationssystem |
| dokument-dem-patienten-bereitstellen-a8 | Bereitstellung über die ePA |
| dokument-dem-patienten-bereitstellen-a9 | Direkte digitale Übermittlung an andere Praxis / anderen Arzt |

**Referenziert in Praxisfällen (8):** rezeptanfrage-ohne-arzt, medikamentenaenderung, facharztbericht-bearbeiten, ueberweisungsanfrage, befundanfrage, laborbefund-mitteilen, unterlagen-aushaendigen, akteneinsicht

---

### 16. `dringlichkeitsbedarf-erkennen` — Dringlichkeitsbedarf erkennen

**Beschreibung:** Ein eingehender Vorgang wird daraufhin eingeschätzt, ob eine ärztliche Dringlichkeitsbeurteilung erforderlich ist.

**Hinweis:** Hier wird erkannt, ob zeitnah ärztlich geprüft oder gehandelt werden muss. Eine weitergehende Notfall- oder Eskalationsentscheidung ist damit nicht automatisch abgebildet.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| dringlichkeitsbedarf-erkennen-a1 | Enthält der Vorgang Hinweise auf möglichen akuten Handlungsbedarf? |
| dringlichkeitsbedarf-erkennen-a2 | Wurde der Dringlichkeitsbedarf bei Unklarheit ärztlich eingeschätzt? |

**Referenziert in Praxisfällen (6):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, facharztbericht-bearbeiten, patient-bringt-unterlagen, verschlechterung-gemeldet

---

### 17. `laborbefund-fachlich-bewerten` — Laborbefund fachlich bewerten

**Beschreibung:** Der Laborbefund wird fachlich bewertet und das Ergebnis der Bewertung nachvollziehbar dokumentiert.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| laborbefund-fachlich-bewerten-a1 | Fachliche Bewertung ist dokumentiert |
| laborbefund-fachlich-bewerten-a2 | Handlungsbedarf ist dokumentiert |
| laborbefund-fachlich-bewerten-a3 | Erforderliche weitere Handlung ist veranlasst |

**Referenziert in Praxisfällen (1):** laborbefund-eingegangen

---

### 18. `bezug-zu-laufendem-fall-pruefen` — Bezug zu laufendem Fall prüfen

**Beschreibung:** Es wird geprüft, ob der Eingang zu einem bekannten Anliegen oder einer laufenden Behandlung gehört.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| bezug-zu-laufendem-fall-pruefen-a1 | Gibt es zu diesem Eingang bereits einen offenen Fall oder ein bekanntes Anliegen? |
| bezug-zu-laufendem-fall-pruefen-a2 | Wurde der Eingang dem passenden Fall zugeordnet? |

**Referenziert in Praxisfällen (6):** krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, facharztbericht-bearbeiten, patient-bringt-unterlagen, dokument-unklar

---

### 19. `facharztbericht-einordnen` — Externen medizinischen Bericht einordnen

**Beschreibung:** Ein vorliegender externer medizinischer Bericht wird in den bestehenden Behandlungszusammenhang des Patienten eingeordnet.

**Orientierungsanker (5):**

| Anker-ID | Ankertext |
|---|---|
| facharztbericht-einordnen-a1 | Bericht wird mit der Patientenakte abgeglichen |
| facharztbericht-einordnen-a2 | Neue Diagnosen / Änderungen werden berücksichtigt |
| facharztbericht-einordnen-a3 | Therapie- / Medikationsänderungen werden berücksichtigt |
| facharztbericht-einordnen-a4 | Weiterer Handlungsbedarf wird dokumentiert |
| facharztbericht-einordnen-a5 | Erforderliche weitere Handlung wird veranlasst |

**Referenziert in Praxisfällen (3):** medikamentenaenderung, krankenhausbrief-eingegangen, facharztbericht-bearbeiten

---

### 20. `anlass-der-einbestellung-pruefen` — Anlass der Einbestellung prüfen

**Beschreibung:** Es wird geklärt, warum der Patient in die Praxis kommen bzw. ärztlich gesehen werden soll.

**Hinweis:** Hier wird entschieden, ob eine Einbestellung erforderlich ist. Kontaktaufnahme und Terminvereinbarung erfolgen anschließend.

**Orientierungsanker (6):**

| Anker-ID | Ankertext |
|---|---|
| anlass-der-einbestellung-pruefen-a1 | Kontrolluntersuchung erforderlich |
| anlass-der-einbestellung-pruefen-a2 | Besprechung eines Befundes / Ergebnisses erforderlich |
| anlass-der-einbestellung-pruefen-a3 | Medikamenten- / Therapiekontrolle erforderlich |
| anlass-der-einbestellung-pruefen-a4 | Ärztliche Beurteilung neuer Beschwerden erforderlich |
| anlass-der-einbestellung-pruefen-a5 | Weiterführende Untersuchung erforderlich |
| anlass-der-einbestellung-pruefen-a6 | Externe Empfehlung zur Wiedervorstellung liegt vor |

**Referenziert in Praxisfällen (3):** rezeptanfrage-ohne-arzt, medikamentenaenderung, patient-einbestellen

---

### 21. `zeitpunkt-der-einbestellung-festlegen` — Zeitpunkt der Einbestellung festlegen

**Beschreibung:** Der Zeitpunkt für die Einbestellung wird festgelegt — so dass der Termin weder zu früh noch zu spät liegt.

**Hinweis:** Hier wird der erforderliche Zeitraum bzw. die zeitliche Priorität festgelegt — nicht der konkrete Termin vereinbart.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| zeitpunkt-der-einbestellung-festlegen-a1 | Liegt der geplante Termin im richtigen Abstand zur letzten Untersuchung? |
| zeitpunkt-der-einbestellung-festlegen-a2 | Passt der Zeitpunkt zum aktuellen Anlass (z. B. Laborkontrolle, Medikamentenkontrolle)? |

**Referenziert in Praxisfällen (3):** rezeptanfrage-ohne-arzt, medikamentenaenderung, patient-einbestellen

---

### 22. `kontaktform-festlegen` — Erforderliche Kontaktform festlegen

**Beschreibung:** Es ist festgelegt, welche Form des Kontakts für den jeweiligen Vorgang erforderlich oder ausreichend ist.

**Hinweis:** Hier wird der Kontaktstandard für diesen Sachverhalt konfiguriert. Die tatsächliche Kontaktaufnahme ist ein eigener Prozessschritt.

**Orientierungsanker (5):**

| Anker-ID | Ankertext |
|---|---|
| kontaktform-festlegen-a1 | Persönlicher Kontakt in der Praxis |
| kontaktform-festlegen-a2 | Telefonischer Kontakt |
| kontaktform-festlegen-a3 | Videosprechstunde |
| kontaktform-festlegen-a4 | Asynchroner digitaler Kontakt |
| kontaktform-festlegen-a5 | Kein erneuter Kontakt erforderlich |

**Referenziert in Praxisfällen (7):** rezeptanfrage-ohne-arzt, medikamentenaenderung, facharztbericht-bearbeiten, rueckrufbitte, befundanfrage, laborbefund-mitteilen, patient-erinnern

---

### 23. `patient-telefonisch-kontaktieren` — Patient direkt kontaktieren

**Beschreibung:** Synchroner Kontakt, bei dem unmittelbar festgestellt werden kann, ob der Patient erreicht wurde und ein direkter Austausch möglich ist.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| patient-telefonisch-kontaktieren-a1 | Telefonischer Kontakt |
| patient-telefonisch-kontaktieren-a2 | Kontaktversuch wird dokumentiert |
| patient-telefonisch-kontaktieren-a3 | Gesprächsinhalt wird dokumentiert |

**Referenziert in Praxisfällen (3):** rezeptanfrage-ohne-arzt, medikamentenaenderung, unzustellbare-post

---

### 24. `patient-digital-kontaktieren` — Patient asynchron kontaktieren

**Beschreibung:** Asynchroner Kontakt, bei dem eine Nachricht übermittelt wird, ohne dass unmittelbare Kenntnisnahme oder direkte Reaktion des Patienten gesichert ist.

**Orientierungsanker (6):**

| Anker-ID | Ankertext |
|---|---|
| patient-digital-kontaktieren-a1 | Kontakt per SMS |
| patient-digital-kontaktieren-a2 | Kontakt per E-Mail |
| patient-digital-kontaktieren-a3 | Kontakt über das digitale Kommunikations-/Patientenportal |
| patient-digital-kontaktieren-a4 | Zustellbestätigung ist erforderlich |
| patient-digital-kontaktieren-a5 | Lesebestätigung ist erforderlich |
| patient-digital-kontaktieren-a6 | Kontaktaufnahme wird dokumentiert |

**Referenziert in Praxisfällen (2):** rezeptanfrage-ohne-arzt, medikamentenaenderung

---

### 25. `erneuten-kontaktversuch-durchfuehren` — Erneuten Kontaktversuch durchführen

**Beschreibung:** Ein vorheriger Kontaktversuch ist nicht erfolgreich gewesen — es soll weiter versucht werden, den Patienten zu erreichen bzw. sicherzustellen, dass die notwendige Information ihn erreicht.

**Hinweis:** Gilt nur, wenn ein früherer Kontaktversuch gescheitert ist.

**Orientierungsanker (8):**

| Anker-ID | Ankertext |
|---|---|
| erneuten-kontaktversuch-durchfuehren-a1 | Erneuter direkter Kontaktversuch |
| erneuten-kontaktversuch-durchfuehren-a2 | Erneuter asynchroner Kontaktversuch |
| erneuten-kontaktversuch-durchfuehren-a3 | Anderer Kontaktweg wird genutzt |
| erneuten-kontaktversuch-durchfuehren-a4 | Kontaktversuch über hinterlegte / bevollmächtigte Kontaktperson |
| erneuten-kontaktversuch-durchfuehren-a5 | Kontaktversuch über Pflegedienst / Pflegeeinrichtung |
| erneuten-kontaktversuch-durchfuehren-a6 | Weitere Kontaktversuche werden dokumentiert |
| erneuten-kontaktversuch-durchfuehren-a7 | Zeitpunkt / Frist für nächsten Kontaktversuch wird festgelegt |
| erneuten-kontaktversuch-durchfuehren-a8 | Erfolglos ausgeschöpfte Kontaktversuche werden dokumentiert |

**Referenziert in Praxisfällen (1):** patient-nicht-erreichbar

---

### 26. `termin-vereinbaren` — Termin vereinbaren

**Beschreibung:** Für den vorgesehenen Anlass wird ein konkreter Termin vereinbart.

**Hinweis:** Hier wird ein konkreter Termin vereinbart. Ob eine Einbestellung erforderlich ist und in welchem Zeitraum sie erfolgen soll, wird separat festgelegt.

**Orientierungsanker (5):**

| Anker-ID | Ankertext |
|---|---|
| termin-vereinbaren-a1 | Terminart ist festgelegt |
| termin-vereinbaren-a2 | Terminzeitpunkt ist festgelegt |
| termin-vereinbaren-a3 | Termin ist im Praxissystem eingetragen |
| termin-vereinbaren-a4 | Patient hat eine Terminbestätigung erhalten |
| termin-vereinbaren-a5 | Erforderliche Vorbereitungen / Hinweise zum Termin werden mitgeteilt |

**Referenziert in Praxisfällen (1):** terminanfrage

---

### 27. `angefragtes-medikament-pruefen` — Angefragtes Medikament prüfen

**Beschreibung:** Die für die Bearbeitung notwendigen Angaben zu einem angefragten Medikament werden eindeutig geklärt.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| angefragtes-medikament-pruefen-a1 | Medikament / Präparat ist eindeutig bezeichnet |
| angefragtes-medikament-pruefen-a2 | Wirkstärke ist eindeutig |
| angefragtes-medikament-pruefen-a3 | Darreichungsform ist eindeutig |
| angefragtes-medikament-pruefen-a4 | Dosierung / Einnahme ist eindeutig |

**Referenziert in Praxisfällen (2):** rezeptanfrage-ohne-arzt, medikamentenaenderung

---

### 28. `rezept-erstellen` — Rezept erstellen

**Beschreibung:** Das Rezept wird auf Grundlage der zuvor geklärten Informationen erstellt.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| rezept-erstellen-a1 | Rezeptart ist festgelegt (z. B. Kassenrezept / Privatrezept) |
| rezept-erstellen-a2 | Erforderliche Angaben werden in das Rezept übernommen |
| rezept-erstellen-a3 | Ärztliche Freigabe ist erforderlich |

**Referenziert in Praxisfällen (2):** rezeptanfrage-ohne-arzt, medikamentenaenderung

---

### 29. `ueberweisung-erstellen` — Überweisung erstellen

**Beschreibung:** Die Überweisung wird auf Grundlage der zuvor geklärten Informationen erstellt.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| ueberweisung-erstellen-a1 | Erforderliche Angaben werden in die Überweisung übernommen |
| ueberweisung-erstellen-a2 | Ärztliche Freigabe ist erforderlich |

**Referenziert in Praxisfällen (1):** ueberweisungsanfrage

---

### 30. `anlass-einer-ueberweisung-pruefen` — Anlass einer Überweisung prüfen

**Beschreibung:** Es ist geklärt, warum die Überweisung erfolgt.

**Hinweis:** Hier wird geklärt, warum eine Überweisung benötigt wird. Die konkrete medizinische Fragestellung wird separat festgelegt.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| anlass-einer-ueberweisung-pruefen-a1 | Anlass / Begründung der Überweisung ist dokumentiert |
| anlass-einer-ueberweisung-pruefen-a2 | Anlass ergibt sich aus einer ärztlichen Anordnung |
| anlass-einer-ueberweisung-pruefen-a3 | Anlass ergibt sich aus dokumentiertem Befund / Behandlungsverlauf |
| anlass-einer-ueberweisung-pruefen-a4 | Zweck / Art der Überweisung ist geklärt |

**Referenziert in Praxisfällen (1):** ueberweisungsanfrage

---

### 31. `fragestellung-der-ueberweisung-klaeren` — Fragestellung der Überweisung klären

**Beschreibung:** Es ist geklärt, welche konkrete Fragestellung bzw. welcher Auftrag mit der Überweisung verbunden ist.

**Hinweis:** Hier wird die konkrete medizinische Fragestellung der Überweisung festgelegt. Der grundsätzliche Anlass der Überweisung wird separat geprüft.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| fragestellung-der-ueberweisung-klaeren-a1 | Konkrete Fragestellung / Auftrag ist dokumentiert |
| fragestellung-der-ueberweisung-klaeren-a2 | Relevante Diagnose ist bekannt |
| fragestellung-der-ueberweisung-klaeren-a3 | Relevante Vorinformationen / Befunde sind bekannt |

**Referenziert in Praxisfällen (1):** ueberweisungsanfrage

---

### 32. `hausarztvermittlungsfall` — Hausarztvermittlungsfall

> ⚠️ **EXTERNAL_REVIEW_NEEDED:** Anker erfordern Klärung der regulatorischen Voraussetzungen des Hausarztvermittlungsfalls

**Beschreibung:** Es wird geklärt, ob für diesen Vorgang die Terminvermittlung durch die Hausarztpraxis als Hausarztvermittlungsfall genutzt wird.

**Orientierungsanker (0):** — keine Anker definiert

**Referenziert in Praxisfällen (0):** — nicht referenziert

---

### 33. `kontrollinhalt-festlegen` — Kontrollinhalt festlegen

**Beschreibung:** Es wird festgelegt, welche Untersuchungen oder Parameter bei der Kontrolluntersuchung überprüft werden sollen.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| kontrollinhalt-festlegen-a1 | Ist klar, was bei der Kontrolle überprüft werden soll? |
| kontrollinhalt-festlegen-a2 | Sind alle relevanten Punkte für diese Kontrolle bekannt? |

**Referenziert in Praxisfällen (0):** — nicht referenziert

---

### 34. `zur-wiedervorlage-vormerken` — Zur Wiedervorlage vormerken

**Beschreibung:** Ein Vorgang soll zu einem späteren Zeitpunkt oder beim Eintritt einer bestimmten Bedingung erneut bearbeitet bzw. aufgegriffen werden.

**Orientierungsanker (6):**

| Anker-ID | Ankertext |
|---|---|
| zur-wiedervorlage-vormerken-a1 | Wiedervorlage zu einem festen Zeitpunkt |
| zur-wiedervorlage-vormerken-a2 | Wiedervorlage nach festgelegter Frist |
| zur-wiedervorlage-vormerken-a3 | Wiedervorlage bei Eintritt einer bestimmten Bedingung |
| zur-wiedervorlage-vormerken-a4 | Wiedervorlage ist im Praxissystem dokumentiert |
| zur-wiedervorlage-vormerken-a5 | Grund der Wiedervorlage ist dokumentiert |
| zur-wiedervorlage-vormerken-a6 | Zuständigkeit für die Wiedervorlage ist festgelegt |

**Referenziert in Praxisfällen (13):** rezeptanfrage-ohne-arzt, medikamentenaenderung, krankenhausbrief-eingegangen, laborbefund-eingegangen, facharztbericht-eingegangen, facharztbericht-bearbeiten, patient-bringt-unterlagen, eingang-mit-maengeln, verlaufskontakt, patient-nicht-erreichbar, unzustellbare-post, patient-ohne-unterlagen, versicherungsnachweis-fehlt

---

### 35. `patient-informieren` — Patient informieren

**Beschreibung:** Eine relevante Information wird in diesem Praxisprozess mitgeteilt.

**Hinweis:** Betrifft ausschließlich den Informationsinhalt. Empfänger, Kontaktwege und Dokumentbereitstellung sind eigenständige Checkpoints.

**Orientierungsanker (5):**

| Anker-ID | Ankertext |
|---|---|
| patient-informieren-a1 | Über Eingang / Vorliegen eines Ergebnisses oder Befundes informieren |
| patient-informieren-a2 | Über konkretes Ergebnis / konkreten Befund informieren |
| patient-informieren-a3 | Über den nächsten erforderlichen Schritt informieren |
| patient-informieren-a4 | Über erforderliche ärztliche Besprechung informieren |
| patient-informieren-a5 | Über ärztlich festgestellte Diagnose informieren |

**Referenziert in Praxisfällen (7):** rezeptanfrage-ohne-arzt, medikamentenaenderung, facharztbericht-bearbeiten, befundanfrage, laborbefund-mitteilen, patient-erinnern, impfung-empfehlen

---

### 36. `informationsempfaenger-festlegen` — Informationsempfänger festlegen

**Beschreibung:** Es ist festgelegt, an wen eine Information in diesem Praxisprozess weitergegeben wird.

**Hinweis:** Hier wird festgelegt, wer die Information erhält – nicht wie der Kontakt erfolgt und nicht ob ein Dokument bereitgestellt wird.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| informationsempfaenger-festlegen-a1 | Patient direkt |
| informationsempfaenger-festlegen-a2 | Hinterlegte / bevollmächtigte Kontaktperson |
| informationsempfaenger-festlegen-a3 | Pflegedienst / Pflegeeinrichtung |

**Referenziert in Praxisfällen (5):** rezeptanfrage-ohne-arzt, medikamentenaenderung, facharztbericht-bearbeiten, laborbefund-mitteilen, patient-erinnern

---

### 37. `unterlagen-anfordern` — Unterlagen anfordern

**Beschreibung:** Es wird festgelegt bzw. durchgeführt, wie benötigte externe Unterlagen beschafft werden.

**Orientierungsanker (10):**

| Anker-ID | Ankertext |
|---|---|
| unterlagen-anfordern-a1 | Praxis fordert die Unterlagen selbst an |
| unterlagen-anfordern-a2 | Patient wird gebeten, die Unterlagen selbst anzufordern bzw. zu beschaffen |
| unterlagen-anfordern-a3 | Vom Patienten |
| unterlagen-anfordern-a4 | Von einer anderen Arztpraxis / einem Facharzt |
| unterlagen-anfordern-a5 | Vom Krankenhaus |
| unterlagen-anfordern-a6 | Von Pflegeeinrichtung / Pflegedienst |
| unterlagen-anfordern-a7 | Von einer anderen beteiligten Stelle |
| unterlagen-anfordern-a8 | Benötigte Unterlagen sind konkret benannt |
| unterlagen-anfordern-a9 | Anforderung ist dokumentiert |
| unterlagen-anfordern-a10 | Zeitpunkt / Frist zur Prüfung des Eingangs ist festgelegt |

**Referenziert in Praxisfällen (8):** medikamentenaenderung, krankenhausbrief-eingegangen, facharztbericht-eingegangen, facharztbericht-bearbeiten, patient-bringt-unterlagen, eingang-mit-maengeln, neupatient, patient-ohne-unterlagen

---

### 38. `aktuellen-verlauf-erfassen` — Aktuellen Verlauf dokumentieren

**Beschreibung:** Der aktuelle Verlauf eines bereits bekannten Problems bzw. Sachverhalts ist im Krankenblatt nachvollziehbar dokumentiert.

**Orientierungsanker (4):**

| Anker-ID | Ankertext |
|---|---|
| aktuellen-verlauf-erfassen-a1 | Veränderung seit dem letzten Kontakt ist dokumentiert |
| aktuellen-verlauf-erfassen-a2 | Neue Beschwerden / Veränderungen sind dokumentiert |
| aktuellen-verlauf-erfassen-a3 | Wirkung bisheriger Maßnahmen ist dokumentiert |
| aktuellen-verlauf-erfassen-a4 | Zwischenzeitliche Behandlungen oder Therapieänderungen sind dokumentiert |

**Referenziert in Praxisfällen (3):** medikamentenaenderung, verlaufskontakt, verschlechterung-gemeldet

---

### 39. `impfbedarf-pruefen` — Impfbedarf prüfen

**Beschreibung:** Für den Patienten wird auf Basis des individuellen Profils geprüft, ob ein Impfbedarf besteht.

**Orientierungsanker (2):**

| Anker-ID | Ankertext |
|---|---|
| impfbedarf-pruefen-a1 | Ist für den Patienten ein konkreter Impfbedarf erkennbar? |
| impfbedarf-pruefen-a2 | Sind die relevanten Empfehlungen (z. B. STIKO, ggf. reisemedizinische Leitlinien) einbezogen? |

**Referenziert in Praxisfällen (1):** impfung-empfehlen

---

### 40. `berechtigung-pruefen` — Berechtigung prüfen

> ⚠️ **EXTERNAL_REVIEW_NEEDED:** rechtliche Anforderungen an Nachweis und Form der Bevollmächtigung

**Beschreibung:** Es wird geklärt, auf welcher Grundlage eine andere Person für den Patienten handeln oder Informationen erhalten kann, und ob beim konkreten Vorgang eine erneute Prüfung stattfindet.

**Orientierungsanker (5):**

| Anker-ID | Ankertext |
|---|---|
| berechtigung-pruefen-a1 | Generelle Berechtigung / Bevollmächtigung ist im Krankenblatt hinterlegt |
| berechtigung-pruefen-a2 | Berechtigung für den konkreten Vorgang wird geprüft |
| berechtigung-pruefen-a3 | Identität der handelnden Person wird beim konkreten Vorgang geprüft |
| berechtigung-pruefen-a4 | Identitätsnachweis wird beim konkreten Vorgang verlangt |
| berechtigung-pruefen-a5 | Gesetzliche Vertretung ist hinterlegt |

**Referenziert in Praxisfällen (2):** neupatient, angehoerige-ohne-berechtigung

---

### 41. `behandlerzuordnung-geklaert` — Behandlerzuordnung geklärt

**Beschreibung:** Es ist festgelegt, ob bzw. welchem Arzt, Behandler oder Praxisteam der Patient organisatorisch zugeordnet ist.

**Orientierungsanker (3):**

| Anker-ID | Ankertext |
|---|---|
| behandlerzuordnung-geklaert-a1 | Patient ist einem bestimmten Arzt / Behandler zugeordnet |
| behandlerzuordnung-geklaert-a2 | Patient ist einem bestimmten Praxisteam zugeordnet |
| behandlerzuordnung-geklaert-a3 | Zuordnung ist im Praxissystem dokumentiert |

**Referenziert in Praxisfällen (1):** neupatient

---

## B. Praxisfall-Katalog

### 1. `rezeptanfrage-ohne-arzt` — Rezeptanfrage ohne Arzt

**Beschreibung:** Ausstellung einer Folgeverordnung für eine bekannte Dauermedikation ohne persönliche Arztkonsultation.

**Anzahl Checkpoints:** 17

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | versicherungsnachweis-vorhanden | Patientenstatus |
| 3 | kontaktform-festlegen | Voraussetzungen |
| 4 | dauermedikation-vorhanden | Medizinische Prüfung |
| 5 | dauermedikation-abgleichen | Medizinische Prüfung |
| 6 | kontrolle-aktuell | Medizinische Prüfung |
| 7 | diagnose-dokumentiert | Medizinische Prüfung |
| 8 | angefragtes-medikament-pruefen | Medizinische Prüfung |
| 9 | rezept-erstellen | Abschluss |
| 10 | dokument-dem-patienten-bereitstellen | Abschluss |
| 11 | patient-informieren | Abschluss |
| 12 | informationsempfaenger-festlegen | Abschluss |
| 13 | patient-telefonisch-kontaktieren | Klärung |
| 14 | patient-digital-kontaktieren | Klärung |
| 15 | anlass-der-einbestellung-pruefen | Klärung |
| 16 | zeitpunkt-der-einbestellung-festlegen | Klärung |
| 17 | zur-wiedervorlage-vormerken | Klärung |

---

### 2. `medikamentenaenderung` — Medikamentenänderung

**Beschreibung:** Anfrage für ein neues, geändertes oder extern empfohlenes Medikament, das ärztliche Prüfung erfordert.

**Anzahl Checkpoints:** 20

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | versicherungsnachweis-vorhanden | Patientenstatus |
| 3 | kontaktform-festlegen | Voraussetzungen |
| 4 | dauermedikation-vorhanden | Medizinische Prüfung |
| 5 | angefragtes-medikament-pruefen | Medizinische Prüfung |
| 6 | dauermedikation-abgleichen | Medizinische Prüfung |
| 7 | diagnose-dokumentiert | Medizinische Prüfung |
| 8 | aktuellen-verlauf-erfassen | Medizinische Prüfung |
| 9 | kontrolle-aktuell | Medizinische Prüfung |
| 10 | facharztbericht-einordnen | Medizinische Prüfung |
| 11 | rezept-erstellen | Abschluss |
| 12 | patient-informieren | Abschluss |
| 13 | informationsempfaenger-festlegen | Abschluss |
| 14 | dokument-dem-patienten-bereitstellen | Abschluss |
| 15 | anlass-der-einbestellung-pruefen | Klärung |
| 16 | zeitpunkt-der-einbestellung-festlegen | Klärung |
| 17 | patient-telefonisch-kontaktieren | Klärung |
| 18 | patient-digital-kontaktieren | Klärung |
| 19 | unterlagen-anfordern | Klärung |
| 20 | zur-wiedervorlage-vormerken | Klärung |

---

### 3. `krankenhausbrief-eingegangen` — Krankenhausbrief eingegangen

**Beschreibung:** Eingang eines Entlass- oder Arztbriefs nach stationärem Aufenthalt: Vollständigkeit prüfen und dem Arzt zur Einordnung weiterleiten.

**Anzahl Checkpoints:** 12

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | patientenzuordnung-pruefen | Eingang |
| 3 | unterlagen-vorhanden | Eingang |
| 4 | dokument-digitalisieren | Verarbeitung |
| 5 | dokument-kennzeichnen | Verarbeitung |
| 6 | dringlichkeitsbedarf-erkennen | Einschätzung |
| 7 | bezug-zu-laufendem-fall-pruefen | Einschätzung |
| 8 | dauermedikation-abgleichen | Einordnung |
| 9 | facharztbericht-einordnen | Einordnung |
| 10 | dokument-weiterleiten | Abschluss |
| 11 | unterlagen-anfordern | Abschluss |
| 12 | zur-wiedervorlage-vormerken | Abschluss |

---

### 4. `laborbefund-eingegangen` — Laborbefund eingegangen

**Beschreibung:** Eingang eines Laborbefunds: Zuordnung prüfen und dem Arzt zur Bewertung weiterleiten.

**Anzahl Checkpoints:** 9

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patientenzuordnung-pruefen | Eingang |
| 2 | unterlagen-vorhanden | Eingang |
| 3 | dokument-digitalisieren | Verarbeitung |
| 4 | dokument-kennzeichnen | Verarbeitung |
| 5 | dringlichkeitsbedarf-erkennen | Einschätzung |
| 6 | bezug-zu-laufendem-fall-pruefen | Einschätzung |
| 7 | laborbefund-fachlich-bewerten | Befundbearbeitung |
| 8 | dokument-weiterleiten | Abschluss |
| 9 | zur-wiedervorlage-vormerken | Abschluss |

---

### 5. `facharztbericht-eingegangen` — Facharztbericht eingegangen

**Beschreibung:** Eingang eines Facharztberichts: Vollständigkeit prüfen und dem Arzt zur Einordnung weiterleiten.

**Anzahl Checkpoints:** 10

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | patientenzuordnung-pruefen | Eingang |
| 3 | unterlagen-vorhanden | Eingang |
| 4 | dokument-digitalisieren | Verarbeitung |
| 5 | dokument-kennzeichnen | Verarbeitung |
| 6 | dringlichkeitsbedarf-erkennen | Einschätzung |
| 7 | bezug-zu-laufendem-fall-pruefen | Einschätzung |
| 8 | dokument-weiterleiten | Abschluss |
| 9 | unterlagen-anfordern | Abschluss |
| 10 | zur-wiedervorlage-vormerken | Abschluss |

---

### 6. `facharztbericht-bearbeiten` — Facharztbericht bearbeiten

**Beschreibung:** Ein eingegangener Facharztbericht wird hausärztlich eingeordnet und der Patient über das Ergebnis informiert.

**Anzahl Checkpoints:** 11

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | dringlichkeitsbedarf-erkennen | Einschätzung |
| 2 | bezug-zu-laufendem-fall-pruefen | Einschätzung |
| 3 | dauermedikation-abgleichen | Medizinische Einordnung |
| 4 | facharztbericht-einordnen | Medizinische Einordnung |
| 5 | patient-informieren | Patientenkommunikation |
| 6 | informationsempfaenger-festlegen | Patientenkommunikation |
| 7 | kontaktform-festlegen | Patientenkommunikation |
| 8 | dokument-dem-patienten-bereitstellen | Patientenkommunikation |
| 9 | dokument-weiterleiten | Abschluss |
| 10 | unterlagen-anfordern | Abschluss |
| 11 | zur-wiedervorlage-vormerken | Abschluss |

---

### 7. `dokument-unklar` — Dokument unklar

**Beschreibung:** Ein eingehender Vorgang kann nicht eindeutig klassifiziert oder zugeordnet werden — Dokumenttyp, Absender oder Patientenbezug sind unklar.

**Anzahl Checkpoints:** 5

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | dokument-kennzeichnen | Klärung |
| 2 | patientenzuordnung-pruefen | Klärung |
| 3 | bezug-zu-laufendem-fall-pruefen | Klärung |
| 4 | dokument-weiterleiten | Abschluss |
| 5 | zur-wiedervorlage-vormerken | Abschluss |

---

### 8. `dokument-nicht-zuordenbar` — Dokument nicht zuordenbar

**Beschreibung:** Ein Dokument liegt vor, kann aber keinem Patienten in der Praxis zugeordnet werden.

**Anzahl Checkpoints:** 4

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patientenzuordnung-pruefen | Klärung |
| 2 | dokument-kennzeichnen | Klärung |
| 3 | dokument-weiterleiten | Abschluss |
| 4 | zur-wiedervorlage-vormerken | Abschluss |

---

### 9. `dokument-fehlzugeordnet` — Dokument fehlzugeordnet

**Beschreibung:** Ein Dokument ist einem falschen Patienten zugeordnet. Der korrekte Patient ist identifizierbar.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patientenzuordnung-pruefen | Korrektur |
| 2 | dokument-kennzeichnen | Korrektur |
| 3 | dokument-weiterleiten | Abschluss |

---

### 10. `eingang-mit-maengeln` — Eingang mit Mängeln

**Beschreibung:** Ein eingegangenes Dokument ist mangelhaft — unvollständig, unleserlich, abgeschnitten oder fehlerhaft gescannt.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | unterlagen-anfordern | Nachforderung |
| 2 | dokument-weiterleiten | Abschluss |
| 3 | zur-wiedervorlage-vormerken | Abschluss |

---

### 11. `patient-bringt-unterlagen` — Patient bringt Unterlagen mit

**Beschreibung:** Patient übergibt der Praxis Unterlagen, die geprüft, in die Akte aufgenommen und bei Bedarf weitergeleitet werden.

**Anzahl Checkpoints:** 10

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | patientenzuordnung-pruefen | Eingang |
| 3 | unterlagen-vorhanden | Eingang |
| 4 | dokument-digitalisieren | Verarbeitung |
| 5 | dokument-kennzeichnen | Verarbeitung |
| 6 | dringlichkeitsbedarf-erkennen | Einschätzung |
| 7 | bezug-zu-laufendem-fall-pruefen | Einschätzung |
| 8 | dokument-weiterleiten | Abschluss |
| 9 | unterlagen-anfordern | Abschluss |
| 10 | zur-wiedervorlage-vormerken | Abschluss |

---

### 12. `neupatient` — Neupatient

**Beschreibung:** Erstaufnahme eines neuen Patienten in die Praxis.

**Anzahl Checkpoints:** 10

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Stammdaten |
| 2 | versicherungsnachweis-vorhanden | Stammdaten |
| 3 | einwilligung-vorhanden | Stammdaten |
| 4 | berechtigung-pruefen | Stammdaten |
| 5 | behandlerzuordnung-geklaert | Organisation |
| 6 | anamnese-dokumentiert | Anamnese |
| 7 | diagnose-dokumentiert | Anamnese |
| 8 | dauermedikation-vorhanden | Anamnese |
| 9 | unterlagen-vorhanden | Unterlagen |
| 10 | unterlagen-anfordern | Unterlagen |

---

### 13. `terminanfrage` — Terminanfrage

**Beschreibung:** Ein Patient fragt nach einem Termin in der Praxis.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patient |
| 2 | termin-vereinbaren | Abschluss |

---

### 14. `ueberweisungsanfrage` — Überweisungsanfrage

**Beschreibung:** Ein Patient fragt nach einer Überweisung zu einem Facharzt.

**Anzahl Checkpoints:** 6

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patient |
| 2 | versicherungsnachweis-vorhanden | Voraussetzungen |
| 3 | anlass-einer-ueberweisung-pruefen | Klärung |
| 4 | fragestellung-der-ueberweisung-klaeren | Klärung |
| 5 | ueberweisung-erstellen | Abschluss |
| 6 | dokument-dem-patienten-bereitstellen | Abschluss |

---

### 15. `verlaufskontakt` — Verlaufskontakt

**Beschreibung:** Ein Patient meldet sich mit Rückmeldung zum aktuellen Krankheitsverlauf.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | aktuellen-verlauf-erfassen | Verlauf |
| 2 | zur-wiedervorlage-vormerken | Abschluss |

---

### 16. `rueckrufbitte` — Rückrufbitte

**Beschreibung:** Ein Patient bittet um Rückkontakt durch die Praxis.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | kontaktform-festlegen | Konfiguration |
| 2 | zur-wiedervorlage-vormerken | Organisation |

---

### 17. `befundanfrage` — Befundanfrage

**Beschreibung:** Ein Patient fragt nach einem vorliegenden Befund.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | kontaktform-festlegen | Konfiguration |
| 2 | patient-informieren | Abschluss |
| 3 | dokument-dem-patienten-bereitstellen | Abschluss |

---

### 18. `patient-einbestellen` — Patient einbestellen

**Beschreibung:** Die Praxis entscheidet, einen Patienten aktiv einzubestellen. Die Kontaktaufnahme folgt als nachgelagerter Prozess.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | anlass-der-einbestellung-pruefen | Entscheidung |
| 2 | zeitpunkt-der-einbestellung-festlegen | Entscheidung |

---

### 19. `laborbefund-mitteilen` — Laborbefund mitteilen

**Beschreibung:** Ein bereits fachlich bewerteter Laborbefund wird dem Patienten mitgeteilt.

**Anzahl Checkpoints:** 4

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | kontaktform-festlegen | Konfiguration |
| 2 | patient-informieren | Abschluss |
| 3 | informationsempfaenger-festlegen | Abschluss |
| 4 | dokument-dem-patienten-bereitstellen | Abschluss |

---

### 20. `patient-nicht-erreichbar` — Patient nicht erreichbar

**Beschreibung:** Ein notwendiger Kontakt zum Patienten ist nicht zustande gekommen. Die Praxis legt das weitere Vorgehen fest.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | erneuten-kontaktversuch-durchfuehren | Kontakt |
| 2 | zur-wiedervorlage-vormerken | Abschluss |

---

### 21. `patient-erinnern` — Patient erinnern

**Beschreibung:** Die Praxis erinnert den Patienten an eine fällige Kontrolle oder Vorsorgemaßnahme.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | kontaktform-festlegen | Konfiguration |
| 2 | patient-informieren | Abschluss |
| 3 | informationsempfaenger-festlegen | Abschluss |

---

### 22. `verschlechterung-gemeldet` — Verschlechterung gemeldet

**Beschreibung:** Ein Patient meldet eine konkrete Zustandsverschlechterung. Verlauf wird erfasst und Dringlichkeit eingeschätzt.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | aktuellen-verlauf-erfassen | Verlauf |
| 2 | dringlichkeitsbedarf-erkennen | Einschätzung |

---

### 23. `impfung-empfehlen` — Impfung empfehlen

**Beschreibung:** Auf Basis des individuellen Patientenprofils wird ein Impfbedarf medizinisch festgestellt und dem Patienten empfohlen. Der Fall endet mit der Empfehlung — Durchführung und Organisation sind nachgelagerte Prozesse.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patient |
| 2 | impfbedarf-pruefen | Entscheidung |
| 3 | patient-informieren | Abschluss |

---

### 24. `unterlagen-aushaendigen` — Unterlagen aushändigen

**Beschreibung:** Der Patient fordert eigene Unterlagen oder Dokumente an. Der Fall beschreibt ausschließlich den eigenständigen Herausgabevorgang, nicht die Dokumenterstellung innerhalb anderer Praxisfälle.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | dokument-dem-patienten-bereitstellen | Abschluss |

---

### 25. `patient-ohne-unterlagen` — Patient ohne Unterlagen

**Beschreibung:** Der Patient erscheint zu einem Kontakt, obwohl er aufgefordert war, bestimmte Unterlagen mitzubringen. Die fehlenden Dokumente werden nachgefordert und der Vorgang zur Wiedervorlage vorgemerkt.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | unterlagen-anfordern | Nachforderung |
| 3 | zur-wiedervorlage-vormerken | Abschluss |

---

### 26. `versicherungsnachweis-fehlt` — Versicherungsnachweis fehlt

**Beschreibung:** Bei einem Patientenkontakt fehlt der aktuelle Versicherungsnachweis. Der fehlende Nachweis erzeugt einen eigenständigen administrativen Arbeitsauftrag: dokumentieren und zur Wiedervorlage vormerken.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | versicherungsnachweis-vorhanden | Prüfung |
| 3 | zur-wiedervorlage-vormerken | Abschluss |

---

### 27. `akteneinsicht` — Akteneinsicht

**Beschreibung:** Der Patient fordert Einsicht in die vollständige eigene Akte oder Kopien davon an. Der Fall betrifft ausschließlich die Herausgabe der vollständigen Akte — nicht einzelne Dokumente für externe Zwecke.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | dokument-dem-patienten-bereitstellen | Abschluss |

---

### 28. `angehoerige-ohne-berechtigung` — Angehörige ohne Berechtigung

**Beschreibung:** Eine dritte Person fragt nach einem Patienten, ohne eine ausreichende Berechtigung nachweisen zu können. Die Praxis prüft das Vorliegen einer Berechtigung und lehnt die Anfrage ab. Der Fall endet mit der Ablehnung.

**Anzahl Checkpoints:** 2

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | berechtigung-pruefen | Abschluss |

---

### 29. `unzustellbare-post` — Unzustellbare Post

**Beschreibung:** Ausgehende Post der Praxis kommt als unzustellbar zurück. Die Praxis versucht einen geeigneten Kommunikationsweg zum Patienten herzustellen und vermerkt den Vorgang zur Nachverfolgung.

**Anzahl Checkpoints:** 3

| # | Checkpoint-ID | Gruppe |
|---|---|---|
| 1 | patient-bekannt | Patientenstatus |
| 2 | patient-telefonisch-kontaktieren | Kontakt |
| 3 | zur-wiedervorlage-vormerken | Abschluss |

---

## Abschlussbericht

| Punkt | Wert |
|---|---|
| Erstellte Datei | `praxisprozess-bibliothek-aktuell.md` |
| Gesamtzahl Checkpoints | **41** |
| Gesamtzahl Praxisfälle | **29** |
| Gesamtzahl Orientierungsanker | **172** |
| DB-Overrides berücksichtigt | Nein — kein Datenbankzugriff möglich; ausschließlich statischer Fallback-Katalog exportiert |
| Inhalte verändert | Nein — rein lesender Export, keine fachlichen Änderungen |
