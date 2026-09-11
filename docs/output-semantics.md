# Output- und Feldsemantik

Diese Dokumentation beschreibt den aktuellen Stand der medizinischen Ausgabesemantik. Maßgeblich sind die eingefrorenen Block- und Fragedefinitionen einer Session sowie die gemeinsame Ausgabe in `buildMedicalRecordOutput`. Aus diesem einen Durchlauf entstehen der bisherige Krankenblatttext (`noteText`) und das semantische Dokument für XML v2. PDF und Word verwenden die Typinformation noch nicht zur Formatierung.

## Semantische Grundtypen

| Typ | Bedeutung | Typische aktuelle Beispiele | XML v2 | Geplante Darstellung in Word/PDF |
| --- | --- | --- | --- | --- |
| `heading` | Überschrift eines ausgegebenen Dokumentationsblocks | `Labor`, `Prävention / Empfehlungen`, `Stellungnahme` | `<item type="heading">Labor</item>` | fett |
| `bodyText` | Zusammenhängender medizinischer Brief- oder Fließtext | automatisch erzeugte Stellungnahme; Entscheidung zur weiteren Abklärung | `<item type="bodyText">…</item>` | normale Fließtextformatierung |
| `freeText` | Frei eingegebene ärztliche Hinweise oder Ergänzungen | `HEALTH_CHECK_LAB_NOTE`, `HEALTH_CHECK_OTHER_NOTE`, `CARE_PLAN_SUPPORT_NOTES` | `<item type="freeText">…</item>` | kursiv |
| `measurement` | Messwert oder kompakte strukturierte Untersuchungszeile | Lipidprofil, Nüchternplasmaglukose, RR, HF, BZ, Größe, Gewicht, EKG | `<item type="measurement">…</item>` | etwas kleinere Schrift und kompakter Zeilen-/Absatzabstand |
| `status` | Kurze Bewertung oder Zustand, sofern nicht Teil einer Messwertzeile | klinischer Status; `Dokumente / Befunde sind beigefügt.` | `<item type="status">…</item>` | etwas kleinere Schrift und kompakte Darstellung |
| `listItem` | Kurzer strukturierter Aufzählungs- oder Empfehlungseintrag | Präventionsthemen, Maßnahmen, Impfmatrix | `<item type="listItem">…</item>` | kompakte listenartige Darstellung |

Die geplante Word-/PDF-Typografie ist eine Zielvorgabe. Die aktuelle PDF-Typografie und bestehende Word-/VBA-Verarbeitung werden durch XML v2 noch nicht geändert.

## Typauflösung

Neue interne Sessions frieren optionale Semantikmetadaten aus den Katalogen in den Snapshot ein. Die Auflösung erfolgt in dieser Reihenfolge:

1. expliziter Typ der Frage (`documentationItemType`),
2. expliziter Standardtyp des Blocks,
3. eng begrenzte Legacy-Regel für bekannte Blöcke,
4. Fallback anhand des Fragetypen:
   - `textarea` -> `freeText`
   - `number` -> `measurement`
   - `multi_select` und `repeatable_group` -> `listItem`
   - `select`, `yes_no` und `confirmation` -> `status`
   - übrige Typen -> `bodyText`

Blocküberschriften werden als `heading` ausgegeben. Die Semantik beschreibt die Darstellung, nicht eine neue medizinische Bewertung.

## Konkrete Feldregeln

### Stellungnahme

Der Block `MEDICAL_STATEMENT` hat den Standardtyp `bodyText`. Die automatisch erzeugten Texte aus

- `MEDICAL_STATEMENT_IMPAIRMENT_TYPE`,
- `MEDICAL_STATEMENT_TIME_ASSESSMENT`,
- `MEDICAL_STATEMENT_RECOMMENDATIONS`

werden in Fragen- und Auswahlreihenfolge zu einem Fließtext verbunden. Die Blocküberschrift `Stellungnahme` ist `heading`, der verbundene Text ist `bodyText`.

### Weiteres Vorgehen

Der Block `HEALTH_CHECK_NEXT_STEPS` ist aktuell gemischt typisiert:

