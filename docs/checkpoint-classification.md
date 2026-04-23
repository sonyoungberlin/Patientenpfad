# Checkpoint-Klassifikation (M/O + P/A)

> **Maßgebliche Gesamtdokumentation:** [`docs/architecture/checkpoints.md`](./architecture/checkpoints.md)
>
> Dieses Dokument beschreibt die Achsen `category` (M/O) und `relevance` (P/A).

Jeder Checkpoint muss zwei Eigenschaften tragen:

1. **Kategorie**:

   * `M` = medizinisch
   * `O` = organisatorisch

2. **Relevanz**:

   * `P` = Checkpoint hat Vorbereitungsperspektive(n) und erscheint in M2
   * `A` = Checkpoint hat keine Vorbereitung und erscheint nur in M3

---

## 1. Kategorie: M vs. O

### O – organisatorisch

Ein Checkpoint ist organisatorisch, wenn:

* er auf objektiven Fakten basiert
* er durch klare Logik ableitbar ist
* keine fachliche Bewertung erforderlich ist

Beispiele:

* Kommunikationsweg vorhanden
* Identität geklärt

👉 System darf hier:

* stark aggregieren
* teilweise automatisch entscheiden

---

### M – medizinisch

Ein Checkpoint ist medizinisch, wenn:

* eine fachliche Bewertung erforderlich ist
* Kontext, Erfahrung oder Einschätzung eine Rolle spielen
* die Entscheidung nicht deterministisch ableitbar ist

Beispiele:

* Informationsbasis ausreichend
* Medikation geklärt
* Diagnosenlage geklärt

👉 System darf hier:

* nur Kontext liefern (M2)
* keine automatische Entscheidung treffen

👉 Die Entscheidung erfolgt ausschließlich durch den Arzt (M3)

---

## Entscheidungsregel

> Wenn ein Computer den Status sicher bestimmen kann → O
> Wenn eine fachliche Einschätzung notwendig ist → M

---

## 2. Relevanz: P vs. A

### P – Vorbereitungsperspektive vorhanden

* Der Checkpoint hat Vorbereitungsperspektive(n) und erscheint in M2.
* Sowohl MFA- als auch Patientenfragen sind für diesen Checkpoint definiert
  (bei `type = DECISION + P`) oder mindestens eine Perspektive ist vorhanden
  (bei `type = ASSESSMENT + P`).

---

### A – Nur M3 (keine Vorbereitung)

* Der Checkpoint hat keine Vorbereitung und erscheint ausschließlich in M3.
* Kein M2-Fragenkatalog-Eintrag notwendig.

---

## 3. Verbindliche Regel

Jeder Checkpoint muss enthalten:

* `category`: M oder O
* `relevance`: P oder A

Beispiel:

```ts
{
  checkpoint_id: "CP-K03",
  category: "M",
  relevance: "P"
}
```

---

## 4. Systemverhalten

### Für O-Checkpoints:

* Status in M3: `OK` oder `TO_DO` (kein `ZURÜCKSTELLEN`)
* Arzt muss sich entscheiden

### Für M-Checkpoints:

* Status darf NICHT aus M2 abgeleitet werden
* M2 liefert nur Kontext
* Entscheidung erfolgt immer in M3
* `ZURÜCKSTELLEN` ist erlaubt und führt in M5 zu einem „unklar"-Satz

---

## Ziel

Diese Trennung stellt sicher, dass:

* organisatorische Logik automatisierbar bleibt
* medizinische Entscheidungen beim Arzt bleiben
* das System unterstützt, aber nicht entscheidet
