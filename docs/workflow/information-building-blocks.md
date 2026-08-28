# Informationsbausteine für Workflow-Musterprozesse

## Zweck

Dieses Dokument beschreibt ein schlankes, wiederverwendbares Informationsmodell für hausärztliche Workflow-Musterprozesse.

Es dient als Grundlage für die Gestaltung von M2-Fragen: Welche fachlichen Informationsbausteine sind in einem Musterprozess relevant, und wie lassen sie sich als Ja/Nein/Unklar-Fragen formulieren?

Das Modell gilt für alle aktuellen Musterprozesse (Rezept, Überweisung, Heilmittel, Hilfsmittel, AU, Krankentransport) und ist auf künftige Prozesse (Impfung, Wunde, HKP, Befundbesprechung usw.) erweiterbar.

---

## Architektur des Workflow-Moduls

Das Workflow-Modul folgt einer festen Reihenfolge von der fachlichen Grundlage bis zum persönlichen Ergebnis:

```
Informationsbausteine
        ↓
Musterprozess
        ↓
M2-Fragen
        ↓
M3-Auswertung
        ↓
persönliche Merkliste
```

**Informationsbausteine** legen fest, welche fachlichen Aspekte in einem Musterprozess dokumentiert werden sollten.

**Musterprozesse** wählen aus diesen Bausteinen aus und formulieren prozessspezifische M2-Fragen.

**M2-Fragen** prüfen jeden ausgewählten Baustein als Ja/Nein/Unklar-Frage.

**M3-Auswertung** fasst die M2-Antworten zu Checkpoints zusammen.

**Persönliche Merkliste** ist das Ergebnis für den Nutzer. Sie listet Bausteine auf, bei denen Dokumentationslücken sichtbar wurden – damit der Nutzer beim nächsten ähnlichen Fall schneller erkennt, worauf er achten will.

Die Merkliste ist ausschließlich ein persönliches Hilfsmittel:
- Sie bewertet keine ärztliche Qualität.
- Sie ersetzt keine Leitlinie.
- Sie erstellt keine Handlungsempfehlung.
- Sie ist kein Audit- und kein Qualitätssicherungsinstrument.

---

## Abgrenzung

Dieses Dokument ist **kein Medizinprodukt**, keine Therapieempfehlung und keine Richtlinienprüfung.

- Keine Einzelfallentscheidung – die Bausteine beschreiben allgemeine Dokumentationsaspekte, keine konkreten Handlungsempfehlungen.
- Keine Therapieempfehlung – ob eine Maßnahme sinnvoll ist, entscheidet der Arzt. Das System prüft nur, ob eine Entscheidung dokumentiert ist.
- Keine Richtlinienprüfung – ob ein ICD-Code, eine Verordnungsmenge oder ein Therapieschema den aktuellen Leitlinien entspricht, ist nicht Gegenstand dieser Bausteine.
- Keine Einzelfalldetails – Dosierungen, Laborgrenzwerte, Kontraindikationen, Risikoabwägungen oder individuelle Befundinterpretation gehören nicht in das allgemeine M2-Modell.

---

## Informationsbausteine

Die folgenden 27 Bausteine decken die typisch wiederkehrenden Informationsaspekte hausärztlicher Musterprozesse ab.

---

### 1. Indikation

**Beschreibung:**
Warum wird eine Maßnahme, Verordnung oder Bescheinigung ausgestellt? Die medizinische oder sachliche Begründung.

**Zweck:**
Dokumentiert, dass die Maßnahme auf einer nachvollziehbaren Grundlage basiert – nicht nur als formale Pflicht, sondern als Grundlage späterer Prüfungen oder Rückfragen.

**Typische Musterprozesse:**
Alle (AU, Rezept, Überweisung, Heilmittel, Hilfsmittel, Krankentransport, HKP, Wunde)

**M2-Prinzip:**
„Indikation dokumentiert?"

---

### 2. Anlass / Warum jetzt

**Beschreibung:**
Was hat die heutige Entscheidung ausgelöst? Was hat sich verändert, oder warum ist die Maßnahme gerade jetzt relevant?

**Zweck:**
Unterscheidet Routinefortsetzung von einer neuen Entwicklung. Wichtig bei Folgeverordnungen, Änderungen oder Wiedereinsetzungen.