- `HEALTH_CHECK_FOLLOW_UP_REQUIRED` -> `bodyText`; dies ist der zusammenhängende Aussageanteil zur weiteren Abklärung oder Kontrolle.
- `HEALTH_CHECK_NEXT_STEPS` (`Maßnahmen`) -> `listItem`. Das inhaltlich relevante Label bleibt erhalten, beispielsweise `Maßnahmen: Verlaufskontrolle in unserer Praxis`.
- `HEALTH_CHECK_NEXT_STEPS_NOTE` (`Kurzer Hinweis`) -> `freeText`; das technische Label wird nur in XML v2 entfernt.

Der Blocktitel `Weiteres Vorgehen` ist `heading`. Nicht jeder Inhalt dieses Blocks ist pauschal `bodyText`.

### Gemeinsame Vereinbarung

Der Block `CARE_PLAN_AGREEMENT_BLOCK` ist im aktuellen Code nicht pauschal `bodyText`, sondern enthält unterschiedliche Feldarten:

- Blocktitel `Gemeinsame Vereinbarung` -> `heading`
- `CARE_PLAN_AGREEMENT` (Mehrfachauswahl) -> derzeit über den Typ-Fallback `listItem`
- `CARE_PLAN_AGREEMENT_TEXT` (`Individuelle Vereinbarung`) -> explizit `freeText`; das Label bleibt derzeit erhalten
- `CARE_PLAN_AGREEMENT_DATE` -> derzeit über den allgemeinen Fallback `bodyText`

Soll die ausgewählte gemeinsame Vereinbarung künftig als zusammenhängender Brieftext statt als Liste erscheinen, ist dafür eine bewusste Änderung der Katalogsemantik erforderlich. Diese Dokumentation ändert das Verhalten nicht.

### Kurzer Hinweis

Folgende Felder sind explizit `freeText` und unterdrücken ihr rein formularartiges Label nur in XML v2:

- `HEALTH_CHECK_CLINICAL_NOTE`
- `HEALTH_CHECK_LAB_NOTE`
- `HEALTH_CHECK_URINE_NOTE`
- `HEALTH_CHECK_NEXT_STEPS_NOTE`

Beispiel:

- XML v1 / `noteText`: `Kurzer Hinweis: Kontrolle zeitnah.`
- XML v2: `<item type="freeText">Kontrolle zeitnah.</item>`

### Sonstiger Hinweis

`HEALTH_CHECK_OTHER_NOTE` ist `freeText`. Das Label `Sonstiger Hinweis:` bleibt im XML-v1-/`noteText`-Weg erhalten und wird in XML v2 gezielt entfernt.

### Notizen

`CARE_PLAN_SUPPORT_NOTES` ist `freeText`. Das technische Label `Notizen:` bleibt im XML-v1-/`noteText`-Weg erhalten und wird in XML v2 gezielt entfernt.

Andere ähnlich benannte Felder werden nicht pauschal gleichbehandelt:

- `CARE_PLAN_HA_NOTES` (`Notizen / Vereinbarungen`) -> `freeText`, Label bleibt derzeit erhalten.
- `CARE_PLAN_SUPPLY_NOTES` (`Notizen / Offene Punkte`) -> `freeText`, Label bleibt derzeit erhalten.
- `CARE_PLAN_AGREEMENT_TEXT` (`Individuelle Vereinbarung`) -> `freeText`, Label bleibt derzeit erhalten.

### Maßnahmen und Empfehlungen

`HEALTH_CHECK_NEXT_STEPS` ist explizit `listItem`. Das Label `Maßnahmen:` bleibt erhalten, weil es den Inhalt medizinisch sinnvoll einordnet.

`HEALTH_CHECK_PREVENTION_TOPICS` ist ebenfalls explizit `listItem`; die Ausgabe behält das Label `Besprochene Themen:`.

Die Auswahl `MEDICAL_STATEMENT_RECOMMENDATIONS` ist Bestandteil des zusammengeführten Stellungnahmetextes und übernimmt daher den Blocktyp `bodyText`, nicht `listItem`.

### Labor- und Messwerte

Folgende Felder sind explizit `measurement`:

