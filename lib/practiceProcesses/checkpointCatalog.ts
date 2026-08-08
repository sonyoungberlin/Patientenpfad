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
      {
        id: "dauermedikation-vorhanden-a3",
        text: "Stimmt das angeforderte Medikament mit der dokumentierten Dauermedikation überein?",
      },
      {
        id: "dauermedikation-vorhanden-a4",
        text: "Stimmt die dokumentierte Dauermedikation mit den Entlassungsmedikamenten laut Brief überein?",
      },
      {
        id: "dauermedikation-vorhanden-a5",
        text: "Stimmt die dokumentierte Dauermedikation mit den Angaben in den mitgebrachten Unterlagen überein?",
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
      {
        id: "diagnose-dokumentiert-a2",
        text: "Ist die Diagnose dokumentiert, die die aktuelle Medikation begründet?",
      },
      {
        id: "diagnose-dokumentiert-a3",
        text: "Sind alle im Krankenhausbericht enthaltenen Diagnosen in der Akte erfasst?",
      },
      {
        id: "diagnose-dokumentiert-a4",
        text: "Sind diagnoseerhebliche Befunde des einsendenden Arztes in der Akte übernommen?",
      },
      {
        id: "diagnose-dokumentiert-a5",
        text: "Sind dem Patienten bekannte Vorerkrankungen in der Akte erfasst?",
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
      {
        id: "laborbefund-vorhanden-a3",
        text: "Enthält der Befund Werte, die eine Rückmeldung an den Patienten erfordern?",
      },
      {
        id: "laborbefund-vorhanden-a4",
        text: "Enthält der Befund eine klinische Bewertung oder Empfehlung des einsendenden Arztes?",
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
        text: "Hat der Patient einen aktuellen Krankenhausbericht dabei?",
      },
      {
        id: "krankenhausbrief-vorhanden-a3",
        text: "Ist der Brief vollständig und lesbar?",
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