**Typische Musterprozesse:**
Rezept (Änderung), Heilmittel (Folgeverordnung), Krankentransport (Serienbedarf), AU (neue vs. fortlaufende Erkrankung)

**M2-Prinzip:**
„Anlass der Maßnahme dokumentiert?"

---

### 3. Veranlassung

**Beschreibung:**
Wer hat die Entscheidung angestoßen oder empfohlen: Hausarzt, Facharzt, Krankenhaus, Reha, Patient, Pflege, Therapeut?

**Zweck:**
Klärt die Herkunft der Entscheidung. Relevant bei übernommenen Empfehlungen, Konsiliarberichten oder externer Steuerung.

**Typische Musterprozesse:**
Rezept (Übernahme von Facharzt), Heilmittel, Hilfsmittel, Überweisung

**M2-Prinzip:**
„Veranlassung der Entscheidung dokumentiert?"

---

### 4. Therapieziel

**Beschreibung:**
Was soll durch die Maßnahme erreicht werden?

**Zweck:**
Ermöglicht spätere Beurteilung, ob die Maßnahme ihren Zweck erfüllt hat. Voraussetzung für sinnvolle Verlaufskontrolle.

**Typische Musterprozesse:**
Heilmittel, Hilfsmittel, HKP, Wunde, Reha

**M2-Prinzip:**
„Therapieziel benannt?"

---

### 5. Konkrete Maßnahme

**Beschreibung:**
Was genau wird verordnet, bescheinigt, überwiesen oder organisiert? Art, Menge, Frequenz, Ziel oder Gegenstand der Maßnahme.

**Zweck:**
Formale Eindeutigkeit – notwendig für Umsetzung durch Dritte (Therapeut, Sanitätshaus, Facharzt, Transportdienst).

**Typische Musterprozesse:**
Alle

**M2-Prinzip:**
„Maßnahme eindeutig angegeben?"

---

### 6. Dringlichkeit

**Beschreibung:**
Ob die Maßnahme sofort, zeitnah oder planmäßig erfolgen soll.

**Zweck:**
Steuerung der Priorisierung im Praxisablauf und bei externen Partnern (Facharzt, Transportdienst, Therapeut).

**Typische Musterprozesse:**
Überweisung, Krankentransport, Hilfsmittel (akuter Bedarf)

**M2-Prinzip:**
„Dringlichkeit angegeben?"

---

### 7. Abweichung / Besonderheit

**Beschreibung:**
Ob von einem typischen Verlauf, einer üblichen Menge, einer Standardsteuerung oder einer Routine abgewichen wird – und warum.

**Zweck:**
Sichert ab, dass bewusste Ausnahmen dokumentiert sind. Verhindert spätere Unklarheiten bei Rückfragen oder Kontrollen.

**Typische Musterprozesse:**
AU (häufige Wiederholung), Krankentransport (ungewöhnliche Transportart), Rezept (Off-Label, BtM), Heilmittel (über Regelfall hinaus)

**M2-Prinzip:**
„Abweichung vom Standardverlauf dokumentiert?"

---

### 8. Vorbehandlung

**Beschreibung:**
Was wurde bisher bereits versucht oder durchgeführt – in dieser Praxis oder anderswo?

**Zweck:**
Zeigt, dass die aktuelle Maßnahme nicht ohne Vorüberlegung erfolgt, sondern auf bisherigen Erfahrungen aufbaut.

**Typische Musterprozesse:**
Heilmittel (Folgeverordnung), Überweisung, Hilfsmittel, HKP

**M2-Prinzip:**
„Vorbehandlung dokumentiert?"

---

### 9. Vorbefunde

**Beschreibung:**
Welche Befunde, Arztbriefe, Krankenhausberichte, Therapieberichte oder Laborwerte vorliegen oder für die Entscheidung relevant sind.

**Zweck:**
Ermöglicht informierte Entscheidung. Relevant für Facharztkommunikation und Folgeprozesse.

**Typische Musterprozesse:**
Überweisung, Rezept (Labor), Heilmittel (Therapiebericht), Krankentransport (Facharztbericht)

**M2-Prinzip:**
„Relevante Vorbefunde vorhanden?"

---

### 10. Verlauf

