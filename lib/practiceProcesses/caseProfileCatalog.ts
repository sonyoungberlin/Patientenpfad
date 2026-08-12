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

  "eingang-krankenhausbericht": {
    id: "eingang-krankenhausbericht",
    title: "Eingang Krankenhausbericht",
    description:
      "Eingang und vollständige Verarbeitung eines Entlass- oder Arztbriefs nach stationärem Aufenthalt.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",              group: "Patientenstatus" },
      { checkpointId: "krankenhausbrief-vorhanden",   group: "Briefeingang" },
      { checkpointId: "diagnose-dokumentiert",        group: "Dokumentation" },
      { checkpointId: "dauermedikation-vorhanden",    group: "Dokumentation" },
      { checkpointId: "termin-vorhanden",             group: "Nachsorge" },
    ],
  },
  "eingang-laborbefund-intern": {
    id: "eingang-laborbefund-intern",
    title: "Eingang Laborbefund (intern)",
    description:
      "Eingang eines Laborbefunds zu einem intern angeordneten Auftrag der eigenen Praxis.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",          group: "Patientenstatus" },
      { checkpointId: "laborbefund-vorhanden",    group: "Befundeingang" },
      { checkpointId: "termin-vorhanden",         group: "Nachsorge" },
    ],
  },

  "eingang-laborbefund-extern": {
    id: "eingang-laborbefund-extern",
    title: "Eingang Laborbefund (extern / Facharzt)",
    description:
      "Eingang eines Laborbefunds, der von einem externen Arzt oder Facharzt eingesandt wurde.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",          group: "Patientenstatus" },
      { checkpointId: "laborbefund-vorhanden",    group: "Befundeingang" },
      { checkpointId: "diagnose-dokumentiert",    group: "Dokumentation" },
      { checkpointId: "termin-vorhanden",         group: "Nachsorge" },
    ],
  },
  "patient-bringt-unterlagen": {
    id: "patient-bringt-unterlagen",
    title: "Patient bringt Unterlagen mit",
    description:
      "Patient übergibt der Praxis Unterlagen, die in die Patientenakte aufzunehmen und zu verarbeiten sind.",
    checkpointRefs: [
      { checkpointId: "patient-bekannt",           group: "Patientenstatus" },
      { checkpointId: "unterlagen-vorhanden",      group: "Eingang" },
      { checkpointId: "diagnose-dokumentiert",     group: "Dokumentation" },
      { checkpointId: "dauermedikation-vorhanden", group: "Dokumentation" },
      { checkpointId: "termin-vorhanden",          group: "Nachsorge" },
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
