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
        text: "Ist der Patient als Bestandspatient erfasst?",
      },
      {
        id: "patient-bekannt-a2",
        text: "Sind alle Stammdaten (Name, Adresse, Geburtsdatum) vollständig erfasst?",
      },
    ],
  },

  "dauermedikation-vorhanden": {
    id: "dauermedikation-vorhanden",
    title: "Dauermedikation vorhanden",
    description:
      "Der Patient hat mindestens ein dauerhaft verordnetes Medikament.",
    orientationAnchors: [
      {
        id: "dauermedikation-vorhanden-a1",
        text: "Ist in der Akte eine Dauermedikation dokumentiert?",
      },
      {
        id: "dauermedikation-vorhanden-a2",
        text: "Liegt aktuell eine Dauermedikation vor?",
      },
    ],
  },

  "dauermedikation-abgleichen": {
    id: "dauermedikation-abgleichen",
    title: "Dauermedikation abgleichen",
    description:
      "Die dokumentierte Dauermedikation wird mit externen Informationen abgeglichen (z. B. Krankenhausbrief, mitgebrachte Unterlagen).",
    orientationAnchors: [
      {
        id: "dauermedikation-abgleichen-a1",
        text: "Stimmt die dokumentierte Dauermedikation mit den vorliegenden externen Angaben überein?",
      },
      {
        id: "dauermedikation-abgleichen-a2",
        text: "Wurden Abweichungen erkannt und ärztlich geprüft?",
      },
    ],
  },

  "kontrolle-aktuell": {
    id: "kontrolle-aktuell",
    title: "Kontrolle aktuell",
    description: "Der Patient hat zuletzt eine Kontrolluntersuchung erhalten.",
    orientationAnchors: [
      {
        id: "kontrolle-aktuell-a1",
        text: "Hat zuletzt eine Kontrolluntersuchung in unserer Praxis stattgefunden?",
      },
      {
        id: "kontrolle-aktuell-a2",
        text: "Liegt die letzte Kontrolle innerhalb des praxisüblichen Intervalls?",
      },
    ],
  },

  "diagnose-dokumentiert": {
    id: "diagnose-dokumentiert",
    title: "Diagnose dokumentiert",
    description:
      "Eine aktuelle Diagnose ist in der Patientenakte dokumentiert.",
    orientationAnchors: [
      {
        id: "diagnose-dokumentiert-a1",
        text: "Ist eine aktuelle Diagnose in der Akte hinterlegt?",
      },
    ],
  },

  "versicherungsnachweis-vorhanden": {
    id: "versicherungsnachweis-vorhanden",
    title: "Versicherungsnachweis vorhanden",
    description:
      "Ein gültiger Versicherungsnachweis (eGK oder Ersatzbescheinigung) liegt vor.",
    orientationAnchors: [
      {
        id: "versicherungsnachweis-vorhanden-a1",
        text: "Liegt ein gültiger Versicherungsnachweis für das aktuelle Quartal vor?",
      },
    ],
  },

  "einwilligung-vorhanden": {
    id: "einwilligung-vorhanden",
    title: "Einwilligung vorhanden",
    description: "Eine relevante Einwilligung des Patienten liegt vor.",
    orientationAnchors: [
      {
        id: "einwilligung-vorhanden-a1",
        text: "Liegt eine dokumentierte Einwilligung vor?",
      },
      {
        id: "einwilligung-vorhanden-a2",
        text: "Liegt die Einwilligung zur Verarbeitung der Patientendaten vor?",
      },
    ],
  },

  "laborbefund-vorhanden": {
    id: "laborbefund-vorhanden",
    title: "Laborbefund vorhanden",
    description: "Ein Laborbefund für den Patienten liegt vor und ist in der Akte erfasst.",
    orientationAnchors: [
      {
        id: "laborbefund-vorhanden-a1",
        text: "Ist der Befund vollständig (alle angeforderten Parameter vorhanden)?",
      },
      {
        id: "laborbefund-vorhanden-a2",
        text: "Ist der Befund dem richtigen Patienten und Auftrag zugeordnet?",
      },
    ],
  },

  "unterlagen-vorhanden": {
    id: "unterlagen-vorhanden",
    title: "Unterlagen vorhanden",
    description:
      "Vom Patienten mitgebrachte Unterlagen liegen der Praxis vor und sind der Akte zugeordnet.",
    orientationAnchors: [
      {
        id: "unterlagen-vorhanden-a1",
        text: "Sind alle mitgebrachten Unterlagen vollständig und lesbar?",
      },
      {
        id: "unterlagen-vorhanden-a2",
        text: "Sind die Unterlagen dem richtigen Patienten zugeordnet?",
      },
      {
        id: "unterlagen-vorhanden-a3",
        text: "Enthalten die Unterlagen diagnose- oder therapierelevante Informationen?",
      },
    ],
  },

  "krankenhausbrief-vorhanden": {
    id: "krankenhausbrief-vorhanden",
    title: "Krankenhausbrief vorhanden",
    description:
      "Ein aktueller Entlass- oder Arztbrief aus einer stationären Behandlung liegt vor.",
    orientationAnchors: [
      {
        id: "krankenhausbrief-vorhanden-a1",
        text: "Liegt ein aktueller Krankenhausbericht vor?",
      },
      {
        id: "krankenhausbrief-vorhanden-a2",
        text: "Ist der Brief vollständig und lesbar?",
      },
    ],
  },

  "facharztbericht-vorhanden": {
    id: "facharztbericht-vorhanden",
    title: "Facharztbericht vorhanden",
    description:
      "Ein Facharztbericht für den Patienten liegt vollständig vor.",
    orientationAnchors: [
      {
        id: "facharztbericht-vorhanden-a1",
        text: "Liegt ein vollständiger und lesbarer Facharztbericht vor?",
      },
      {
        id: "facharztbericht-vorhanden-a2",
        text: "Ist der Bericht dem richtigen Patienten zugeordnet?",
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
      {
        id: "termin-vorhanden-a3",
        text: "Erfordern die mitgebrachten Unterlagen eine ärztliche Besprechung oder einen Folgetermin?",
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
      "Ein eingehender Vorgang oder ein Dokument wird dem richtigen Patienten in der Praxissoftware zugeordnet.",
    orientationAnchors: [
      {
        id: "patientenzuordnung-pruefen-a1",
        text: "Ist der Vorgang dem richtigen Patienten zugeordnet?",
      },
      {
        id: "patientenzuordnung-pruefen-a2",
        text: "Ist die Zuordnung anhand der im Dokument enthaltenen Angaben (Name, Geburtsdatum) eindeutig nachvollziehbar?",
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
      "Ein Vorgang oder Dokument wird zur weiteren Bearbeitung an die zuständige Person oder Stelle übergeben.",
    orientationHint:
      "Weitergeleitet bedeutet: Der Empfänger kennt den Vorgang und kann handeln — nicht nur, dass das Dokument übermittelt wurde.",
    orientationAnchors: [
      {
        id: "dokument-weiterleiten-a1",
        text: "Wurde der Vorgang an die zuständige Person oder Stelle weitergeleitet?",
      },
      {
        id: "dokument-weiterleiten-a2",
        text: "Hat die empfangende Person/Stelle Kenntnis vom Vorgang?",
      },
    ],
  },

  "dokument-dem-patienten-bereitstellen": {
    id: "dokument-dem-patienten-bereitstellen",
    title: "Dokument dem Patienten bereitstellen",
    description:
      "Ein Dokument wird dem Patienten zugänglich gemacht — digital (Portal, E-Mail) oder physisch (Ausdruck, Übergabe).",
    orientationHint:
      "Bezieht sich auf die Bereitstellung für den Patienten, nicht auf die interne Weiterleitung in der Praxis (→ Checkpoint Dokument weiterleiten).",
    orientationAnchors: [
      {
        id: "dokument-dem-patienten-bereitstellen-a1",
        text: "Hat der Patient das Dokument erhalten oder kann er es abrufen?",
      },
      {
        id: "dokument-dem-patienten-bereitstellen-a2",
        text: "Ist der Bereitstellungsweg für den Patienten zugänglich (erreichbar und lesbar)?",
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
      "Hier geht es nicht darum, einen Notfall einzuschätzen — sondern nur darum, ob der Arzt den Fall dringend prüfen muss.",
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
      "Die Befundwerte werden ärztlich auf klinische Relevanz bewertet.",
    orientationAnchors: [
      {
        id: "laborbefund-fachlich-bewerten-a1",
        text: "Wurden alle Befundwerte ärztlich bewertet?",
      },
      {
        id: "laborbefund-fachlich-bewerten-a2",
        text: "Sind alle Befundwerte im klinischen Kontext des Patienten eingeordnet?",
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
    title: "Facharztbericht einordnen",
    description:
      "Ein eingegangener Facharztbericht wird hausärztlich in den Behandlungskontext eingeordnet.",
    orientationHint:
      "Die fachärztliche Einschätzung steht bereits fest — es geht um die hausärztliche Einordnung der Empfehlungen, nicht um eine erneute Bewertung der Befunde.",
    orientationAnchors: [
      {
        id: "facharztbericht-einordnen-a1",
        text: "Wurde die Einschätzung des Facharztes mit der Patientenakte abgeglichen?",
      },
      {
        id: "facharztbericht-einordnen-a2",
        text: "Passen die Empfehlungen des Facharztes zur laufenden Behandlung?",
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
      "Vor der Einbestellung wird geprüft, aus welchem Grund der Patient in die Praxis kommen soll.",
    orientationAnchors: [
      {
        id: "anlass-der-einbestellung-pruefen-a1",
        text: "Ist klar, warum der Patient einbestellt werden soll?",
      },
      {
        id: "anlass-der-einbestellung-pruefen-a2",
        text: "Lässt sich der Anlass dem Patienten gut erklären?",
      },
    ],
  },

  "zeitpunkt-der-einbestellung-festlegen": {
    id: "zeitpunkt-der-einbestellung-festlegen",
    title: "Zeitpunkt der Einbestellung festlegen",
    description:
      "Der Zeitpunkt für die Einbestellung wird festgelegt — so dass der Termin weder zu früh noch zu spät liegt.",
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

  "patient-telefonisch-kontaktieren": {
    id: "patient-telefonisch-kontaktieren",
    title: "Patient telefonisch kontaktieren",
    description: "Der Patient wird telefonisch kontaktiert.",
    orientationAnchors: [
      {
        id: "patient-telefonisch-kontaktieren-a1",
        text: "Wurde der Patient telefonisch erreicht?",
      },
    ],
  },

  "patient-digital-kontaktieren": {
    id: "patient-digital-kontaktieren",
    title: "Patient digital kontaktieren",
    description:
      "Der Patient wird über einen digitalen Kanal kontaktiert (z. B. Praxisportal, SMS, E-Mail).",
    orientationAnchors: [
      {
        id: "patient-digital-kontaktieren-a1",
        text: "Wurde der Patient digital kontaktiert?",
      },
    ],
  },

  "erneuten-kontaktversuch-durchfuehren": {
    id: "erneuten-kontaktversuch-durchfuehren",
    title: "Erneuten Kontaktversuch durchführen",
    description:
      "Nach einem erfolglosen Kontaktversuch wird ein weiterer Versuch unternommen, den Patienten zu erreichen.",
    orientationHint: "Gilt nur, wenn ein früherer Kontaktversuch gescheitert ist.",
    orientationAnchors: [
      {
        id: "erneuten-kontaktversuch-durchfuehren-a1",
        text: "Wurde ein weiterer Kontaktversuch unternommen?",
      },
      {
        id: "erneuten-kontaktversuch-durchfuehren-a2",
        text: "Wurde der Patient beim erneuten Versuch erreicht?",
      },
    ],
  },

  "termin-vereinbaren": {
    id: "termin-vereinbaren",
    title: "Termin vereinbaren",
    description: "Mit dem Patienten wird ein Termin für die Praxis vereinbart.",
    orientationAnchors: [
      {
        id: "termin-vereinbaren-a1",
        text: "Wurde ein Termin mit dem Patienten vereinbart?",
      },
      {
        id: "termin-vereinbaren-a2",
        text: "Steht der Termin mit dem Patienten fest?",
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
      "Bei einer eingehenden Rezeptanfrage wird geprüft, welches Medikament gemeint ist und ob es zur bekannten Behandlung des Patienten passt.",
    orientationAnchors: [
      {
        id: "angefragtes-medikament-pruefen-a1",
        text: "Ist eindeutig klar, welches Medikament angefragt wird?",
      },
      {
        id: "angefragtes-medikament-pruefen-a2",
        text: "Passt die Anfrage zur bekannten Behandlung des Patienten?",
      },
    ],
  },

  "rezept-erstellen": {
    id: "rezept-erstellen",
    title: "Rezept erstellen",
    description: "Für den Patienten wird eine ärztliche Verordnung erstellt.",
    orientationAnchors: [
      {
        id: "rezept-erstellen-a1",
        text: "Wurde das Rezept ausgestellt?",
      },
      {
        id: "rezept-erstellen-a2",
        text: "Hat der Arzt das Rezept freigegeben?",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Überweisung · Kontrolle · Wiedervorlage
  // ---------------------------------------------------------------------------

  "anlass-einer-ueberweisung-pruefen": {
    id: "anlass-einer-ueberweisung-pruefen",
    title: "Anlass einer Überweisung prüfen",
    description:
      "Vor der Ausstellung einer Überweisung wird geprüft, welcher klinische Anlass die Überweisung begründet.",
    orientationAnchors: [
      {
        id: "anlass-einer-ueberweisung-pruefen-a1",
        text: "Ist klar, aus welchem Grund der Patient überwiesen werden soll?",
      },
      {
        id: "anlass-einer-ueberweisung-pruefen-a2",
        text: "Lässt sich der Überweisungsanlass eindeutig beschreiben?",
      },
    ],
  },

  "fragestellung-der-ueberweisung-klaeren": {
    id: "fragestellung-der-ueberweisung-klaeren",
    title: "Fragestellung der Überweisung klären",
    description:
      "Es wird geklärt, welche medizinische Frage durch die Überweisung beantwortet werden soll.",
    orientationAnchors: [
      {
        id: "fragestellung-der-ueberweisung-klaeren-a1",
        text: "Ist klar, welche Frage der Facharzt beantworten soll?",
      },
      {
        id: "fragestellung-der-ueberweisung-klaeren-a2",
        text: "Passt die Fragestellung zum Überweisungsanlass?",
      },
    ],
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
      "Ein offener Vorgang wird vorgemerkt, damit er zu einem bestimmten Zeitpunkt wieder aufgegriffen werden kann.",
    orientationAnchors: [
      {
        id: "zur-wiedervorlage-vormerken-a1",
        text: "Wurde der Vorgang zur Wiedervorlage vorgemerkt?",
      },
      {
        id: "zur-wiedervorlage-vormerken-a2",
        text: "Ist klar, wann oder unter welcher Bedingung der Vorgang wieder aufgegriffen werden soll?",
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
      "Dem Patienten wird eine relevante Information mitgeteilt — unabhängig vom Kommunikationskanal.",
    // Kontaktweg und Dokumentbereitstellung sind eigenständige Checkpoints
    orientationHint:
      "Bezieht sich ausschließlich auf den Informationsinhalt. Der Kontaktweg (telefonisch, digital) und die Bereitstellung eines Dokuments sind eigenständige Checkpoints.",
    orientationAnchors: [
      {
        id: "patient-informieren-a1",
        text: "Wurde der Patient informiert?",
      },
      {
        id: "patient-informieren-a2",
        text: "Weiß der Patient, ob und wie er reagieren soll?",
      },
    ],
  },

  "unterlagen-anfordern": {
    id: "unterlagen-anfordern",
    title: "Unterlagen anfordern",
    description:
      "Fehlende Unterlagen werden aktiv bei der zuständigen Stelle oder Person angefordert.",
    orientationAnchors: [
      {
        id: "unterlagen-anfordern-a1",
        text: "Ist klar, welche Unterlagen benötigt werden?",
      },
      {
        id: "unterlagen-anfordern-a2",
        text: "Wurden die benötigten Unterlagen angefordert?",
      },
    ],
  },

  "aktuellen-verlauf-erfassen": {
    id: "aktuellen-verlauf-erfassen",
    title: "Aktuellen Verlauf erfassen",
    description:
      "Der aktuelle Verlauf seit dem letzten relevanten Kontakt wird erfasst.",
    orientationHint: "Auch 'keine Veränderung' ist ein relevantes Ergebnis.",
    orientationAnchors: [
      {
        id: "aktuellen-verlauf-erfassen-a1",
        text: "Hat sich seit dem letzten relevanten Kontakt etwas verändert?",
      },
      {
        id: "aktuellen-verlauf-erfassen-a2",
        text: "Ist der aktuelle Verlauf ausreichend erfasst?",
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