**Beschreibung:**
Wie haben sich Beschwerden, Befunde oder die Versorgung bisher entwickelt?

**Zweck:**
Kontextualisiert die aktuelle Maßnahme. Wichtig bei Folgeverordnungen und Dauertherapien.

**Typische Musterprozesse:**
Rezept (Langzeittherapie), Heilmittel, Hilfsmittel, AU (Häufung), Wunde

**M2-Prinzip:**
„Bisheriger Verlauf dokumentiert?"

---

### 11. Wirkung / Erfolg

**Beschreibung:**
Ob eine bisherige Therapie, Maßnahme oder Verordnung eine messbare oder spürbare Wirkung gezeigt hat.

**Zweck:**
Grundlage für Entscheidung über Fortführung, Änderung oder Abbruch einer Maßnahme.

**Typische Musterprozesse:**
Heilmittel (Folgeverordnung), Rezept (Langzeit), HKP, Wunde

**M2-Prinzip:**
„Therapieerfolg dokumentiert?"

---

### 12. Verträglichkeit / Probleme

**Beschreibung:**
Ob Nebenwirkungen, Abbrüche, Unverträglichkeiten oder Komplikationen dokumentationsrelevant sind.

**Zweck:**
Sichert ab, dass relevante Probleme festgehalten sind – nicht als medizinische Bewertung, sondern als Nachweis, dass sie bekannt waren.

**Typische Musterprozesse:**
Rezept, Heilmittel, HKP

**M2-Prinzip:**
„Verträglichkeitsprobleme oder Abbrüche dokumentiert?"

---

### 13. Änderung

**Beschreibung:**
Ob Dosierung, Maßnahme, Transportart, Therapie, Ziel oder Zuständigkeit gegenüber dem bisherigen Vorgehen geändert wurde.

**Zweck:**
Macht Änderungen explizit sichtbar, anstatt sie implizit in der Dokumentation zu lassen.

**Typische Musterprozesse:**
Rezept, Heilmittel, Krankentransport, Hilfsmittel

**M2-Prinzip:**
„Änderung gegenüber Vorgehen angegeben?"

**Hinweis zur Abgrenzung:** Dieser Baustein ist bewusst von Baustein 14 (Grund der Änderung) getrennt. Eine Änderung kann dokumentiert sein, ohne dass ihr Grund festgehalten ist – und umgekehrt. Beide adressieren unterschiedliche Dokumentationslücken und bleiben eigenständige Bausteine.

---

### 14. Grund der Änderung

**Beschreibung:**
Warum wurde geändert: Befund, Nebenwirkung, Patientenantwort, Facharztempfehlung, Krankenhausentlassung, fehlender Erfolg.

**Zweck:**
Unterscheidet bewusste Anpassungen von Versehen. Relevant bei Rückfragen durch Patienten, Facharzt oder Kostenträger.

**Typische Musterprozesse:**
Rezept, Heilmittel, Krankentransport (Änderung der Transportart)

**M2-Prinzip:**
„Grund der Änderung dokumentiert?"

---

### 15. Langzeitbedarf / Chronischer Verlauf

**Beschreibung:**
Ob eine Maßnahme langfristig läuft oder regelmäßig neu begründet werden muss. Bezieht sich auf Dauertherapien, chronische Erkrankungen oder wiederkehrenden Bedarf.

**Zweck:**
Verhindert, dass Dauerbedarf unreflektiert fortgeschrieben wird, ohne dass eine aktuelle Prüfung stattgefunden hat.

**Typische Musterprozesse:**
Rezept (BtM, Langzeittherapie), Krankentransport (Serienfahrt), Hilfsmittel (Dauerversorgung), Heilmittel

**M2-Prinzip:**
„Langzeitbedarf oder Wiederholungsnotwendigkeit dokumentiert?"

---

### 16. Patientenkontext

**Beschreibung:**
Relevante Lebensumstände, die die Entscheidung beeinflussen: Mobilität, Pflege, Beruf, Wohnsituation, Angehörige, häusliche Situation.

**Zweck:**
Gibt Informationen, die nicht aus Diagnose oder Befund ableitbar sind, aber für Planung und Kommunikation wichtig sind.

**Typische Musterprozesse:**
Krankentransport, Hilfsmittel, HKP, AU (Jobcenter, Arbeitgeber)

