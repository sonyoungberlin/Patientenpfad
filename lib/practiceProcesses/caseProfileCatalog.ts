import type { PracticeCaseProfile } from "./types";

// ---------------------------------------------------------------------------
// Bibliothek
// ---------------------------------------------------------------------------

const CASE_PROFILE_CATALOG: Readonly<Record<string, PracticeCaseProfile>> = {
  "rezeptanfrage-ohne-arzt": {
    id: "rezeptanfrage-ohne-arzt",
    title: "Rezeptanfrage ohne Arzt",
    description:
      "Ausstellung einer Folgeverordnung für eine bekannte Dauermedikation ohne persönliche Arztkonsultation.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                      group: "Patientenstatus" },
      { checkpointId: "versicherungsnachweis-vorhanden",      group: "Patientenstatus" },
      { checkpointId: "kontaktform-festlegen",                group: "Voraussetzungen" },
      { checkpointId: "dauermedikation-vorhanden",            group: "Medizinische Prüfung" },
      { checkpointId: "dauermedikation-abgleichen",           group: "Medizinische Prüfung" },
      { checkpointId: "kontrolle-aktuell",                    group: "Medizinische Prüfung" },
      { checkpointId: "diagnose-dokumentiert",                group: "Medizinische Prüfung" },
      { checkpointId: "angefragtes-medikament-pruefen",       group: "Medizinische Prüfung" },
      { checkpointId: "rezept-erstellen",                         group: "Abschluss" },
      { checkpointId: "dokument-dem-patienten-bereitstellen",     group: "Abschluss" },
      { checkpointId: "patient-informieren",                      group: "Abschluss" },
      { checkpointId: "informationsempfaenger-festlegen",         group: "Abschluss" },
      { checkpointId: "patient-telefonisch-kontaktieren",         group: "Klärung" },
      { checkpointId: "patient-digital-kontaktieren",         group: "Klärung" },
      { checkpointId: "anlass-der-einbestellung-pruefen",     group: "Klärung" },
      { checkpointId: "zeitpunkt-der-einbestellung-festlegen", group: "Klärung" },
      { checkpointId: "zur-wiedervorlage-vormerken",          group: "Klärung" },
    ],
  },

  // Klärungsfall: Medikament ist neu, geändert oder extern empfohlen
  "medikamentenaenderung": {
    id: "medikamentenaenderung",
    title: "Medikamentenänderung",
    description:
      "Anfrage für ein neues, geändertes oder extern empfohlenes Medikament, das ärztliche Prüfung erfordert.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                       group: "Patientenstatus" },
      { checkpointId: "versicherungsnachweis-vorhanden",       group: "Patientenstatus" },
      { checkpointId: "kontaktform-festlegen",                 group: "Voraussetzungen" },
      { checkpointId: "dauermedikation-vorhanden",             group: "Medizinische Prüfung" },
      { checkpointId: "angefragtes-medikament-pruefen",        group: "Medizinische Prüfung" },
      { checkpointId: "dauermedikation-abgleichen",            group: "Medizinische Prüfung" },
      { checkpointId: "diagnose-dokumentiert",                 group: "Medizinische Prüfung" },
      { checkpointId: "aktuellen-verlauf-erfassen",            group: "Medizinische Prüfung" },
      { checkpointId: "kontrolle-aktuell",                    group: "Medizinische Prüfung" },
      { checkpointId: "facharztbericht-einordnen",             group: "Medizinische Prüfung" },
      { checkpointId: "rezept-erstellen",                         group: "Abschluss" },
      { checkpointId: "patient-informieren",                      group: "Abschluss" },
      { checkpointId: "informationsempfaenger-festlegen",         group: "Abschluss" },
      { checkpointId: "dokument-dem-patienten-bereitstellen",     group: "Abschluss" },
      { checkpointId: "anlass-der-einbestellung-pruefen",         group: "Klärung" },
      { checkpointId: "zeitpunkt-der-einbestellung-festlegen", group: "Klärung" },
      { checkpointId: "patient-telefonisch-kontaktieren",      group: "Klärung" },
      { checkpointId: "patient-digital-kontaktieren",          group: "Klärung" },
      { checkpointId: "unterlagen-anfordern",                  group: "Klärung" },
      { checkpointId: "zur-wiedervorlage-vormerken",           group: "Klärung" },
    ],
  },

  "krankenhausbrief-eingegangen": {
    id: "krankenhausbrief-eingegangen",
    title: "Krankenhausbrief eingegangen",
    description:
      "Eingang eines Entlass- oder Arztbriefs nach stationärem Aufenthalt: Vollständigkeit prüfen und dem Arzt zur Einordnung weiterleiten.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                 group: "Patientenstatus" },
      { checkpointId: "patientenzuordnung-pruefen",      group: "Eingang" },
      { checkpointId: "unterlagen-vorhanden",            group: "Eingang" },
      { checkpointId: "dokument-digitalisieren",         group: "Verarbeitung" },
      { checkpointId: "dokument-kennzeichnen",           group: "Verarbeitung" },
      { checkpointId: "dringlichkeitsbedarf-erkennen",   group: "Einschätzung" },
      { checkpointId: "bezug-zu-laufendem-fall-pruefen", group: "Einschätzung" },
      { checkpointId: "dauermedikation-abgleichen",      group: "Einordnung" },
      { checkpointId: "facharztbericht-einordnen",       group: "Einordnung" },
      { checkpointId: "dokument-weiterleiten",           group: "Abschluss" },
      { checkpointId: "unterlagen-anfordern",            group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken",     group: "Abschluss" },
    ],
  },
  "laborbefund-eingegangen": {
    id: "laborbefund-eingegangen",
    title: "Laborbefund eingegangen",
    description:
      "Eingang eines Laborbefunds: Zuordnung prüfen und dem Arzt zur Bewertung weiterleiten.",
    checkpointRefs: [
      { checkpointId: "patientenzuordnung-pruefen",      group: "Eingang" },
      { checkpointId: "unterlagen-vorhanden",            group: "Eingang" },
      { checkpointId: "dokument-digitalisieren",         group: "Verarbeitung" },
      { checkpointId: "dokument-kennzeichnen",           group: "Verarbeitung" },
      { checkpointId: "dringlichkeitsbedarf-erkennen",   group: "Einschätzung" },
      { checkpointId: "bezug-zu-laufendem-fall-pruefen", group: "Einschätzung" },
      { checkpointId: "laborbefund-fachlich-bewerten",   group: "Befundbearbeitung" },
      { checkpointId: "dokument-weiterleiten",           group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken",     group: "Abschluss" },
    ],
  },

  "facharztbericht-eingegangen": {
    id: "facharztbericht-eingegangen",
    title: "Facharztbericht eingegangen",
    description:
      "Eingang eines Facharztberichts: Vollständigkeit prüfen und dem Arzt zur Einordnung weiterleiten.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                 group: "Patientenstatus" },
      { checkpointId: "patientenzuordnung-pruefen",      group: "Eingang" },
      { checkpointId: "unterlagen-vorhanden",            group: "Eingang" },
      { checkpointId: "dokument-digitalisieren",         group: "Verarbeitung" },
      { checkpointId: "dokument-kennzeichnen",           group: "Verarbeitung" },
      { checkpointId: "dringlichkeitsbedarf-erkennen",   group: "Einschätzung" },
      { checkpointId: "bezug-zu-laufendem-fall-pruefen", group: "Einschätzung" },
      { checkpointId: "dokument-weiterleiten",           group: "Abschluss" },
      { checkpointId: "unterlagen-anfordern",            group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken",     group: "Abschluss" },
    ],
  },

  "facharztbericht-bearbeiten": {
    id: "facharztbericht-bearbeiten",
    title: "Facharztbericht bearbeiten",
    description:
      "Ein eingegangener Facharztbericht wird hausärztlich eingeordnet und der Patient über das Ergebnis informiert.",
    checkpointRefs: [
      { checkpointId: "dringlichkeitsbedarf-erkennen",        group: "Einschätzung" },
      { checkpointId: "bezug-zu-laufendem-fall-pruefen",      group: "Einschätzung" },
      { checkpointId: "dauermedikation-abgleichen",           group: "Medizinische Einordnung" },
      { checkpointId: "facharztbericht-einordnen",            group: "Medizinische Einordnung" },
      { checkpointId: "patient-informieren",                      group: "Patientenkommunikation" },
      { checkpointId: "informationsempfaenger-festlegen",         group: "Patientenkommunikation" },
      { checkpointId: "kontaktform-festlegen",                    group: "Patientenkommunikation" },
      { checkpointId: "dokument-dem-patienten-bereitstellen",     group: "Patientenkommunikation" },
      { checkpointId: "dokument-weiterleiten",                group: "Abschluss" },
      { checkpointId: "unterlagen-anfordern",                 group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken",          group: "Abschluss" },
    ],
  },

  // Ausnahmefälle: Organisatorische Dokumentenprobleme
  "dokument-unklar": {
    id: "dokument-unklar",
    title: "Dokument unklar",
    description:
      "Ein eingehender Vorgang kann nicht eindeutig klassifiziert oder zugeordnet werden — Dokumenttyp, Absender oder Patientenbezug sind unklar.",
    checkpointRefs: [
      { checkpointId: "dokument-kennzeichnen",            group: "Klärung" },
      { checkpointId: "patientenzuordnung-pruefen",       group: "Klärung" },
      { checkpointId: "bezug-zu-laufendem-fall-pruefen",  group: "Klärung" },
      { checkpointId: "dokument-weiterleiten",            group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken",      group: "Abschluss" },
    ],
  },

  "dokument-nicht-zuordenbar": {
    id: "dokument-nicht-zuordenbar",
    title: "Dokument nicht zuordenbar",
    description:
      "Ein Dokument liegt vor, kann aber keinem Patienten in der Praxis zugeordnet werden.",
    checkpointRefs: [
      { checkpointId: "patientenzuordnung-pruefen",  group: "Klärung" },
      { checkpointId: "dokument-kennzeichnen",        group: "Klärung" },
      { checkpointId: "dokument-weiterleiten",        group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Abschluss" },
    ],
  },

  "dokument-fehlzugeordnet": {
    id: "dokument-fehlzugeordnet",
    title: "Dokument fehlzugeordnet",
    description:
      "Ein Dokument ist einem falschen Patienten zugeordnet. Der korrekte Patient ist identifizierbar.",
    checkpointRefs: [
      { checkpointId: "patientenzuordnung-pruefen", group: "Korrektur" },
      { checkpointId: "dokument-kennzeichnen",       group: "Korrektur" },
      { checkpointId: "dokument-weiterleiten",       group: "Abschluss" },
    ],
  },

  "eingang-mit-maengeln": {
    id: "eingang-mit-maengeln",
    title: "Eingang mit Mängeln",
    description:
      "Ein eingegangenes Dokument ist mangelhaft — unvollständig, unleserlich, abgeschnitten oder fehlerhaft gescannt.",
    checkpointRefs: [
      { checkpointId: "unterlagen-anfordern",        group: "Nachforderung" },
      { checkpointId: "dokument-weiterleiten",        group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Abschluss" },
    ],
  },

  "patient-bringt-unterlagen": {
    id: "patient-bringt-unterlagen",
    title: "Patient bringt Unterlagen mit",
    description:
      "Patient übergibt der Praxis Unterlagen, die geprüft, in die Akte aufgenommen und bei Bedarf weitergeleitet werden.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                 group: "Patientenstatus" },
      { checkpointId: "patientenzuordnung-pruefen",      group: "Eingang" },
      { checkpointId: "unterlagen-vorhanden",            group: "Eingang" },
      { checkpointId: "dokument-digitalisieren",         group: "Verarbeitung" },
      { checkpointId: "dokument-kennzeichnen",           group: "Verarbeitung" },
      { checkpointId: "dringlichkeitsbedarf-erkennen",   group: "Einschätzung" },
      { checkpointId: "bezug-zu-laufendem-fall-pruefen", group: "Einschätzung" },
      { checkpointId: "dokument-weiterleiten",           group: "Abschluss" },
      { checkpointId: "unterlagen-anfordern",            group: "Abschluss" },
      { checkpointId: "zur-wiedervorlage-vormerken",     group: "Abschluss" },
    ],
  },
  "neupatient": {
    id: "neupatient",
    title: "Neupatient",
    description:
      "Erstaufnahme eines neuen Patienten in die Praxis.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                 group: "Stammdaten" },
      { checkpointId: "versicherungsnachweis-vorhanden", group: "Stammdaten" },
      { checkpointId: "einwilligung-vorhanden",          group: "Stammdaten" },
      { checkpointId: "berechtigung-pruefen",            group: "Stammdaten" },
      { checkpointId: "behandlerzuordnung-geklaert",     group: "Organisation" },
      { checkpointId: "anamnese-dokumentiert",           group: "Anamnese" },
      { checkpointId: "diagnose-dokumentiert",           group: "Anamnese" },
      { checkpointId: "dauermedikation-vorhanden",       group: "Anamnese" },
      { checkpointId: "unterlagen-vorhanden",            group: "Unterlagen" },
      { checkpointId: "unterlagen-anfordern",            group: "Unterlagen" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Patientenanfragen & Kontaktanlässe
  // ---------------------------------------------------------------------------

  "terminanfrage": {
    id: "terminanfrage",
    title: "Terminanfrage",
    description: "Ein Patient fragt nach einem Termin in der Praxis.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",   group: "Patient" },
      { checkpointId: "termin-vereinbaren", group: "Abschluss" },
    ],
  },

  "ueberweisungsanfrage": {
    id: "ueberweisungsanfrage",
    title: "Überweisungsanfrage",
    description: "Ein Patient fragt nach einer Überweisung zu einem Facharzt.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                          group: "Patient" },
      { checkpointId: "versicherungsnachweis-vorhanden",           group: "Voraussetzungen" },
      { checkpointId: "anlass-einer-ueberweisung-pruefen",        group: "Klärung" },
      { checkpointId: "fragestellung-der-ueberweisung-klaeren",   group: "Klärung" },
      { checkpointId: "ueberweisung-erstellen",                   group: "Abschluss" },
      { checkpointId: "dokument-dem-patienten-bereitstellen",     group: "Abschluss" },
    ],
  },

  "verlaufskontakt": {
    id: "verlaufskontakt",
    title: "Verlaufskontakt",
    description: "Ein Patient meldet sich mit Rückmeldung zum aktuellen Krankheitsverlauf.",
    checkpointRefs: [
      { checkpointId: "aktuellen-verlauf-erfassen",  group: "Verlauf" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Abschluss" },
    ],
  },

  "rueckrufbitte": {
    id: "rueckrufbitte",
    title: "Rückrufbitte",
    description: "Ein Patient bittet um Rückontakt durch die Praxis.",
    checkpointRefs: [
      { checkpointId: "kontaktform-festlegen",       group: "Konfiguration" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Organisation" },
    ],
  },

  "befundanfrage": {
    id: "befundanfrage",
    title: "Befundanfrage",
    description: "Ein Patient fragt nach einem vorliegenden Befund.",
    checkpointRefs: [
      { checkpointId: "kontaktform-festlegen",                group: "Konfiguration" },
      { checkpointId: "patient-informieren",                  group: "Abschluss" },
      { checkpointId: "dokument-dem-patienten-bereitstellen", group: "Abschluss" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Befundkommunikation & Einbestellung
  // ---------------------------------------------------------------------------

  "patient-einbestellen": {
    id: "patient-einbestellen",
    title: "Patient einbestellen",
    description: "Die Praxis entscheidet, einen Patienten aktiv einzubestellen. Die Kontaktaufnahme folgt als nachgelagerter Prozess.",
    checkpointRefs: [
      { checkpointId: "anlass-der-einbestellung-pruefen",      group: "Entscheidung" },
      { checkpointId: "zeitpunkt-der-einbestellung-festlegen", group: "Entscheidung" },
    ],
  },

  "laborbefund-mitteilen": {
    id: "laborbefund-mitteilen",
    title: "Laborbefund mitteilen",
    description: "Ein bereits fachlich bewerteter Laborbefund wird dem Patienten mitgeteilt.",
    checkpointRefs: [
      { checkpointId: "kontaktform-festlegen",                    group: "Konfiguration" },
      { checkpointId: "patient-informieren",                      group: "Abschluss" },
      { checkpointId: "informationsempfaenger-festlegen",         group: "Abschluss" },
      { checkpointId: "dokument-dem-patienten-bereitstellen",     group: "Abschluss" },
    ],
  },

  "patient-nicht-erreichbar": {
    id: "patient-nicht-erreichbar",
    title: "Patient nicht erreichbar",
    description: "Ein notwendiger Kontakt zum Patienten ist nicht zustande gekommen. Die Praxis legt das weitere Vorgehen fest.",
    checkpointRefs: [
      { checkpointId: "erneuten-kontaktversuch-durchfuehren", group: "Kontakt" },
      { checkpointId: "zur-wiedervorlage-vormerken",         group: "Abschluss" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Chronische Erkrankungen & Verlauf
  // ---------------------------------------------------------------------------

  "patient-erinnern": {
    id: "patient-erinnern",
    title: "Patient erinnern",
    description:
      "Die Praxis erinnert den Patienten an eine fällige Kontrolle oder Vorsorgemaßnahme.",
    checkpointRefs: [
      { checkpointId: "kontaktform-festlegen",            group: "Konfiguration" },
      { checkpointId: "patient-informieren",              group: "Abschluss" },
      { checkpointId: "informationsempfaenger-festlegen", group: "Abschluss" },
    ],
  },

  "verschlechterung-gemeldet": {
    id: "verschlechterung-gemeldet",
    title: "Verschlechterung gemeldet",
    // Endet mit der Dringlichkeitseinschätzung — Einbestellungsentscheidung folgt als eigener Praxisfall
    description:
      "Ein Patient meldet eine konkrete Zustandsverschlechterung. Verlauf wird erfasst und Dringlichkeit eingeschätzt.",
    checkpointRefs: [
      { checkpointId: "aktuellen-verlauf-erfassen",    group: "Verlauf" },
      { checkpointId: "dringlichkeitsbedarf-erkennen", group: "Einschätzung" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Prävention
  // ---------------------------------------------------------------------------

  // Klärungsfall: Impfbedarf basiert auf ärztlicher Bewertung des individuellen Profils
  "impfung-empfehlen": {
    id: "impfung-empfehlen",
    title: "Impfung empfehlen",
    description:
      "Auf Basis des individuellen Patientenprofils wird ein Impfbedarf medizinisch festgestellt und dem Patienten empfohlen. Der Fall endet mit der Empfehlung — Durchführung und Organisation sind nachgelagerte Prozesse.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",     group: "Patient" },
      { checkpointId: "impfbedarf-pruefen",  group: "Entscheidung" },
      { checkpointId: "patient-informieren", group: "Abschluss" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Administrative Praxisfälle
  // ---------------------------------------------------------------------------

  "unterlagen-aushaendigen": {
    id: "unterlagen-aushaendigen",
    title: "Unterlagen aushändigen",
    description:
      "Der Patient fordert eigene Unterlagen oder Dokumente an. Der Fall beschreibt ausschließlich den eigenständigen Herausgabevorgang, nicht die Dokumenterstellung innerhalb anderer Praxisfälle.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                      group: "Patientenstatus" },
      { checkpointId: "dokument-dem-patienten-bereitstellen", group: "Abschluss" },
    ],
  },

  // Ausnahmefall: Patient war aufgefordert, Unterlagen mitzubringen — erscheint ohne sie
  "patient-ohne-unterlagen": {
    id: "patient-ohne-unterlagen",
    title: "Patient ohne Unterlagen",
    description:
      "Der Patient erscheint zu einem Kontakt, obwohl er aufgefordert war, bestimmte Unterlagen mitzubringen. Die fehlenden Dokumente werden nachgefordert und der Vorgang zur Wiedervorlage vorgemerkt.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",             group: "Patientenstatus" },
      { checkpointId: "unterlagen-anfordern",        group: "Nachforderung" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Abschluss" },
    ],
  },

  // Ausnahmefall: Auslöser ist der Arbeitsauftrag der Praxis — unabhängig vom ursprünglichen Besuchsgrund
  "versicherungsnachweis-fehlt": {
    id: "versicherungsnachweis-fehlt",
    title: "Versicherungsnachweis fehlt",
    description:
      "Bei einem Patientenkontakt fehlt der aktuelle Versicherungsnachweis. Der fehlende Nachweis erzeugt einen eigenständigen administrativen Arbeitsauftrag: dokumentieren und zur Wiedervorlage vormerken.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",               group: "Patientenstatus" },
      { checkpointId: "versicherungsnachweis-vorhanden", group: "Prüfung" },
      { checkpointId: "zur-wiedervorlage-vormerken",   group: "Abschluss" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Akteneinsicht & Drittanfragen
  // ---------------------------------------------------------------------------

  "akteneinsicht": {
    id: "akteneinsicht",
    title: "Akteneinsicht",
    description:
      "Der Patient fordert Einsicht in die vollständige eigene Akte oder Kopien davon an. Der Fall betrifft ausschließlich die Herausgabe der vollständigen Akte — nicht einzelne Dokumente für externe Zwecke.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                      group: "Patientenstatus" },
      { checkpointId: "dokument-dem-patienten-bereitstellen", group: "Abschluss" },
    ],
  },

  // Ausnahmefall: Anfrage endet immer mit Ablehnung — kein Abschluss-Checkpoint nötig
  "angehoerige-ohne-berechtigung": {
    id: "angehoerige-ohne-berechtigung",
    title: "Angehörige ohne Berechtigung",
    description:
      "Eine dritte Person fragt nach einem Patienten, ohne eine ausreichende Berechtigung nachweisen zu können. Die Praxis prüft das Vorliegen einer Berechtigung und lehnt die Anfrage ab. Der Fall endet mit der Ablehnung.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",        group: "Patientenstatus" },
      { checkpointId: "berechtigung-pruefen",   group: "Abschluss" },
    ],
  },

  "unzustellbare-post": {
    id: "unzustellbare-post",
    title: "Unzustellbare Post",
    description:
      "Ausgehende Post der Praxis kommt als unzustellbar zurück. Die Praxis versucht einen geeigneten Kommunikationsweg zum Patienten herzustellen und vermerkt den Vorgang zur Nachverfolgung.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                  group: "Patientenstatus" },
      { checkpointId: "patient-telefonisch-kontaktieren", group: "Kontakt" },
      { checkpointId: "zur-wiedervorlage-vormerken",      group: "Abschluss" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export function getCaseProfile(id: string): PracticeCaseProfile | undefined {
  return CASE_PROFILE_CATALOG[id];
}

export function listCaseProfiles(): PracticeCaseProfile[] {
  return Object.values(CASE_PROFILE_CATALOG);
}
