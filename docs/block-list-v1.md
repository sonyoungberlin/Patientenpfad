# Block-Liste v1

Erste stabile Referenzliste der Klärungsblöcke für die blockbasierte Workflow-App.

---

## Blockstatus-Werte

| Status           | Bedeutung                                          |
|------------------|----------------------------------------------------|
| `GEKLAERT`       | Alle relevanten Teilfragen sind beantwortet        |
| `TEILWEISE_OFFEN`| Teilinformationen vorhanden, Klärung unvollständig |
| `OFFEN`          | Keine verwertbaren Informationen vorhanden         |
| `NICHT_RELEVANT` | Block gilt für diesen Fall nicht                   |

---

## Blöcke

---

### 1. Kommunikation / Erreichbarkeit

- **block_id:** `kommunikation`
- **block_title:** Kommunikation & Erreichbarkeit

**Kurzdefinition**
Klärt, über welche Kanäle und Personen der Patient erreichbar ist und wer stellvertretend kommunizieren darf.

**Typische Teilfragen / Kette**
- Ist der Patient direkt erreichbar?
- Gibt es bevollmächtigte Kontaktpersonen?
- Welche Kommunikationsform ist bevorzugt (Telefon, Brief, digital)?
- Sind Sprachbarrieren oder Verständigungseinschränkungen bekannt?

**Typische Antwortgeber**
- `patient`
- `praxis`

**Typische Folgeaktionen**
- Kontaktdaten ergänzen
- Angehörigen-/Vertretungsinfo hinterlegen
- Kommunikationsweg festlegen

**Wann ist der Block…**
- `GEKLAERT` – Erreichbarkeit und Kontaktwege sind für den nächsten Schritt ausreichend geklärt
- `TEILWEISE_OFFEN` – Patient erreichbar, Vertreter oder bevorzugter Kanal noch nicht bekannt
- `OFFEN` – Kein Kontaktweg bekannt
- `NICHT_RELEVANT` – Nicht anwendbar (z. B. stationäre Übernahme ohne Eigenkontakt)

---

### 2. Dokumentenlage

- **block_id:** `dokumentenlage`
- **block_title:** Dokumentenlage

**Kurzdefinition**
Klärt, welche relevanten Dokumente vorliegen, welche fehlen und ob vorhandene Dokumente für den nächsten Schritt ausreichend sind.

**Typische Teilfragen / Kette**
- Liegt ein aktueller Arztbrief vor?
- Sind Befunde der letzten Behandlung vorhanden?
- Sind Einwilligungen und Freigaben vorhanden?
- Fehlen kritische Unterlagen für den nächsten Schritt?

**Typische Antwortgeber**
- `dokument`
- `praxis`
- `extern`

**Typische Folgeaktionen**
- Dokumente anfordern
- Fehlende Befunde markieren
- Frist für Nachreichung setzen

**Wann ist der Block…**
- `GEKLAERT` – Alle für den nächsten Schritt notwendigen Dokumente sind vorhanden
- `TEILWEISE_OFFEN` – Kernunterlagen vorhanden, Ergänzungen ausstehend
- `OFFEN` – Wesentliche Dokumente fehlen
- `NICHT_RELEVANT` – Kein Dokumentenbedarf im aktuellen Kontext

---

### 3. Medikation

- **block_id:** `medikation`
- **block_title:** Medikation

**Kurzdefinition**
Klärt den aktuellen Medikamentenstatus und ob offene Verordnungen für den nächsten Schritt ausreichend bekannt sind.

**Typische Teilfragen / Kette**
- Liegt ein aktueller Medikamentenplan vor?
- Sind alle Dauermedikamente verordnet und verfügbar?
- Gibt es bekannte Unverträglichkeiten oder Hinweise auf Wechselwirkungen?
- Nimmt der Patient die Medikamente wie verordnet ein?

**Typische Antwortgeber**
- `patient`
- `praxis`
- `arzt`
- `dokument`

**Typische Folgeaktionen**
- Medikamentenplan aktualisieren
- Rezept ausstellen / verlängern
- Einnahmetreue klären

**Wann ist der Block…**
- `GEKLAERT` – Medikamentenplan ist vorhanden und Einnahme für den nächsten Schritt ausreichend bekannt
- `TEILWEISE_OFFEN` – Plan vorhanden, aber einzelne Angaben oder Einnahmedetails noch unklar
- `OFFEN` – Kein aktueller Plan vorhanden, Medikation nicht bekannt
- `NICHT_RELEVANT` – Patient hat keine relevante Dauermedikation

---

### 4. Externe Mitbehandler

- **block_id:** `externe_mitbehandler`
- **block_title:** Externe Mitbehandler

**Kurzdefinition**
Klärt, welche Fachärzte, Einrichtungen oder Therapeuten den Patienten parallel behandeln und ob Koordination erforderlich ist.

**Typische Teilfragen / Kette**
- Welche Fachärzte sind aktuell involviert?
- Gibt es laufende Therapien außerhalb der Praxis?
- Sind Befunde / Briefe von Mitbehandlern bekannt?
- Ist eine Abstimmung zwischen den Behandlern notwendig?

**Typische Antwortgeber**
- `patient`
- `extern`
- `dokument`

**Typische Folgeaktionen**
- Mitbehandler erfassen
- Informationsaustausch initiieren
- Koordinationsbedarf dokumentieren