**M2-Prinzip:**
„Relevante Lebensumstände dokumentiert?"

---

### 17. Rückmeldung erwartet

**Beschreibung:**
Welche Rückmeldung nach der Maßnahme erwartet wird: Facharztbefund, Therapiebericht, Laborergebnis, Patientenantwort.

**Zweck:**
Definiert, was nach einer Überweisung, einem Auftrag oder einer Verordnung zurückkommen soll – und von wem.

**Typische Musterprozesse:**
Überweisung, Heilmittel, Labor, Hilfsmittel

**M2-Prinzip:**
„Erwarteter Rücklauf definiert?"

---

### 18. Zuständigkeit

**Beschreibung:**
Wer als nächstes handelt: Arzt, MFA, Patient, Facharzt, Therapeut, Sanitätshaus, Pflegedienst, Krankenkasse.

**Zweck:**
Verhindert, dass nach einer Entscheidung unklar ist, wer was tun soll.

**Typische Musterprozesse:**
Alle (WF-C04)

**M2-Prinzip:**
„Nächste Zuständigkeit festgelegt?"

---

### 19. Patienteninformation

**Beschreibung:**
Ob der Patient verstanden hat, warum etwas passiert, was er tun soll oder wohin er sich wenden soll.

**Zweck:**
Prüft, ob der Patient handlungsfähig aus dem Gespräch herausgeht – besonders relevant bei komplexen Maßnahmen.

**Typische Musterprozesse:**
Überweisung, AU, Heilmittel, Hilfsmittel, Krankentransport

**M2-Prinzip:**
„Patient über Maßnahme und nächste Schritte informiert?"

---

### 20. Externe Beteiligte

**Beschreibung:**
Welche Dritte an der Versorgung beteiligt sind oder sein werden: Facharzt, Krankenhaus, Reha, Therapeut, Pflege, Sanitätshaus, Krankenkasse.

**Zweck:**
Schafft Transparenz über Schnittstelleninformationen. Wichtig bei Multi-Akteuren in einer Versorgungskette.

**Typische Musterprozesse:**
Überweisung, Hilfsmittel (Sanitätshaus), Krankentransport (Transportdienst), HKP (Pflegedienst)

**M2-Prinzip:**
„Externe Beteiligte benannt?"

---

### 21. Kontrollzeitpunkt

**Beschreibung:**
Wann Wiedervorstellung, Labor, Kontrolle oder Nachprüfung stattfinden soll.

**Zweck:**
Sichert Kontinuität der Versorgung. Verhindert, dass Patienten nach einer Maßnahme aus dem System fallen.

**Typische Musterprozesse:**
Alle (WF-C04)

**M2-Prinzip:**
„Kontrolltermin festgelegt oder kein Kontrollbedarf vermerkt?"

---

### 22. Erfolgskriterium

**Beschreibung:**
Woran in einigen Wochen oder Monaten erkennbar ist, ob die Maßnahme geholfen hat.

**Zweck:**
Ermöglicht strukturierte Verlaufskontrolle statt impliziter Bewertung. Relevant bei Folgeverordnungen.

**Typische Musterprozesse:**
Heilmittel, Hilfsmittel, HKP, Wunde, Rezept (Langzeit)

**M2-Prinzip:**
„Erfolgskriterium definiert?"

---

### 23. Nächster Schritt

**Beschreibung:**
Was nach Abschluss der Maßnahme, dem Erhalt einer Rückmeldung oder einem Ergebnis folgen soll.

**Zweck:**
Schließt Versorgungslücken zwischen Maßnahmen. Besonders wichtig, wenn externe Partner involviert sind.

**Typische Musterprozesse:**
Überweisung, Heilmittel, Krankentransport, AU

**M2-Prinzip:**
„Nächster Schritt festgelegt?"

---

### 24. Plan B

**Beschreibung:**
Was passieren soll, wenn die Maßnahme nicht wirkt, nicht möglich ist oder abgelehnt wird.

**Zweck:**
Verhindert Sackgassen in der Versorgung. Relevant bei eingeschränkt verfügbaren oder unsicheren Maßnahmen.

**Typische Musterprozesse:**
Heilmittel (wenn keine Stelle frei), Hilfsmittel (Ablehnung durch KK), Überweisung (lange Wartezeit)