- `HEALTH_CHECK_BP_SYSTOLIC` und `HEALTH_CHECK_BP_DIASTOLIC` -> gemeinsam als RR
- `HEALTH_CHECK_HEART_RATE` -> HF
- `HEALTH_CHECK_BLOOD_GLUCOSE` -> BZ
- `HEALTH_CHECK_HEIGHT_CM` -> Größe
- `HEALTH_CHECK_WEIGHT_KG` -> Gewicht
- `HEALTH_CHECK_LIPID_PROFILE_STATUS` -> Lipidprofil
- `HEALTH_CHECK_FASTING_GLUCOSE_STATUS` -> Nüchternplasmaglukose
- `HEALTH_CHECK_URINE_STATUS` -> Urinstatus

Der Block `HEALTH_CHECK_MEASUREMENTS` fasst seine Werte in einer kompakten Inline-Zeile zusammen und hat den Blockstandard `measurement`. Auch der Block `EKG` hat den Standardtyp `measurement`; die vorhandene kompakte EKG-Zeile bleibt inhaltlich unverändert.

Obwohl Lipidprofil, Nüchternplasmaglukose und Urinstatus Auswahlwerte wie `unauffällig`, `auffällig` oder `ausstehend` enthalten, sind sie wegen ihres Untersuchungswert-Kontexts `measurement`, nicht `status`.

### Klinische Zustände und Bewertungen

Die klinischen Felder der Gesundheitsuntersuchung sind explizit `status`:

- `HEALTH_CHECK_GENERAL_STATUS`
- `HEALTH_CHECK_HEART_STATUS`
- `HEALTH_CHECK_LUNG_STATUS`
- `HEALTH_CHECK_ABDOMEN_STATUS`
- `HEALTH_CHECK_VESSELS_PULSES_STATUS`
- `HEALTH_CHECK_MUSCULOSKELETAL_STATUS`
- `HEALTH_CHECK_NEUROLOGICAL_STATUS`
- `HEALTH_CHECK_SKIN_STATUS`
- `HEALTH_CHECK_PSYCH_STATUS`

Auswahl-, Ja/Nein- und Bestätigungsfelder ohne spezifischere Metadaten fallen ebenfalls auf `status`. Messwertbezogene Statusfelder bleiben dagegen `measurement`.

### Impfstatus und Impfempfehlungen

`VACCINATION_REVIEW_ITEMS` ist eine `repeatable_group` mit `presentation: "vaccination_matrix"`. Es besitzt derzeit keine explizite `documentationItemType`-Angabe und fällt deshalb auf `listItem`.

Der vorhandene Formatter erzeugt pro Impfung strukturierte Zeilen, unter anderem für:

- Impfungsbezeichnung,
- dokumentierten Impfstatus,
- dokumentierte Dosen, Serogruppen, Saison oder Datum,
- weiteres Vorgehen beziehungsweise Impfempfehlung,
- Bemerkung und Termin-/Intervallangaben.

Diese erzeugten Zeilen werden aktuell insgesamt als `listItem` exportiert. Status und Empfehlung innerhalb eines Impfeintrags werden noch nicht in getrennte `status`- beziehungsweise `listItem`-Items zerlegt. Eine solche Verfeinerung wäre eine zukünftige Produktlogikänderung.

### Dokumente / Befunde

`DOCUMENT_HANDLING_ACTIONS` ist explizit `status`. Die medizinisch relevanten Sätze bleiben erhalten, zum Beispiel:

```xml
<item type="status">Dokumente / Befunde sind beigefügt.</item>
```

Die nahezu identische Blocküberschrift `Dokumente / Befunde` wird nur in XML v2 über `omitStructuredHeading` unterdrückt. XML v1 und `noteText` bleiben unverändert. Dadurch wird die Redundanz reduziert, ohne die Information über beigefügte, mitgegebene, angeforderte oder nachzureichende Dokumente zu verlieren.

## XML- und Kompatibilitätsregeln

### XML v1

XML v1 bleibt der produktive, rückwärtskompatible Export:

```xml
<appExport version="1.0"><section id="APP_TEXT">…</section></appExport>
```

Der Inhalt ist der bestehende `noteText`. Labels und Zeilenstruktur werden nicht durch XML-v2-Regeln verändert. Bestehende Word-Vorlagen können diesen Weg weiterverwenden.

### XML v2

