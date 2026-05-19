# Formularanliegen & Antragsanliegen – Architekturregeln

> **Geltungsbereich:** Jeder Anliegen-Typ, der eine externe Leistung (Antrag, Formular,
> Bescheinigung, Gutachten) als Kernthema hat.
> Dieses Dokument beschreibt das kanonische Muster für solche Anliegen.
> Abweichende Sonderarchitekturen sind Inkonsistenzen und müssen bereinigt werden.

---

## 1. Grundprinzip: Aktivierungskontext, keine eigene Engine

Formularanliegen sind **Aktivierungskontexte**, keine eigenständigen Subsysteme.

Sie nutzen dieselbe Checkpoint-Pipeline, dieselben M2/M3/M4-Mechanismen und dieselben
Prefill-Regeln wie alle anderen Anliegen. Es gibt keinen separaten Reha-Flow,
keinen separaten Rentenflow, kein separates Antrags-Rendering.

---

## 2. K11 als zentraler Auslöser

K11 (`MULTI_SELECT`, Anliegen-Auswahl) ist der **einzige** Einstiegspunkt für
Formular-/Antragsanliegen. Eine Auswahl in K11 (z. B. „Reha-Antrag") aktiviert
bedingte Checkpoints über `ensureSelectionConditionalCheckpoints`.

Kein Anliegen darf einen eigenen Auslöser außerhalb von K11 einführen.

---

## 3. Aktivierungsreihenfolge: erst bestehende Checkpoints, dann neue

Wenn ein neues Formularanliegen entworfen wird, gilt folgende Prüfreihenfolge:

1. **Welche bestehenden Checkpoints decken das Anliegen bereits ab?**
   Bestehende Checkpoints (K01–K13 zum Zeitpunkt der Erstdokumentation) sind zu
   bevorzugen. Sie müssen lediglich in `REHA_CONDITIONAL_IDS` (oder dem
   anliegen-spezifischen Äquivalent) ergänzt werden.

2. **Wo besteht eine echte organisatorische Lücke, die kein bestehender Checkpoint
   schließt?**
   Nur für diese Lücken dürfen neue Checkpoints angelegt werden.

3. **Niemals**: doppelte medizinische oder funktionelle Checkpoints anlegen, weil ein
   Anliegen „eigene" Fragen braucht.

---

## 4. Neue Checkpoints: nur für echte organisatorische Lücken

Ein neuer Checkpoint ist zulässig, wenn:

- kein bestehender Checkpoint die Information abdeckt,
- die Information organisatorischer Art ist (`category: O`),
- der Checkpoint in keinem anderen Anliegen bereits existiert oder entstehen wird.

Neue Checkpoints sind **nicht** zulässig, wenn:

- ein bestehender medizinischer oder funktioneller Checkpoint dieselbe Dimension abdeckt,
- der einzige Unterschied zum bestehenden Checkpoint die Anliegen-Bezeichnung ist.

---

## 5. Keine doppelten medizinischen / funktionellen Fragen

Medizinische Checkpoints (K01–K09, K12, K13) decken ihre Dimension anliegen-übergreifend
ab. Ein Reha-Antrag stellt dieselben Fragen zur Diagnosen-, Medikations- und
Informationslage wie jedes andere Anliegen — diese werden **nicht** neu gebaut.

---

## 6. M2: patientengerechte Vorbereitung

M2 öffnet alle aktiven Checkpoints patientengerecht. Für Formularanliegen bedeutet das:

- **Zweck M2**: Vorbereitung, Erwartungsmanagement, Informationssammlung.
- Die Fragen klären, was der Patient mitbringen soll, was er über den Prozess wissen
  muss und welche Vorinformationen für die Praxis relevant sind.
- M2 trifft **keine** Entscheidung und gibt **keine** Bewertung ab.
- M2 stellt **keine** medizinische Frage, die Arzt-Kompetenz voraussetzt.
- M2 prüft **nicht** Anspruchsvoraussetzungen und erzeugt **keine** fertige Stellungnahme.

---

## 7. M3/M4: Praxis- und Arztsteuerung

M3 und M4 dienen der konkreten Steuerung in der Praxis:

- **M3**: Der Arzt setzt den Status jedes Checkpoints (OK / TO_DO / ZURÜCKSTELLEN).
  Formularanliegen erzeugen hier denselben Workflow wie Standardanliegen.
- **M4**: Patientenhinweise und Aktionen, die aus dem M3-Status abgeleitet werden.
  Format `ACTION` (Mitbringen, Vorbereitung) oder `NOTICE` (Information, Erwartung).

M3/M4 treffen **keine medizinische Bewertung** und erzeugen **keine**
anspruchsprüfende Aussage gegenüber dem Patienten.

---

## 8. Prefill-Regeln

- Prefill erscheint in M3 **nur**, wenn ein gespeicherter M2-Run für die Session
  existiert.
- Ein Delta-Run darf ausschließlich Checkpoints einfrieren, die seinem eigenen Scope
  angehören. Scope-Übergriffe sind ein Bug.
- Ohne gespeicherten M2-Run bleibt M3 ohne Prefill-Vorschläge.

---

## 9. Beispiel: Reha-Antrag

| Schicht | Inhalt |
|---|---|
| **Auslöser** | K11, Auswahl „Reha-Antrag" |
| **Aktivierte bestehende Checkpoints** | K03, K04, K05, K06, K07 |
| **Neue Checkpoints** | K14 (Reha-Vorbereitung & Vorleistungen), K15 (Beruflicher Kontext & AU-Situation) |
| **Begründung K14** | Organisatorische Lücke: frühere Reha-/Kurmaßnahmen und Unterlagen sind nicht durch K03–K07 abgedeckt |
| **Begründung K15** | Organisatorische Lücke: Berufsstatus und AU-Situation sind für Reha-Antrag relevant, aber nicht durch bestehende Checkpoints erfasst |
| **Kein separates Reha-System** | Dieselbe Pipeline, dieselben Mechanismen |

---

## 10. Anti-Patterns (verboten)

| Anti-Pattern | Grund |
|---|---|
| Separater Renderer / separates Submodul für ein Anliegen | Sonderarchitektur, nicht wartbar |
| Eigener Auslöser außerhalb K11 | Verletzt das Auslöser-Prinzip |
| Neuer medizinischer Checkpoint für Anliegen-spezifische Fragen | Dopplung, deckt bereits K01–K09 ab |
| M2-Fragen, die Anspruch oder Bewertung suggerieren | Verletzt das Kompetenzprinzip |
| Delta-Run friert Checkpoints fremder Scopes ein | Scope-Bug |
| Prefill ohne gespeicherten M2-Run | Verletzt die Prefill-Reihenfolge |