**M2-Prinzip:**
„Alternativvorgehen festgelegt?"

---

### 25. Formale Angaben

**Beschreibung:**
Pflichtangaben für den jeweiligen Musterprozess: Datum, Diagnose, ICD-10, Fachrichtung, Verordnungsart (Erst-/Folgeverordnung), Transportart, Formularzweck usw. Welche Angaben formell notwendig sind, hängt vom Prozess ab.

**Zweck:**
Stellt sicher, dass ein Formular oder eine Bescheinigung formal korrekt und verarbeitungsfähig ist.

**Typische Musterprozesse:**
Alle (WF-C01)

**M2-Prinzip:**
„Pflichtangaben vollständig?" (prozessspezifisch konkretisiert)

---

### 26. Befundbewertung / Konsequenz

**Beschreibung:**
Ob vorliegende Befunde ärztlich bewertet wurden und ob eine Konsequenz daraus dokumentiert ist. Es reicht nicht aus, dass Laborwerte, Facharztbriefe oder Bildgebung in der Akte vorhanden sind – entscheidend ist, ob der Arzt den Befund eingeordnet und eine Folgerung daraus gezogen hat.

Typische Dokumentationslücke: Befund liegt vor, Akte endet dort. Die ärztliche Interpretation und ihre Konsequenz fehlen.

**Abgrenzung:**
Nicht Baustein 9 (Vorbefunde vorhanden?) – der fragt, ob Befunde existieren.
Nicht Baustein 23 (Nächster Schritt?) – der fragt, was als nächstes passiert.
Sondern die Lücke dazwischen: Hat der Arzt den Befund aktiv bewertet und eine Konsequenz dokumentiert?

**Zweck:**
Schließt die häufigste Lücke in der Verlaufsdokumentation. Gibt dem Nutzer einen Hinweis auf der persönlichen Merkliste, wenn ein Befund ohne dokumentierte Bewertung oder Konsequenz in der Akte verbleibt.

**Typische Musterprozesse:**
Rezept (Labor, Langzeitmonitoring), Befundbesprechung, Überweisung (nach Eingang des Facharztbriefs), Wunde, HKP, chronische Erkrankungen

**M2-Prinzip:**
„Befund bewertet und Konsequenz dokumentiert?"

**Zuordnung M3:**
Primär WF-C02 (Entscheidungsgrundlage); bei Verlaufskontrollen alternativ WF-C03 (Verlauf und Kontext)

---

### 27. Versorgungsverantwortung

**Beschreibung:**
Wer künftig verantwortlich für den Patienten ist – nicht nur im nächsten Schritt, sondern dauerhaft oder für einen definierten Zeitraum. Relevant bei Übergaben, Mitbehandlungen, Übernahmen und komplexen Versorgungsketten.

Typische Fragen: Mitbehandlung oder Übernahme durch Facharzt? Wer stellt Folgerezepte aus? Wer kontrolliert den Verlauf? Wer informiert den Patienten beim Eingang eines Befunds? Wer organisiert den nächsten Termin?

**Abgrenzung:**
Nicht Baustein 18 (Zuständigkeit?) – der fragt, wer als nächstes handelt.
Sondern: Wer trägt die Verantwortung auf mittlere Sicht, nach Abschluss der aktuellen Maßnahme?

**Zweck:**
Verhindert Zuständigkeitslücken nach einer Maßnahme. Besonders wichtig bei Übergaben zwischen Hausarzt und Facharzt oder bei der Einbindung externer Dienste.

**Typische Musterprozesse:**
Überweisung (Mitbehandlung oder Übernahme?), Heilmittel, Hilfsmittel, HKP (Pflegedienst vs. Praxis), Krankentransport (Serienbedarf)

**M2-Prinzip:**
„Versorgungsverantwortung festgelegt?"

**Zuordnung M3:**
WF-C04 (Weiteres Vorgehen)

---

## Zuordnung zu M3-Bereichen

Die M3-Checkpoints gruppieren die Bausteine nach fachlichem Schwerpunkt:

