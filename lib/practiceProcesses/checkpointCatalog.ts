import type { PracticeCheckpoint } from "./types";

// ---------------------------------------------------------------------------
// Bibliothek
// ---------------------------------------------------------------------------

const CHECKPOINT_CATALOG: Readonly<Record<string, PracticeCheckpoint>> = {
  "patient-bekannt": {
    id: "patient-bekannt",
    title: "Patient bekannt",
    description: "Der Patient ist der Praxis als Bestandspatient bekannt.",
    orientationAnchors: [
      {
        id: "patient-bekannt-a1",
        text: "Patient ist im Praxissystem angelegt",
      },
      {
        id: "patient-bekannt-a2",
        text: "Name ist erfasst",
      },
      {
        id: "patient-bekannt-a3",
        text: "Geburtsdatum ist erfasst",
      },
      {
        id: "patient-bekannt-a4",
        text: "Adresse ist erfasst",
      },
      {
        id: "patient-bekannt-a5",
        text: "Telefonnummer ist erfasst",
      },
      {
        id: "patient-bekannt-a6",
        text: "Mobilnummer für SMS-Kommunikation ist erfasst",
      },
      {
        id: "patient-bekannt-a7",
        text: "E-Mail-Adresse ist erfasst",
      },
      {
        id: "patient-bekannt-a8",
        text: "Patient nutzt das von der Praxis eingesetzte digitale Kommunikations-/Terminportal",
      },
    ],
  },

  "dauermedikation-vorhanden": {
    id: "dauermedikation-vorhanden",
    title: "Dauermedikation vorhanden",
    description:
      "Die Dauermedikation des Patienten ist in der Praxis bekannt und dokumentiert.",
    orientationAnchors: [
      {
        id: "dauermedikation-vorhanden-a1",
        text: "Dauermedikation wurde bereits durch die Praxis verordnet",
      },
      {
        id: "dauermedikation-vorhanden-a2",
        text: "Dauermedikation ist im Krankenblatt / in der Patientenakte dokumentiert",
      },
      {
        id: "dauermedikation-vorhanden-a3",
        text: "Dauermedikation ist im Praxissystem f\u00fcr den Patienten erkennbar hinterlegt",
      },
      {
        id: "dauermedikation-vorhanden-a4",
        text: "Dauermedikation aus externer Verordnung ist in der Patientenakte dokumentiert",
      },
    ],
  },

  "dauermedikation-abgleichen": {
    id: "dauermedikation-abgleichen",
    title: "Dauermedikation abgleichen",
    description:
      "Extern vorliegende Medikationsinformationen werden mit der in der Praxis dokumentierten Dauermedikation abgeglichen.",
    orientationAnchors: [
      {
        id: "dauermedikation-abgleichen-a1",
        text: "Medikament / Wirkstoff wird abgeglichen",
      },
      {
        id: "dauermedikation-abgleichen-a2",
        text: "Dosierung wird abgeglichen",
      },
      {
        id: "dauermedikation-abgleichen-a3",
        text: "Einnahmeschema wird abgeglichen",
      },
      {
        id: "dauermedikation-abgleichen-a4",
        text: "Verordnender / behandelnder Arzt wird abgeglichen",
      },
      {
        id: "dauermedikation-abgleichen-a5",
        text: "Abgleich mit Facharztberichten",
      },
      {
        id: "dauermedikation-abgleichen-a6",
        text: "Abgleich mit Krankenhaus-/Entlassunterlagen",
      },
      {
        id: "dauermedikation-abgleichen-a7",
        text: "Abgleich mit Pflegedokumentation / Pflegeeinrichtung",
      },
      {
        id: "dauermedikation-abgleichen-a8",
        text: "Abgleich mit E-Medikationsplan",
      },
    ],
  },

  "kontrolle-aktuell": {
    id: "kontrolle-aktuell",
    title: "Kontrolle aktuell",
    description:
      "Es ist geklärt, ob eine für den jeweiligen Praxisfall relevante Kontrolle ausreichend aktuell ist.",
    orientationAnchors: [
      {
        id: "kontrolle-aktuell-a1",
        text: "Kontrolle hat in der eigenen Praxis stattgefunden",
      },
      {
        id: "kontrolle-aktuell-a2",
        text: "Kontrolle durch eine externe behandelnde Stelle wird berücksichtigt",
      },
      {
        id: "kontrolle-aktuell-a3",
        text: "Praxisübliches Kontrollintervall wird berücksichtigt",
      },
      {
        id: "kontrolle-aktuell-a4",
        text: "Datum der letzten Kontrolle ist dokumentiert",
      },
    ],
  },

  "diagnose-dokumentiert": {
    id: "diagnose-dokumentiert",
    title: "Diagnose dokumentiert",
    description:
      "Eine relevante Diagnose des Patienten ist in der Praxis nachvollziehbar dokumentiert.",
    orientationAnchors: [
      {
        id: "diagnose-dokumentiert-a1",
        text: "Diagnose ist in der Patientenakte dokumentiert",
      },
      {
        id: "diagnose-dokumentiert-a2",
        text: "Datum der Erstdiagnose ist dokumentiert",
      },
      {
        id: "diagnose-dokumentiert-a3",
        text: "Diagnose wurde fachärztlich bestätigt",
      },
      {
        id: "diagnose-dokumentiert-a4",
        text: "Fachärztlicher Bericht zur Diagnose liegt vor",
      },
    ],
  },

  "anamnese-dokumentiert": {
    id: "anamnese-dokumentiert",
    title: "Anamnese dokumentiert",
    description:
      "Eine für den jeweiligen Praxisprozess relevante Anamnese ist im Krankenblatt dokumentiert.",
    orientationAnchors: [
      {
        id: "anamnese-dokumentiert-a1",
        text: "Eigenangaben des Patienten sind erfasst",
      },
      {
        id: "anamnese-dokumentiert-a2",
        text: "Vorinformationen / Fremdangaben aus anderen Quellen sind erfasst",
      },
      {
        id: "anamnese-dokumentiert-a3",
        text: "Datum der Anamnese ist dokumentiert",
      },
    ],
  },

  "versicherungsnachweis-vorhanden": {
    id: "versicherungsnachweis-vorhanden",
    title: "Versicherungs-/Abrechnungsstatus geklärt",
    description:
      "Es ist grundsätzlich geklärt, auf welcher Grundlage der Patient behandelt bzw. abgerechnet wird.",
    orientationAnchors: [
      {
        id: "versicherungsnachweis-vorhanden-a1",
        text: "Status ist für das aktuelle Quartal geklärt",
      },
      {
        id: "versicherungsnachweis-vorhanden-a2",
        text: "Status aus dem vorherigen Quartal kann berücksichtigt werden",
      },
      {
        id: "versicherungsnachweis-vorhanden-a3",
        text: "Status ist innerhalb des von der Praxis festgelegten Zeitraums geklärt worden",
      },
    ],
  },

  "einwilligung-vorhanden": {
    id: "einwilligung-vorhanden",
    title: "Einwilligung vorhanden",
    // EXTERNAL_REVIEW_NEEDED: konkrete gesetzliche Formerfordernisse (z. B. Schriftformgebot)
    description:
      "Wenn für den jeweiligen Vorgang eine Einwilligung relevant ist, wird abgebildet, in welcher Form sie nach Praxisstandard vorliegen soll.",
    orientationAnchors: [
      {
        id: "einwilligung-vorhanden-a1",
        text: "Mündliche Einwilligung liegt vor",
      },
      {
        id: "einwilligung-vorhanden-a2",
        text: "Schriftliche Einwilligung liegt vor",
      },
      {
        id: "einwilligung-vorhanden-a3",
        text: "Digitale / elektronische Einwilligung liegt vor",
      },
      {
        id: "einwilligung-vorhanden-a4",
        text: "Einwilligung ist im Krankenblatt dokumentiert",
      },
    ],
  },

  "unterlagen-vorhanden": {
    id: "unterlagen-vorhanden",
    title: "Dokument vorhanden",
    description: "Ein relevantes Dokument liegt der Praxis vor.",
    orientationAnchors: [
      {
        id: "unterlagen-vorhanden-a1",
        text: "Dokument ist lesbar",
      },
      {
        id: "unterlagen-vorhanden-a2",
        text: "Dokument liegt in vollst\u00e4ndiger Fassung vor",
      },
      {
        id: "unterlagen-vorhanden-a3",
        text: "Dokumentdatum ist bekannt",
      },
      {
        id: "unterlagen-vorhanden-a4",
        text: "Absender ist bekannt",
      },
    ],
  },

  "termin-vorhanden": {
    id: "termin-vorhanden",
    title: "Termin vorhanden",
    description: "Für den aktuellen Anlass ist ein Termin vereinbart.",
    orientationAnchors: [
      {
        id: "termin-vorhanden-a1",
        text: "Hat der Patient einen Termin für diesen Anlass?",
      },
      {
        id: "termin-vorhanden-a2",
        text: "Ist ein vom Krankenhaus empfohlener Folgetermin bereits vereinbart?",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Dokumentenverarbeitung
  // ---------------------------------------------------------------------------

  "patientenzuordnung-pruefen": {
    id: "patientenzuordnung-pruefen",
    title: "Patientenzuordnung prüfen",
    description:
      "Es wird gepr\u00fcft, ob das vorliegende Dokument bzw. die vorliegende Information eindeutig dem richtigen Patienten zugeordnet ist.",
    orientationAnchors: [
      {
        id: "patientenzuordnung-pruefen-a1",
        text: "Name stimmt \u00fcberein",
      },
      {
        id: "patientenzuordnung-pruefen-a2",
        text: "Geburtsdatum stimmt \u00fcberein",
      },
      {
        id: "patientenzuordnung-pruefen-a3",
        text: "Weitere Patientenkennung stimmt \u00fcberein",
      },
      {
        id: "patientenzuordnung-pruefen-a4",
        text: "Zuordnung im Praxissystem ist eindeutig",
      },
    ],
  },

  "dokument-digitalisieren": {
    id: "dokument-digitalisieren",
    title: "Dokument digitalisieren",
    description:
      "Ein physisch vorliegendes Dokument wird eingescannt und digital im Praxissystem verfügbar gemacht.",
    orientationAnchors: [
      {
        id: "dokument-digitalisieren-a1",
        text: "Ist das Dokument vollständig und lesbar eingescannt?",
      },
      {
        id: "dokument-digitalisieren-a2",
        text: "Ist das digitalisierte Dokument im Praxissystem gespeichert und abrufbar?",
      },
    ],
  },

  "dokument-kennzeichnen": {
    id: "dokument-kennzeichnen",
    title: "Dokument kennzeichnen",
    description:
      "Das Dokument wird mit den notwendigen Metadaten (Dokumenttyp, Datum, Absender) versehen, sodass es ohne Rückfrage eingeordnet werden kann.",
    orientationHint: "Mindestens Dokumenttyp und Datum müssen erkennbar sein.",
    orientationAnchors: [
      {
        id: "dokument-kennzeichnen-a1",
        text: "Ist der Dokumenttyp erkennbar oder eingetragen?",
      },
      {
        id: "dokument-kennzeichnen-a2",
        text: "Ist das Dokumentdatum vermerkt?",
      },
      {
        id: "dokument-kennzeichnen-a3",
        text: "Ist der Absender bzw. die ausstellende Stelle erkennbar?",
      },
    ],
  },

  "dokument-weiterleiten": {
    id: "dokument-weiterleiten",
    title: "Dokument weiterleiten",
    description:
      "Ein Dokument bzw. Vorgang wird an eine andere Person oder Stelle weitergeleitet.",
    orientationAnchors: [
      {
        id: "dokument-weiterleiten-a1",
        text: "Postalische Weiterleitung",
      },
      {
        id: "dokument-weiterleiten-a2",
        text: "Weiterleitung per Fax",
      },
      {
        id: "dokument-weiterleiten-a3",
        text: "Weiterleitung per E-Mail",
      },
      {
        id: "dokument-weiterleiten-a4",
        text: "Weiterleitung über einen digitalen Übermittlungsweg / ein digitales System",
      },
      {
        id: "dokument-weiterleiten-a5",
        text: "Empfangsbestätigung/Rückmeldung ist erforderlich",
      },
      {
        id: "dokument-weiterleiten-a6",
        text: "Weiterleitung wird dokumentiert",
      },
      {
        id: "dokument-weiterleiten-a7",
        text: "Grund der Weiterleitung wird dokumentiert",
      },
    ],
  },

  "dokument-dem-patienten-bereitstellen": {
    id: "dokument-dem-patienten-bereitstellen",
    title: "Dokument bereitstellen",
    description:
      "Ein Dokument wird einem vorgesehenen Empf\u00e4nger zug\u00e4nglich gemacht.",
    // Abgrenzung: bereitstellen = zug\u00e4nglich machen; weiterleiten = zur weiteren Bearbeitung \u00fcbergeben
    orientationHint:
      "Dokument bereitstellen: Empf\u00e4nger erh\u00e4lt Zugang zum Dokument. Dokument weiterleiten: Dokument/Vorgang wird im Prozess zur weiteren Bearbeitung weitergegeben.",
    orientationAnchors: [
      {
        id: "dokument-dem-patienten-bereitstellen-a1",
        text: "Patient",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a2",
        text: "Weiterbehandelnder Arzt / andere Praxis",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a3",
        text: "Andere beteiligte Stelle",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a4",
        text: "Pers\u00f6nliche Aush\u00e4ndigung",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a5",
        text: "Postalischer Versand",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a6",
        text: "Bereitstellung per E-Mail",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a7",
        text: "Bereitstellung \u00fcber digitales Portal / Kommunikationssystem",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a8",
        text: "Bereitstellung \u00fcber die ePA",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a9",
        text: "Direkte digitale \u00dcbermittlung an andere Praxis / anderen Arzt",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Befundbearbeitung
  // ---------------------------------------------------------------------------

  "dringlichkeitsbedarf-erkennen": {
    id: "dringlichkeitsbedarf-erkennen",
    title: "Dringlichkeitsbedarf erkennen",
    description:
      "Ein eingehender Vorgang wird daraufhin eingeschätzt, ob eine ärztliche Dringlichkeitsbeurteilung erforderlich ist.",
    orientationHint:
      "Hier wird erkannt, ob zeitnah ärztlich geprüft oder gehandelt werden muss. Eine weitergehende Notfall- oder Eskalationsentscheidung ist damit nicht automatisch abgebildet.",
    orientationAnchors: [
      {
        id: "dringlichkeitsbedarf-erkennen-a1",
        text: "Enthält der Vorgang Hinweise auf möglichen akuten Handlungsbedarf?",
      },
      {
        id: "dringlichkeitsbedarf-erkennen-a2",
        text: "Wurde der Dringlichkeitsbedarf bei Unklarheit ärztlich eingeschätzt?",
      },
    ],
  },

  "laborbefund-fachlich-bewerten": {
    id: "laborbefund-fachlich-bewerten",
    title: "Laborbefund fachlich bewerten",
    description:
      "Der Laborbefund wird fachlich bewertet und das Ergebnis der Bewertung nachvollziehbar dokumentiert.",
    orientationAnchors: [
      {
        id: "laborbefund-fachlich-bewerten-a1",
        text: "Fachliche Bewertung ist dokumentiert",
      },
      {
        id: "laborbefund-fachlich-bewerten-a2",
        text: "Handlungsbedarf ist dokumentiert",
      },
      {
        id: "laborbefund-fachlich-bewerten-a3",
        text: "Erforderliche weitere Handlung ist veranlasst",
      },
    ],
  },

  "bezug-zu-laufendem-fall-pruefen": {
    id: "bezug-zu-laufendem-fall-pruefen",
    title: "Bezug zu laufendem Fall prüfen",
    description:
      "Es wird geprüft, ob der Eingang zu einem bekannten Anliegen oder einer laufenden Behandlung gehört.",
    orientationAnchors: [
      {
        id: "bezug-zu-laufendem-fall-pruefen-a1",
        text: "Gibt es zu diesem Eingang bereits einen offenen Fall oder ein bekanntes Anliegen?",
      },
      {
        id: "bezug-zu-laufendem-fall-pruefen-a2",
        text: "Wurde der Eingang dem passenden Fall zugeordnet?",
      },
    ],
  },

  "facharztbericht-einordnen": {
    id: "facharztbericht-einordnen",
    title: "Externen medizinischen Bericht einordnen",
    description:
      "Ein vorliegender externer medizinischer Bericht wird in den bestehenden Behandlungszusammenhang des Patienten eingeordnet.",
    // Konkrete Folgehandlungen (Einbestellung, Medikationsabgleich etc.) gehören in separate Checkpoints
    orientationAnchors: [
      {
        id: "facharztbericht-einordnen-a1",
        text: "Bericht wird mit der Patientenakte abgeglichen",
      },
      {
        id: "facharztbericht-einordnen-a2",
        text: "Neue Diagnosen / Änderungen werden berücksichtigt",
      },
      {
        id: "facharztbericht-einordnen-a3",
        text: "Therapie- / Medikationsänderungen werden berücksichtigt",
      },
      {
        id: "facharztbericht-einordnen-a4",
        text: "Weiterer Handlungsbedarf wird dokumentiert",
      },
      {
        id: "facharztbericht-einordnen-a5",
        text: "Erforderliche weitere Handlung wird veranlasst",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Terminplanung & Patientenkontakt
  // ---------------------------------------------------------------------------

  "anlass-der-einbestellung-pruefen": {
    id: "anlass-der-einbestellung-pruefen",
    title: "Anlass der Einbestellung prüfen",
    description:
      "Es wird gekl\u00e4rt, warum der Patient in die Praxis kommen bzw. \u00e4rztlich gesehen werden soll.",
    orientationHint:
      "Hier wird entschieden, ob eine Einbestellung erforderlich ist. Kontaktaufnahme und Terminvereinbarung erfolgen anschlie\u00dfend.",
    orientationAnchors: [
      {
        id: "anlass-der-einbestellung-pruefen-a1",
        text: "Kontrolluntersuchung erforderlich",
      },
      {
        id: "anlass-der-einbestellung-pruefen-a2",
        text: "Besprechung eines Befundes / Ergebnisses erforderlich",
      },
      {
        id: "anlass-der-einbestellung-pruefen-a3",
        text: "Medikamenten- / Therapiekontrolle erforderlich",
      },
      {
        id: "anlass-der-einbestellung-pruefen-a4",
        text: "\u00c4rztliche Beurteilung neuer Beschwerden erforderlich",
      },
      {
        id: "anlass-der-einbestellung-pruefen-a5",
        text: "Weiterf\u00fchrende Untersuchung erforderlich",
      },
      {
        id: "anlass-der-einbestellung-pruefen-a6",
        text: "Externe Empfehlung zur Wiedervorstellung liegt vor",
      },
    ],
  },

  "zeitpunkt-der-einbestellung-festlegen": {
    id: "zeitpunkt-der-einbestellung-festlegen",
    title: "Zeitpunkt der Einbestellung festlegen",
    description:
      "Der Zeitpunkt für die Einbestellung wird festgelegt — so dass der Termin weder zu früh noch zu spät liegt.",
    orientationHint:
      "Hier wird der erforderliche Zeitraum bzw. die zeitliche Priorität festgelegt — nicht der konkrete Termin vereinbart.",
    orientationAnchors: [
      {
        id: "zeitpunkt-der-einbestellung-festlegen-a1",
        text: "Liegt der geplante Termin im richtigen Abstand zur letzten Untersuchung?",
      },
      {
        id: "zeitpunkt-der-einbestellung-festlegen-a2",
        text: "Passt der Zeitpunkt zum aktuellen Anlass (z. B. Laborkontrolle, Medikamentenkontrolle)?",
      },
    ],
  },

  // Konfiguriert den Standard: welche Kontaktform für diesen Vorgang erforderlich/ausreichend ist
  "kontaktform-festlegen": {
    id: "kontaktform-festlegen",
    title: "Erforderliche Kontaktform festlegen",
    description:
      "Es ist festgelegt, welche Form des Kontakts für den jeweiligen Vorgang erforderlich oder ausreichend ist.",
    orientationHint:
      "Hier wird der Kontaktstandard für diesen Sachverhalt konfiguriert. Die tatsächliche Kontaktaufnahme ist ein eigener Prozessschritt.",
    orientationAnchors: [
      {
        id: "kontaktform-festlegen-a1",
        text: "Persönlicher Kontakt in der Praxis",
      },
      {
        id: "kontaktform-festlegen-a2",
        text: "Telefonischer Kontakt",
      },
      {
        id: "kontaktform-festlegen-a3",
        text: "Videosprechstunde",
      },
      {
        id: "kontaktform-festlegen-a4",
        text: "Asynchroner digitaler Kontakt",
      },
      {
        id: "kontaktform-festlegen-a5",
        text: "Kein erneuter Kontakt erforderlich",
      },
    ],
  },

  // Synchroner Kontakt: unmittelbar feststellbar, ob Patient erreicht wurde
  "patient-telefonisch-kontaktieren": {
    id: "patient-telefonisch-kontaktieren",
    title: "Patient direkt kontaktieren",
    description:
      "Synchroner Kontakt, bei dem unmittelbar festgestellt werden kann, ob der Patient erreicht wurde und ein direkter Austausch möglich ist.",
    orientationAnchors: [
      {
        id: "patient-telefonisch-kontaktieren-a1",
        text: "Telefonischer Kontakt",
      },
      {
        id: "patient-telefonisch-kontaktieren-a2",
        text: "Kontaktversuch wird dokumentiert",
      },
      {
        id: "patient-telefonisch-kontaktieren-a3",
        text: "Gesprächsinhalt wird dokumentiert",
      },
    ],
  },

  // Asynchroner Kontakt: keine unmittelbare Kenntnisnahme oder direkte Reaktion gesichert
  "patient-digital-kontaktieren": {
    id: "patient-digital-kontaktieren",
    title: "Patient asynchron kontaktieren",
    description:
      "Asynchroner Kontakt, bei dem eine Nachricht übermittelt wird, ohne dass unmittelbare Kenntnisnahme oder direkte Reaktion des Patienten gesichert ist.",
    orientationAnchors: [
      {
        id: "patient-digital-kontaktieren-a1",
        text: "Kontakt per SMS",
      },
      {
        id: "patient-digital-kontaktieren-a2",
        text: "Kontakt per E-Mail",
      },
      {
        id: "patient-digital-kontaktieren-a3",
        text: "Kontakt über das digitale Kommunikations-/Patientenportal",
      },
      {
        id: "patient-digital-kontaktieren-a4",
        text: "Zustellbestätigung ist erforderlich",
      },
      {
        id: "patient-digital-kontaktieren-a5",
        text: "Lesebestätigung ist erforderlich",
      },
      {
        id: "patient-digital-kontaktieren-a6",
        text: "Kontaktaufnahme wird dokumentiert",
      },
    ],
  },

  "erneuten-kontaktversuch-durchfuehren": {
    id: "erneuten-kontaktversuch-durchfuehren",
    title: "Erneuten Kontaktversuch durchführen",
    description:
      "Ein vorheriger Kontaktversuch ist nicht erfolgreich gewesen \u2014 es soll weiter versucht werden, den Patienten zu erreichen bzw. sicherzustellen, dass die notwendige Information ihn erreicht.",
    orientationHint: "Gilt nur, wenn ein fr\u00fcherer Kontaktversuch gescheitert ist.",
    orientationAnchors: [
      {
        id: "erneuten-kontaktversuch-durchfuehren-a1",
        text: "Erneuter direkter Kontaktversuch",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a2",
        text: "Erneuter asynchroner Kontaktversuch",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a3",
        text: "Anderer Kontaktweg wird genutzt",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a4",
        text: "Kontaktversuch \u00fcber hinterlegte / bevollm\u00e4chtigte Kontaktperson",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a5",
        text: "Kontaktversuch \u00fcber Pflegedienst / Pflegeeinrichtung",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a6",
        text: "Weitere Kontaktversuche werden dokumentiert",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a7",
        text: "Zeitpunkt / Frist f\u00fcr n\u00e4chsten Kontaktversuch wird festgelegt",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a8",
        text: "Erfolglos ausgesch\u00f6pfte Kontaktversuche werden dokumentiert",
      },
    ],
  },

  "termin-vereinbaren": {
    id: "termin-vereinbaren",
    title: "Termin vereinbaren",
    description: "F\u00fcr den vorgesehenen Anlass wird ein konkreter Termin vereinbart.",
    orientationHint:
      "Hier wird ein konkreter Termin vereinbart. Ob eine Einbestellung erforderlich ist und in welchem Zeitraum sie erfolgen soll, wird separat festgelegt.",
    orientationAnchors: [
      {
        id: "termin-vereinbaren-a1",
        text: "Terminart ist festgelegt",
      },
      {
        id: "termin-vereinbaren-a2",
        text: "Terminzeitpunkt ist festgelegt",
      },
      {
        id: "termin-vereinbaren-a3",
        text: "Termin ist im Praxissystem eingetragen",
      },
      {
        id: "termin-vereinbaren-a4",
        text: "Patient hat eine Terminbest\u00e4tigung erhalten",
      },
      {
        id: "termin-vereinbaren-a5",
        text: "Erforderliche Vorbereitungen / Hinweise zum Termin werden mitgeteilt",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Medikation & Rezepte
  // ---------------------------------------------------------------------------

  "angefragtes-medikament-pruefen": {
    id: "angefragtes-medikament-pruefen",
    title: "Angefragtes Medikament prüfen",
    description:
      "Die für die Bearbeitung notwendigen Angaben zu einem angefragten Medikament werden eindeutig geklärt.",
    orientationAnchors: [
      {
        id: "angefragtes-medikament-pruefen-a1",
        text: "Medikament / Präparat ist eindeutig bezeichnet",
      },
      {
        id: "angefragtes-medikament-pruefen-a2",
        text: "Wirkstärke ist eindeutig",
      },
      {
        id: "angefragtes-medikament-pruefen-a3",
        text: "Darreichungsform ist eindeutig",
      },
      {
        id: "angefragtes-medikament-pruefen-a4",
        text: "Dosierung / Einnahme ist eindeutig",
      },
    ],
  },

  "rezept-erstellen": {
    id: "rezept-erstellen",
    title: "Rezept erstellen",
    description: "Das Rezept wird auf Grundlage der zuvor gekl\u00e4rten Informationen erstellt.",
    orientationAnchors: [
      {
        id: "rezept-erstellen-a1",
        text: "Rezeptart ist festgelegt (z.\u202fB. Kassenrezept / Privatrezept)",
      },
      {
        id: "rezept-erstellen-a2",
        text: "Erforderliche Angaben werden in das Rezept \u00fcbernommen",
      },
      {
        id: "rezept-erstellen-a3",
        text: "\u00c4rztliche Freigabe ist erforderlich",
      },
    ],
  },

  "ueberweisung-erstellen": {
    id: "ueberweisung-erstellen",
    title: "Überweisung erstellen",
    description:
      "Die \u00dcberweisung wird auf Grundlage der zuvor gekl\u00e4rten Informationen erstellt.",
    orientationAnchors: [
      {
        id: "ueberweisung-erstellen-a1",
        text: "Erforderliche Angaben werden in die \u00dcberweisung \u00fcbernommen",
      },
      {
        id: "ueberweisung-erstellen-a2",
        text: "\u00c4rztliche Freigabe ist erforderlich",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Überweisung · Kontrolle · Wiedervorlage
  // ---------------------------------------------------------------------------

  "anlass-einer-ueberweisung-pruefen": {
    id: "anlass-einer-ueberweisung-pruefen",
    title: "Anlass einer Überweisung prüfen",
    description: "Es ist gekl\u00e4rt, warum die \u00dcberweisung erfolgt.",
    orientationHint:
      "Hier wird gekl\u00e4rt, warum eine \u00dcberweisung ben\u00f6tigt wird. Die konkrete medizinische Fragestellung wird separat festgelegt.",
    orientationAnchors: [
      {
        id: "anlass-einer-ueberweisung-pruefen-a1",
        text: "Anlass / Begr\u00fcndung der \u00dcberweisung ist dokumentiert",
      },
      {
        id: "anlass-einer-ueberweisung-pruefen-a2",
        text: "Anlass ergibt sich aus einer \u00e4rztlichen Anordnung",
      },
      {
        id: "anlass-einer-ueberweisung-pruefen-a3",
        text: "Anlass ergibt sich aus dokumentiertem Befund / Behandlungsverlauf",
      },
      {
        id: "anlass-einer-ueberweisung-pruefen-a4",
        text: "Zweck / Art der \u00dcberweisung ist gekl\u00e4rt",
      },
    ],
  },

  "fragestellung-der-ueberweisung-klaeren": {
    id: "fragestellung-der-ueberweisung-klaeren",
    title: "Fragestellung der Überweisung klären",
    description:
      "Es ist gekl\u00e4rt, welche konkrete Fragestellung bzw. welcher Auftrag mit der \u00dcberweisung verbunden ist.",
    orientationHint:
      "Hier wird die konkrete medizinische Fragestellung der \u00dcberweisung festgelegt. Der grunds\u00e4tzliche Anlass der \u00dcberweisung wird separat gepr\u00fcft.",
    orientationAnchors: [
      {
        id: "fragestellung-der-ueberweisung-klaeren-a1",
        text: "Konkrete Fragestellung / Auftrag ist dokumentiert",
      },
      {
        id: "fragestellung-der-ueberweisung-klaeren-a2",
        text: "Relevante Diagnose ist bekannt",
      },
      {
        id: "fragestellung-der-ueberweisung-klaeren-a3",
        text: "Relevante Vorinformationen / Befunde sind bekannt",
      },
    ],
  },

  // EXTERNAL_REVIEW_NEEDED: Anker erfordern Klärung der regulatorischen Voraussetzungen des Hausarztvermittlungsfalls
  "hausarztvermittlungsfall": {
    id: "hausarztvermittlungsfall",
    title: "Hausarztvermittlungsfall",
    description:
      "Es wird geklärt, ob für diesen Vorgang die Terminvermittlung durch die Hausarztpraxis als Hausarztvermittlungsfall genutzt wird.",
    orientationAnchors: [],
  },

  "kontrollinhalt-festlegen": {
    id: "kontrollinhalt-festlegen",
    title: "Kontrollinhalt festlegen",
    description:
      "Es wird festgelegt, welche Untersuchungen oder Parameter bei der Kontrolluntersuchung überprüft werden sollen.",
    orientationAnchors: [
      {
        id: "kontrollinhalt-festlegen-a1",
        text: "Ist klar, was bei der Kontrolle überprüft werden soll?",
      },
      {
        id: "kontrollinhalt-festlegen-a2",
        text: "Sind alle relevanten Punkte für diese Kontrolle bekannt?",
      },
    ],
  },

  "zur-wiedervorlage-vormerken": {
    id: "zur-wiedervorlage-vormerken",
    title: "Zur Wiedervorlage vormerken",
    description:
      "Ein Vorgang soll zu einem sp\u00e4teren Zeitpunkt oder beim Eintritt einer bestimmten Bedingung erneut bearbeitet bzw. aufgegriffen werden.",
    orientationAnchors: [
      {
        id: "zur-wiedervorlage-vormerken-a1",
        text: "Wiedervorlage zu einem festen Zeitpunkt",
      },
      {
        id: "zur-wiedervorlage-vormerken-a2",
        text: "Wiedervorlage nach festgelegter Frist",
      },
      {
        id: "zur-wiedervorlage-vormerken-a3",
        text: "Wiedervorlage bei Eintritt einer bestimmten Bedingung",
      },
      {
        id: "zur-wiedervorlage-vormerken-a4",
        text: "Wiedervorlage ist im Praxissystem dokumentiert",
      },
      {
        id: "zur-wiedervorlage-vormerken-a5",
        text: "Grund der Wiedervorlage ist dokumentiert",
      },
      {
        id: "zur-wiedervorlage-vormerken-a6",
        text: "Zust\u00e4ndigkeit f\u00fcr die Wiedervorlage ist festgelegt",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Allgemeine Organisation
  // ---------------------------------------------------------------------------

  "patient-informieren": {
    id: "patient-informieren",
    title: "Patient informieren",
    description:
      "Eine relevante Information wird an den Patienten oder einen vorgesehenen Informationsempf\u00e4nger weitergegeben.",
    orientationHint:
      "Betrifft ausschlie\u00dflich Informationsinhalt und Informationsempf\u00e4nger. Kontaktwege (\u2192 direkter/asynchroner Patientenkontakt) und Dokumentbereitstellung (\u2192 Dokument bereitstellen) sind eigenst\u00e4ndige Checkpoints.",
    orientationAnchors: [
      {
        id: "patient-informieren-a1",
        text: "\u00dcber Eingang / Vorliegen eines Ergebnisses oder Befundes informieren",
      },
      {
        id: "patient-informieren-a2",
        text: "\u00dcber konkretes Ergebnis / konkreten Befund informieren",
      },
      {
        id: "patient-informieren-a3",
        text: "\u00dcber den n\u00e4chsten erforderlichen Schritt informieren",
      },
      {
        id: "patient-informieren-a4",
        text: "\u00dcber erforderliche \u00e4rztliche Besprechung informieren",
      },
      {
        id: "patient-informieren-a5",
        text: "\u00dcber \u00e4rztlich festgestellte Diagnose informieren",
      },
      {
        id: "patient-informieren-a6",
        text: "Patient direkt",
      },
      {
        id: "patient-informieren-a7",
        text: "Hinterlegte / bevollm\u00e4chtigte Kontaktperson",
      },
      {
        id: "patient-informieren-a8",
        text: "Pflegedienst / Pflegeeinrichtung",
      },
    ],
  },

  "unterlagen-anfordern": {
    id: "unterlagen-anfordern",
    title: "Unterlagen anfordern",
    description:
      "Es wird festgelegt bzw. durchgef\u00fchrt, wie ben\u00f6tigte externe Unterlagen beschafft werden.",
    orientationAnchors: [
      {
        id: "unterlagen-anfordern-a1",
        text: "Praxis fordert die Unterlagen selbst an",
      },
      {
        id: "unterlagen-anfordern-a2",
        text: "Patient wird gebeten, die Unterlagen selbst anzufordern bzw. zu beschaffen",
      },
      {
        id: "unterlagen-anfordern-a3",
        text: "Vom Patienten",
      },
      {
        id: "unterlagen-anfordern-a4",
        text: "Von einer anderen Arztpraxis / einem Facharzt",
      },
      {
        id: "unterlagen-anfordern-a5",
        text: "Vom Krankenhaus",
      },
      {
        id: "unterlagen-anfordern-a6",
        text: "Von Pflegeeinrichtung / Pflegedienst",
      },
      {
        id: "unterlagen-anfordern-a7",
        text: "Von einer anderen beteiligten Stelle",
      },
      {
        id: "unterlagen-anfordern-a8",
        text: "Ben\u00f6tigte Unterlagen sind konkret benannt",
      },
      {
        id: "unterlagen-anfordern-a9",
        text: "Anforderung ist dokumentiert",
      },
      {
        id: "unterlagen-anfordern-a10",
        text: "Zeitpunkt / Frist zur Pr\u00fcfung des Eingangs ist festgelegt",
      },
    ],
  },

  "aktuellen-verlauf-erfassen": {
    id: "aktuellen-verlauf-erfassen",
    title: "Aktuellen Verlauf dokumentieren",
    description:
      "Der aktuelle Verlauf eines bereits bekannten Problems bzw. Sachverhalts ist im Krankenblatt nachvollziehbar dokumentiert.",
    orientationAnchors: [
      {
        id: "aktuellen-verlauf-erfassen-a1",
        text: "Ver\u00e4nderung seit dem letzten Kontakt ist dokumentiert",
      },
      {
        id: "aktuellen-verlauf-erfassen-a2",
        text: "Neue Beschwerden / Ver\u00e4nderungen sind dokumentiert",
      },
      {
        id: "aktuellen-verlauf-erfassen-a3",
        text: "Wirkung bisheriger Ma\u00dfnahmen ist dokumentiert",
      },
      {
        id: "aktuellen-verlauf-erfassen-a4",
        text: "Zwischenzeitliche Behandlungen oder Therapie\u00e4nderungen sind dokumentiert",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Prävention
  // ---------------------------------------------------------------------------

  "impfbedarf-pruefen": {
    id: "impfbedarf-pruefen",
    title: "Impfbedarf prüfen",
    description:
      "Für den Patienten wird auf Basis des individuellen Profils geprüft, ob ein Impfbedarf besteht.",
    orientationAnchors: [
      {
        id: "impfbedarf-pruefen-a1",
        text: "Ist für den Patienten ein konkreter Impfbedarf erkennbar?",
      },
      {
        id: "impfbedarf-pruefen-a2",
        text: "Sind die relevanten Empfehlungen (z. B. STIKO, ggf. reisemedizinische Leitlinien) einbezogen?",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Berechtigung & Vertretung
  // ---------------------------------------------------------------------------

  "berechtigung-pruefen": {
    id: "berechtigung-pruefen",
    title: "Berechtigung prüfen",
    // EXTERNAL_REVIEW_NEEDED: rechtliche Anforderungen an Nachweis und Form der Bevollmächtigung
    description:
      "Es wird geklärt, auf welcher Grundlage eine andere Person für den Patienten handeln oder Informationen erhalten kann, und ob beim konkreten Vorgang eine erneute Prüfung stattfindet.",
    orientationAnchors: [
      {
        id: "berechtigung-pruefen-a1",
        text: "Generelle Berechtigung / Bevollmächtigung ist im Krankenblatt hinterlegt",
      },
      {
        id: "berechtigung-pruefen-a2",
        text: "Berechtigung für den konkreten Vorgang wird geprüft",
      },
      {
        id: "berechtigung-pruefen-a3",
        text: "Identität der handelnden Person wird beim konkreten Vorgang geprüft",
      },
      {
        id: "berechtigung-pruefen-a4",
        text: "Identitätsnachweis wird beim konkreten Vorgang verlangt",
      },
      {
        id: "berechtigung-pruefen-a5",
        text: "Gesetzliche Vertretung ist hinterlegt",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Praxisorganisation
  // ---------------------------------------------------------------------------

  "behandlerzuordnung-geklaert": {
    id: "behandlerzuordnung-geklaert",
    title: "Behandlerzuordnung geklärt",
    description:
      "Es ist festgelegt, ob bzw. welchem Arzt, Behandler oder Praxisteam der Patient organisatorisch zugeordnet ist.",
    orientationAnchors: [
      {
        id: "behandlerzuordnung-geklaert-a1",
        text: "Patient ist einem bestimmten Arzt / Behandler zugeordnet",
      },
      {
        id: "behandlerzuordnung-geklaert-a2",
        text: "Patient ist einem bestimmten Praxisteam zugeordnet",
      },
      {
        id: "behandlerzuordnung-geklaert-a3",
        text: "Zuordnung ist im Praxissystem dokumentiert",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export function getCheckpoint(id: string): PracticeCheckpoint | undefined {
  return CHECKPOINT_CATALOG[id];
}

export function listCheckpoints(): PracticeCheckpoint[] {
  return Object.values(CHECKPOINT_CATALOG);
}