XML v2 ist ein additiver, separater Export mit dem Dateisuffix `-v2.xml`. Es enthält immer die drei logischen Slots:

```xml
<appExport version="2.0">
  <section slot="1">…</section>
  <section slot="2"></section>
  <section slot="3">…</section>
</appExport>
```

Jeder Inhalt wird als `<item type="…">…</item>` ausgegeben. XML-Sonderzeichen werden escaped, Zeilenenden normalisiert und für XML 1.0 unzulässige Steuerzeichen entfernt. Es werden keine zusätzlichen Patienten- oder Personendaten ergänzt.

### Labels

Technische oder formularartige Labels dürfen nur feldbezogen über `omitDocumentationLabel` entfernt werden. Es gibt keine pauschale Unterdrückung anhand des sichtbaren Labeltexts.

Aktuell gezielt unterdrückt werden in XML v2:

- `Kurzer Hinweis:` bei den oben aufgeführten `HEALTH_CHECK_*_NOTE`-Feldern,
- `Sonstiger Hinweis:` bei `HEALTH_CHECK_OTHER_NOTE`,
- `Notizen:` bei `CARE_PLAN_SUPPORT_NOTES`.

Inhaltlich relevante Labels wie `Maßnahmen:` und `Besprochene Themen:` bleiben erhalten.

### Snapshot- und Reihenfolgeverhalten

- Neue Sessions frieren `documentationItemType`, `omitDocumentationLabel`, Blockstandard und `omitStructuredHeading` zusammen mit den übrigen Katalogdaten ein.
- Alte Snapshots ohne diese Metadaten bleiben ohne Migration lesbar. Bekannte Messblöcke, die Stellungnahme und die gezielt labelfreien historischen Hinweisfelder besitzen enge Legacy-Fallbacks; ansonsten greift der Fragetyp-Fallback.
- `section` und `order` der Frozen Blocks bestimmen Slot und Reihenfolge. Sind vollständige Layoutdaten vorhanden, wird zuerst nach `section`, dann nach `order` sortiert.
- Fehlen Layoutdaten, bleibt die historische `displayOrder`-Sortierung erhalten; ein fehlender oder ungültiger Slot fällt für die strukturierte Ausgabe auf Slot 1 zurück.
- XML v2 bildet immer Slot 1, 2 und 3 ab, auch wenn ein Slot leer ist.
- Sehr alte interne Ausgaben ohne nutzbare feingranulare Semantik fallen auf den unveränderten `noteText` als `bodyText` in Slot 1 zurück.

## Gemeinsame Erzeugung

Es gibt keinen zweiten medizinischen Textgenerator. `buildMedicalRecordOutput` durchläuft die bestehende Block-, Snapshot-, Sichtbarkeits- und Dokumentationslogik einmal und liefert sowohl:

- `noteText` für Krankenblatt und XML v1 als auch
- das semantische Dokument für XML v2.

`legacyText` erlaubt gezielte Unterschiede wie das Entfernen eines technischen Labels in XML v2, ohne die bestehende v1-Ausgabe zu verändern. PDF verwendet weiterhin seinen vorhandenen Renderer; die hier dokumentierten geplanten Typografieregeln sind dort noch nicht umgesetzt.

## Pflegeregel für neue Felder

Bei jedem neuen Feld oder Ausgabetyp muss vor Aufnahme in den Katalog entschieden und in dieser Datei dokumentiert werden:

1. Welcher semantische Typ gilt: `heading`, `bodyText`, `freeText`, `measurement`, `status` oder `listItem`?
2. Bleibt das Feldlabel erhalten oder wird es ausschließlich in XML v2 gezielt entfernt?
3. Handelt es sich fachlich um Fließtext, Freitext, Messwert, Status oder Listeneintrag?
4. Wie lautet die XML-v2-Ausgabe einschließlich sinnvoller Labels und Gruppierung?
5. Wie soll der Typ später in Word und PDF dargestellt werden?

Eine Labelunterdrückung darf nicht pauschal aus Feldtyp oder Labeltext abgeleitet werden. Änderungen müssen die Rückwärtskompatibilität von XML v1 und alten Snapshots berücksichtigen und dürfen keinen parallelen medizinischen Textgenerator einführen.