| M3-Bereich | WF-Checkpoint | Zugeordnete Bausteine |
|---|---|---|
| **Formale Angaben** | WF-C01 | 25 Formale Angaben, 5 Konkrete Maßnahme, 6 Dringlichkeit |
| **Entscheidungsgrundlage** | WF-C02 | 1 Indikation, 2 Anlass, 3 Veranlassung, 4 Therapieziel, 7 Abweichung, 20 Externe Beteiligte, 26 Befundbewertung¹ |
| **Verlauf und Kontext** | WF-C03 | 8 Vorbehandlung, 9 Vorbefunde, 10 Verlauf, 11 Wirkung/Erfolg, 12 Verträglichkeit, 13 Änderung, 14 Grund der Änderung, 15 Langzeitbedarf, 16 Patientenkontext, 26 Befundbewertung¹ |
| **Weiteres Vorgehen** | WF-C04 | 17 Rückmeldung erwartet, 18 Zuständigkeit, 19 Patienteninformation, 21 Kontrollzeitpunkt, 22 Erfolgskriterium, 23 Nächster Schritt, 24 Plan B, 27 Versorgungsverantwortung |

**Hinweis:** Ein Baustein kann in verschiedenen Musterprozessen unterschiedlichen Checkpoints zugeordnet sein. Die Tabelle zeigt die häufigste Zuordnung.

¹ Baustein 26 (Befundbewertung / Konsequenz): WF-C02 bei neuen Befunden; WF-C03 bei Verlaufskontrollen.

---

## Bausteine außerhalb des allgemeinen Modells

Die folgenden Aspekte sind zu einzelfallbezogen oder zu nah an medizinischer Entscheidungsunterstützung. Sie gehören **nicht** in allgemeine M2-Fragen:

- Konkrete Medikamentendosis oder Dosierungsempfehlung
- Kontraindikationen und individuelle Risikofaktoren
- Schwangerschaft / Stillzeit
- Sicherheitsplan
- Konkrete Diagnosesicherung oder Differenzialdiagnose
- Konkrete Therapieempfehlung (z. B. „Wirkstoff A ist besser als Wirkstoff B")
- Konkrete Laborgrenzwerte
- Konkrete Nebenwirkungsbewertung
- Regelprüfung für einen Einzelfall (z. B. Wirtschaftlichkeitsprüfung)

Diese Aspekte können im ärztlichen Gespräch relevant sein, sind aber keine verallgemeinerbaren M2-Fragen.

---

## Redaktionsregel für neue Musterprozesse

Vor jeder Erstellung neuer M2-Fragen für einen Musterprozess sind folgende fünf Fragen zu beantworten:

**1. Welche Bausteine braucht dieser Prozess?**
Nicht jeder Prozess benötigt alle 27 Bausteine. Ein Rezept-Prozess braucht keinen Transportart-Baustein; ein Krankentransport-Prozess braucht kein Therapieziel.

**2. Welche Bausteine gehören in MFA-Fragen?**
MFA-Fragen prüfen in der Regel: formale Vollständigkeit, Dokumentationsvorhandensein, administrative Aspekte. Bausteine: 25, 5, 6, 8, 9, 13, 15, 16, 17, 18, 19, 27.

**3. Welche Bausteine gehören in Arzt-Fragen?**
Arzt-Fragen prüfen inhaltliche Vollständigkeit und klinische Kontextualisierung. Bausteine: 1, 2, 3, 4, 7, 10, 11, 12, 14, 20, 21, 22, 23, 24, 26, 27.

**4. Welche Fragen sind mit Ja/Nein/Unklar beantwortbar?**
Test: Kann ein Arzt oder eine MFA diese Frage mit Ja, Nein oder Unklar beantworten, ohne einen Freitext eingeben zu müssen? Falls nein → Frage umformulieren.

Nicht geeignet:
- „Warum erfolgt die Verordnung gerade jetzt?" → erfordert Freitext
- „Was soll erreicht werden?" → erfordert Freitext

Geeignet:
- „Anlass der Maßnahme dokumentiert?" → Ja/Nein/Unklar ✓
- „Therapieziel benannt?" → Ja/Nein/Unklar ✓

**5. Welche Fragen wären zu einzelfallbezogen?**
Alles, was konkrete Inhalte bewertet statt ihre Existenz prüft, gehört nicht in M2-Fragen. Kein „Ist die Dosis richtig?" — nur „Dosierung angegeben?".