**Wann ist der Block…**
- `GEKLAERT` – Alle relevanten Mitbehandler sind bekannt, Koordinationsbedarf ist geklärt
- `TEILWEISE_OFFEN` – Einige Mitbehandler bekannt, Vollständigkeit noch offen
- `OFFEN` – Mitbehandlersituation nicht bekannt
- `NICHT_RELEVANT` – Keine Mitbehandlung vorhanden oder relevant

---

### 5. Versorgungsressourcen & Umfeld

- **block_id:** `versorgungsumfeld`
- **block_title:** Versorgungsressourcen & Umfeld

**Kurzdefinition**
Klärt die häusliche und soziale Versorgungssituation des Patienten und ob externe Unterstützung bekannt oder notwendig ist.

**Typische Teilfragen / Kette**
- Lebt der Patient allein oder mit Unterstützung?
- Gibt es pflegende Angehörige?
- Ist eine Pflegestufe vorhanden oder beantragt?
- Sind Hilfsmittel oder Hauspflege involviert?

**Typische Antwortgeber**
- `patient`
- `praxis`
- `extern`

**Typische Folgeaktionen**
- Versorgungslage dokumentieren
- Zusatzbedarf klären
- Externe Stellen informieren

**Wann ist der Block…**
- `GEKLAERT` – Versorgungssituation ist bekannt und für den nächsten Schritt ausreichend geklärt
- `TEILWEISE_OFFEN` – Grundversorgung bekannt, einzelne Lücken noch offen
- `OFFEN` – Versorgungssituation nicht bekannt
- `NICHT_RELEVANT` – Patient vollständig selbstversorgend, kein Bedarf

---

### 6. Prozesssteuerung / Terminfreigabe

- **block_id:** `prozesssteuerung`
- **block_title:** Prozesssteuerung & Terminfreigabe

**Kurzdefinition**
Klärt, ob alle Voraussetzungen für den nächsten Prozessschritt erfüllt sind und welche Freigaben noch ausstehen.

**Typische Teilfragen / Kette**
- Sind alle Vorbedingungen für den nächsten Termin erfüllt?
- Liegt die Einwilligung des Patienten vor?
- Sind offene Klärungen abgeschlossen?
- Ist der Schritt durch die zuständige Rolle freigegeben?

**Typische Antwortgeber**
- `praxis`
- `arzt`
- `patient`

**Typische Folgeaktionen**
- Freigabe erteilen oder verweigern
- Offene Punkte priorisieren
- Nächsten Schritt anstoßen

**Wann ist der Block…**
- `GEKLAERT` – Alle Voraussetzungen sind erfüllt, Freigabe liegt vor
- `TEILWEISE_OFFEN` – Großteils bereit, einzelne Punkte noch offen
- `OFFEN` – Mehrere Voraussetzungen noch nicht erfüllt
- `NICHT_RELEVANT` – Kein gestufter Prozess erforderlich

---

### 7. Krankenhaus- / Übergangssituation

- **block_id:** `uebergangssituation`
- **block_title:** Krankenhaus- & Übergangssituation

**Kurzdefinition**
Klärt, ob der Patient einen stationären Aufenthalt hinter sich hat oder eine Überleitung in eine andere Versorgungsebene bevorsteht.

**Typische Teilfragen / Kette**
- Hat der Patient zuletzt einen stationären Aufenthalt gehabt?
- Liegt ein Entlassbrief vor?
- Ist eine Überleitung in eine andere Versorgungsform geplant?
- Sind Nachsorgetermine vereinbart?

**Typische Antwortgeber**
- `dokument`
- `extern`
- `patient`

**Typische Folgeaktionen**
- Entlassbrief anfordern / auswerten
- Nachsorgetermine koordinieren
- Versorgungsübergang dokumentieren

**Wann ist der Block…**
- `GEKLAERT` – Übergangssituation ist dokumentiert und für den nächsten Schritt ausreichend geklärt
- `TEILWEISE_OFFEN` – Aufenthalt bekannt, Nachsorge noch lückenhaft
- `OFFEN` – Stationäre Vorgeschichte nicht bekannt, kein Entlassbrief vorhanden
- `NICHT_RELEVANT` – Kein stationärer Aufenthalt und kein Überleitungsbedarf

---

### 8. Diagnosenlage

- **block_id:** `diagnosenlage`
- **block_title:** Diagnosenlage

**Kurzdefinition**
Klärt, ob die relevanten Diagnosen vorhanden, aktuell und soweit bekannt sind, dass eine Einschätzung für den nächsten Schritt möglich ist.

**Typische Teilfragen / Kette**
- Sind die Hauptdiagnosen bekannt und erfasst?
- Stimmen Diagnosen zwischen Praxis und externen Behandlern überein?
- Gibt es neue, noch nicht erfasste Diagnosen?
- Sind die Diagnosen für den nächsten Schritt ausreichend?

**Typische Antwortgeber**
- `arzt`
- `dokument`
- `praxis`

**Typische Folgeaktionen**
- Diagnosen ergänzen / aktualisieren
- Widersprüche klären
- Kodierung prüfen

**Wann ist der Block…**
- `GEKLAERT` – Relevante Diagnosen sind bekannt und für den nächsten Schritt ausreichend
- `TEILWEISE_OFFEN` – Kerndiagnosen bekannt, einzelne Angaben oder Korrekturen noch ausstehend
- `OFFEN` – Diagnosenlage nicht bekannt oder widersprüchlich
- `NICHT_RELEVANT` – Keine Diagnosenpflege im aktuellen Schritt erforderlich
