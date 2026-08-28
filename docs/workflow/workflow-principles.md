# Klinische Workflows: Grundkonzept und Architektur

> **Geltungsbereich:** Dieses Dokument beschreibt ausschließlich das **Klinische Workflow-Modul** (Rezept, Überweisung, AU, Heilmittel, Hilfsmittel, Krankentransport). Die verbindliche Architektur für **Arbeitsprozesse** (`lib/practiceProcesses`) ist in [docs/workflow/practice-processes-architecture.md](practice-processes-architecture.md) definiert.

---

## Zweck des Moduls

Das Klinische Workflow-Modul unterstützt Praxisteams bei der strukturierten Selbstreflexion über die Dokumentation klinischer Standardvorgänge.

**Ziele:**
- Selbst-Überprüfung der eigenen Dokumentation
- Orientierungshilfe für MFA und Ärzte bei klinischen Dokumentationsaufgaben
- Unterstützung der Nachvollziehbarkeit von Entscheidungen
- Einarbeitungshilfe für neue Mitarbeiter

**Ausdrücklich nicht Ziel:**
- keine Rechtsprüfung
- keine medizinische Qualitätsprüfung
- kein Audit-System
- keine automatische Bewertung

---

## Architektur

### M2 – Orientierungsphase

**Zweck:**
- Strukturierte Vorbereitung anhand konkreter Fragen
- Rollenabhängige Perspektive (MFA / Arzt)

**Eigenschaften:**
- MFA und Arzt sehen unterschiedliche Fragen
- Fragen sind konkret und praxisnah formuliert
- Fragen dienen als Denkanstoß, nicht als Checkliste
- keine automatische Bewertung der Antworten

---

### M3 – Bewertungsphase

**Zweck:**
- Bewusste Zusammenfassung durch den Anwender
- Persönliche Einschätzung zu vier definierten Bereichen

**Eigenschaften:**
- Immer dieselben vier Checkpoints je klinischem Workflow
- Kein Status wird automatisch aus M2 abgeleitet
- Status wird ausschließlich manuell gesetzt

---

## Standard-Checkpoints (M3 – Klinische Workflows)

Alle klinischen Workflows verwenden dieselben vier Bereiche:

1. **Formale Angaben** – Sind die grundlegenden Angaben vorhanden?
2. **Entscheidungsgrundlage** – Ist nachvollziehbar, worauf die Entscheidung basiert?
3. **Verlauf und Kontext** – Gibt es relevante Vorgeschichte oder Begleitinformationen?
4. **Weiteres Vorgehen** – Ist dokumentiert, was als nächstes folgen soll?

> Diese vier Checkpoints gelten für die sechs klinischen Dokumentationsprozesse dieses Moduls. Arbeitsprozesse (Internal Protocol) verwenden stattdessen prozessspezifische Checkpoints nach der fachlichen Grammatik des Fachmodells v1.0.

---

## Merkzettel

Der Merkzettel dient ausschließlich als persönliche Erinnerung für ähnliche Fälle.

**Er soll:**
- relevante Punkte für den nächsten ähnlichen Fall sichtbar machen
- typische Dokumentationslücken aufzeigen
- beim Einstieg in einen ähnlichen Fall helfen

**Er ist ausdrücklich:**
- keine Aktennotiz
- kein Krankenblatteintrag
- keine rechtliche oder medizinische Bewertung

---

## Grundregel für M2-Fragen

**Bevorzugte Formulierungen:**
- vorhanden
- dokumentiert
- nachvollziehbar
- erkennbar
- angegeben

**Zu vermeiden:**
- richtig
- korrekt
- zulässig
- erlaubt
- pflichtgemäß
- indiziert
- medizinisch angemessen

---

## Fachliche Leitlinie

Der größte Nutzen entsteht meist nicht durch Pflichtfelder, sondern durch fehlenden Kontext.

Deshalb soll bei der Entwicklung neuer klinischer Workflows besonders auf den Bereich **„Verlauf und Kontext"** geachtet werden. Dieser Bereich erfasst Informationen, die in der Praxis oft bekannt sind, aber nicht dokumentiert werden – und die bei späteren Rückfragen oder Folgefällen relevant werden können.
