# Inquiry Regalmodell

## Zielmodell

Das Regalmodell trennt Patientenkommunikation in vier funktionale Klassen:

1. Fachregal
- Enthält fachliche Aussagen zum Anliegen.
- Beispiele: medizinische Einordnung, Entscheidung, fachliche Grenze, organisatorische Regel, reine Information ohne erforderliche Aktion durch den Patienten.

2. Prozess- und Action-Regal
- Enthält profilübergreifende Prozesszustände und Handlungsbausteine.
- Beispiele: Angaben fehlen, Dokument unleserlich, Versicherungsdaten fehlen, Dokument hochladen, digitale Anfrage, Terminbuchung, eRezept-Nutzung, Buchungscode, Bearbeitungsverzögerung.

3. Trigger-only
- Enthält Schalter, die primär Actions oder Sichtbarkeitsregeln auslösen.
- Diese Checkpoints sind weiterhin funktional relevant, auch wenn sie keinen eigenen Patiententext tragen.

4. Mischformen
- Enthält Checkpoints, die zugleich Erklärungstext und Triggerfunktion haben.
- Diese Fälle werden später einzeln bereinigt.

## Warum das nötig ist

Gleiche Prozesszustände tauchen aktuell in mehreren Fachprofilen auf. Dadurch entstehen:

- doppelte Textausgaben in der Patientennachricht
- unklare Klick- und Auswahl-Logik in M2 und M3
- erhöhte Kopplung zwischen fachlichen Aussagen und Prozess-Triggern

Die Trennung nach Regalen reduziert Dopplung, stabilisiert Triggerketten und macht die Kommunikation konsistenter.

## Regeln

1. Fachprofile enthalten fachliche Aussagen.
2. Prozesszustände sollen langfristig zentral im Prozess- und Action-Regal liegen.
3. Dieselbe Checkpoint-ID darf im Patiententext nur einmal erscheinen.
4. Trigger dürfen nicht entfernt werden, solange Actions oder Bedingungen davon abhängen.

## Aktuelle sichere Erkenntnisse

1. TECH_UPLOAD_FAILED wird im Renderer für die Patientennachricht dedupliziert, wenn dieselbe ID in mehreren Profilen aktiv ist.
2. INSURANCE_DATA_APP_TRANSFER bleibt global.
3. Die zugehörigen Versicherungs-Trigger bleiben vorerst sichtbar und setzbar, damit die bestehende Triggerkette stabil bleibt.

## Phase-Plan

### Phase 1: sichere Deduplizierung und Dokumentation

- Bestehende sichere Deduplizierung beibehalten und regressionssicher halten.
- Regalmodell und Regeln klar dokumentieren.
- Keine Architekturmigration und keine Persistenzänderung.

Aktueller Stand in Phase 1:

- Eine zentrale Zuordnung der Prozessregale ist als vorbereitende Struktur vorhanden.
- Verwendete Gruppen:
	- Fehlende Angaben / Unterlagen
	- Dokumente & Upload
	- Versicherungsdaten
	- Termine & Buchung
	- Digitale Anfrage
	- Warten / Bearbeitung / technische Hinweise
- Es werden nur bestehende IDs gruppiert, ohne Laufzeitverhalten in M2/M3 zu ändern.

### Phase 2: Trigger-only-Schicht

- Trigger-only technisch klar kennzeichnen oder separat führen.
- Trigger bleiben setzbar, aber nicht automatisch Patiententext.
- Abhängigkeiten in Conditions und Actions bleiben stabil.

### Phase 3: Mischformen bereinigen

- Mischformen pro Checkpoint einzeln bewerten.
- Entscheidung je Fall: fachliche Aussage, Trigger oder getrennte Aufteilung.
- Änderungen erst nach abgesicherter Trigger-only-Schicht.
