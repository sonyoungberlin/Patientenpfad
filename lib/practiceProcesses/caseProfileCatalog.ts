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
      { checkpointId: "patient-bekannt",           group: "Patientenstatus" },
      { checkpointId: "dauermedikation-vorhanden", group: "Medizinische Prüfung" },
      { checkpointId: "kontrolle-aktuell",         group: "Medizinische Prüfung" },
      { checkpointId: "rezept-erstellen",          group: "Abschluss" },
    ],
  },

  // Klärungsfall: Medikament ist neu, geändert oder extern empfohlen
  "medikamentenaenderung": {
    id: "medikamentenaenderung",
    title: "Medikamentenänderung",
    description:
      "Anfrage für ein neues, geändertes oder extern empfohlenes Medikament, das ärztliche Prüfung erfordert.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                group: "Patientenstatus" },
      { checkpointId: "angefragtes-medikament-pruefen", group: "Medizinische Prüfung" },
      { checkpointId: "dauermedikation-abgleichen",     group: "Medizinische Prüfung" },
      { checkpointId: "rezept-erstellen",               group: "Abschluss" },
    ],
  },

  "krankenhausbrief-eingegangen": {
    id: "krankenhausbrief-eingegangen",
    title: "Krankenhausbrief eingegangen",
    description:
      "Eingang eines Entlass- oder Arztbriefs nach stationärem Aufenthalt: Vollständigkeit prüfen und dem Arzt zur Einordnung weiterleiten.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",            group: "Patientenstatus" },
      { checkpointId: "krankenhausbrief-vorhanden", group: "Befundeingang" },
      { checkpointId: "dokument-weiterleiten",      group: "Abschluss" },
    ],
  },
  "laborbefund-eingegangen": {
    id: "laborbefund-eingegangen",
    title: "Laborbefund eingegangen",
    description:
      "Eingang eines Laborbefunds: Zuordnung prüfen und dem Arzt zur Bewertung weiterleiten.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",       group: "Patientenstatus" },
      { checkpointId: "laborbefund-vorhanden", group: "Befundeingang" },
      { checkpointId: "dokument-weiterleiten", group: "Abschluss" },
    ],
  },

  "facharztbericht-eingegangen": {
    id: "facharztbericht-eingegangen",
    title: "Facharztbericht eingegangen",
    description:
      "Eingang eines Facharztberichts: Vollständigkeit prüfen und dem Arzt zur Einordnung weiterleiten.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",            group: "Patientenstatus" },
      { checkpointId: "facharztbericht-vorhanden",  group: "Befundeingang" },
      { checkpointId: "dokument-weiterleiten",      group: "Abschluss" },
    ],
  },

  // Klärungsfall: Facharztbericht hausärztlich einordnen und Patienten informieren
  "facharztbericht-bearbeiten": {
    id: "facharztbericht-bearbeiten",
    title: "Facharztbericht bearbeiten",
    description:
      "Ein eingegangener Facharztbericht wird haustärztlich eingeordnet und der Patient über das Ergebnis informiert.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",           group: "Patientenstatus" },
      { checkpointId: "facharztbericht-einordnen", group: "Medizinische Einordnung" },
      { checkpointId: "patient-informieren",       group: "Abschluss" },
    ],
  },

  // Ausnahmefälle: Organisatorische Dokumentenprobleme
  "dokument-unklar": {
    id: "dokument-unklar",
    title: "Dokument unklar",
    description:
      "Ein eingehender Vorgang kann nicht eindeutig klassifiziert oder zugeordnet werden — Dokumenttyp, Absender oder Patientenbezug sind unklar.",
    checkpointRefs: [
      { checkpointId: "dokument-kennzeichnen",      group: "Identifikation" },
      { checkpointId: "patientenzuordnung-pruefen", group: "Identifikation" },
      { checkpointId: "dokument-weiterleiten",      group: "Abschluss" },
    ],
  },

  "dokument-nicht-zuordenbar": {
    id: "dokument-nicht-zuordenbar",
    title: "Dokument nicht zuordenbar",
    description:
      "Ein Dokument liegt vor, kann aber keinem Patienten in der Praxis zugeordnet werden.",
    checkpointRefs: [
      { checkpointId: "patientenzuordnung-pruefen",  group: "Klärung" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Abschluss" },
    ],
  },

  "dokument-fehlzugeordnet": {
    id: "dokument-fehlzugeordnet",
    title: "Dokument fehlzugeordnet",
    description:
      "Ein Dokument ist einem falschen Patienten zugeordnet. Der korrekte Patient ist identifizierbar.",
    checkpointRefs: [
      { checkpointId: "patientenzuordnung-pruefen", group: "Klärung" },
      { checkpointId: "dokument-weiterleiten",      group: "Abschluss" },
    ],
  },

  "eingang-mit-maengeln": {
    id: "eingang-mit-maengeln",
    title: "Eingang mit Mängeln",
    description:
      "Ein eingegangenes Dokument ist mangelhaft — unvollständig, unleserlich, abgeschnitten oder fehlerhaft gescannt.",
    checkpointRefs: [
      { checkpointId: "dokument-kennzeichnen",       group: "Mängelerfassung" },
      { checkpointId: "unterlagen-anfordern",        group: "Nachforderung" },
      { checkpointId: "zur-wiedervorlage-vormerken", group: "Abschluss" },
    ],
  },

  "patient-bringt-unterlagen": {
    id: "patient-bringt-unterlagen",
    title: "Patient bringt Unterlagen mit",
    description:
      "Patient übergibt der Praxis Unterlagen, die in die Akte aufzunehmen und weiterzuleiten sind.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",       group: "Patientenstatus" },
      { checkpointId: "unterlagen-vorhanden",  group: "Eingang" },
      { checkpointId: "dokument-weiterleiten", group: "Abschluss" },
    ],
  },
  "neupatient": {
    id: "neupatient",
    title: "Neupatient",
    description:
      "Erstaufnahme eines neuen Patienten in die Praxis.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",              group: "Stammdaten" },
      { checkpointId: "versicherungsnachweis-vorhanden", group: "Stammdaten" },
      { checkpointId: "einwilligung-vorhanden",       group: "Stammdaten" },
      { checkpointId: "diagnose-dokumentiert",        group: "Anamnese" },
      { checkpointId: "dauermedikation-vorhanden",    group: "Anamnese" },
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
      { checkpointId: "patient-bekannt",                    group: "Patient" },
      { checkpointId: "anlass-der-einbestellung-pruefen",   group: "Klärung" },
      { checkpointId: "termin-vereinbaren",                 group: "Abschluss" },
    ],
  },

  "ueberweisungsanfrage": {
    id: "ueberweisungsanfrage",
    title: "Überweisungsanfrage",
    description: "Ein Patient fragt nach einer Überweisung zu einem Facharzt.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                      group: "Patient" },
      { checkpointId: "anlass-einer-ueberweisung-pruefen",    group: "Klärung" },
      { checkpointId: "fragestellung-der-ueberweisung-klaeren", group: "Klärung" },
      { checkpointId: "ueberweisung-erstellen",               group: "Abschluss" },
    ],
  },

  "verlaufskontakt": {
    id: "verlaufskontakt",
    title: "Verlaufskontakt",
    description: "Ein Patient meldet sich mit Rückmeldung zum aktuellen Krankheitsverlauf.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",         group: "Patient" },
      { checkpointId: "aktuellen-verlauf-erfassen", group: "Verlauf" },
      { checkpointId: "kontrolle-aktuell",       group: "Abschluss" },
    ],
  },

  "rueckrufbitte": {
    id: "rueckrufbitte",
    title: "Rückrufbitte",
    description: "Ein Patient bittet darum, von der Praxis zurückgerufen zu werden.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                  group: "Patient" },
      { checkpointId: "zur-wiedervorlage-vormerken",      group: "Organisation" },
      { checkpointId: "patient-telefonisch-kontaktieren", group: "Abschluss" },
    ],
  },

  "befundanfrage": {
    id: "befundanfrage",
    title: "Befundanfrage",
    description: "Ein Patient fragt nach einem vorliegenden Befund.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",   group: "Patient" },
      { checkpointId: "patient-informieren", group: "Abschluss" },
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
      { checkpointId: "patient-bekannt",                   group: "Patient" },
      { checkpointId: "anlass-der-einbestellung-pruefen",  group: "Entscheidung" },
      { checkpointId: "zeitpunkt-der-einbestellung-festlegen", group: "Entscheidung" },
    ],
  },

  "laborbefund-mitteilen": {
    id: "laborbefund-mitteilen",
    title: "Laborbefund mitteilen",
    description: "Der Arzt hat den Laborbefund ausgewertet. Das unauffällige Ergebnis wird dem Patienten mitgeteilt.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",               group: "Patient" },
      { checkpointId: "laborbefund-fachlich-bewerten", group: "Auswertung" },
      { checkpointId: "patient-informieren",           group: "Abschluss" },
    ],
  },

  "patient-nicht-erreichbar": {
    id: "patient-nicht-erreichbar",
    title: "Patient nicht erreichbar",
    description: "Alle Kontaktversuche sind gescheitert. Der offene Vorgang wird zur Wiedervorlage vorgemerkt.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",                    group: "Patient" },
      { checkpointId: "erneuten-kontaktversuch-durchfuehren", group: "Kontakt" },
      { checkpointId: "zur-wiedervorlage-vormerken",        group: "Abschluss" },
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
