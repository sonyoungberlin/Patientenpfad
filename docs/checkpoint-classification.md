# Checkpoint-Klassifikation (M/O + P/A)

Jeder Checkpoint muss zwei Eigenschaften tragen:

1. **Kategorie**:

   * `M` = medizinisch
   * `O` = organisatorisch

2. **Relevanz**:

   * `P` = Pflicht-Checkpoint
   * `A` = additiv / kontextabhängig

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

### P – Pflicht

* muss in jedem Fall bewertet werden
* blockiert nicht den Ablauf, ist aber immer sichtbar

---

### A – additiv

* nur relevant in bestimmten Situationen
* wird kontextabhängig aktiviert

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

* Status kann teilweise aus M2 abgeleitet werden

### Für M-Checkpoints:

* Status darf NICHT aus M2 abgeleitet werden
* M2 liefert nur Kontext
* Entscheidung erfolgt immer in M3

---

## Ziel

Diese Trennung stellt sicher, dass:

* organisatorische Logik automatisierbar bleibt
* medizinische Entscheidungen beim Arzt bleiben
* das System unterstützt, aber nicht entscheidet
