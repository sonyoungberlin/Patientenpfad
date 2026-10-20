import { M1_CHECKPOINT_MAP } from "@/lib/logic/m1Activation";

export type MfaDocumentationOption = {
  id: string;
  label: string;
  text: string;
};

export type MfaDocumentationOptions = {
  activities: MfaDocumentationOption[];
  nextSteps: MfaDocumentationOption[];
};

type DocumentationArea =
  | "kommunikation"
  | "medizinische_lage"
  | "versorgung_im_alltag"
  | "pflegebeobachtung"
  | "reha"
  | "pflegegrad"
  | "jobcenter";

const CORE_AREAS = [
  "kommunikation",
  "medizinische_lage",
  "versorgung_im_alltag",
] as const;

const OPTIONS_BY_AREA: Record<
  DocumentationArea,
  { activities: MfaDocumentationOption[]; nextSteps: MfaDocumentationOption[] }
> = {
  kommunikation: {
    activities: [
      { id: "communication-record-reviewed", label: "Krankenblatt gesichtet", text: "Krankenblatt gesichtet" },
      { id: "contact-details-checked", label: "Kontaktdaten geprüft", text: "Kontaktdaten geprüft" },
      { id: "contact-attempt-made", label: "Kontaktversuch unternommen", text: "Kontaktversuch unternommen" },
      { id: "digital-offers-discussed", label: "Digitale Praxisangebote besprochen", text: "Digitale Praxisangebote besprochen" },
      { id: "practice-process-discussed", label: "Praxisabläufe besprochen", text: "Praxisabläufe besprochen" },
    ],
    nextSteps: [
      { id: "identify-contact-person", label: "Kontaktperson ermitteln", text: "Kontaktperson wird ermittelt" },
      { id: "contact-patient-again", label: "Patient erneut kontaktieren", text: "Patient wird erneut kontaktiert" },
      { id: "update-contact-details", label: "Kontaktdaten aktualisieren", text: "Kontaktdaten werden aktualisiert" },
      { id: "offer-digital-support", label: "Unterstützung bei digitalen Angeboten anbieten", text: "Unterstützung bei digitalen Angeboten wird angeboten" },
      { id: "coordinate-practice-process", label: "Termin-/Kontaktablauf abstimmen", text: "Termin- und Kontaktablauf wird abgestimmt" },
    ],
  },
  medizinische_lage: {
    activities: [
      { id: "medical-record-reviewed", label: "Krankenblatt gesichtet", text: "Krankenblatt gesichtet" },
      { id: "available-records-reviewed", label: "Vorliegende Unterlagen gesichtet", text: "Vorliegende Unterlagen gesichtet" },
      { id: "medication-information-compared", label: "Medikationsangaben abgeglichen", text: "Medikationsangaben im Krankenblatt abgeglichen" },
      { id: "specialist-information-recorded", label: "Facharztangaben aufgenommen", text: "Facharztangaben aufgenommen" },
      { id: "epa-use-discussed", label: "ePA-Nutzung besprochen", text: "ePA-Nutzung besprochen" },
    ],
    nextSteps: [
      { id: "request-missing-records", label: "Fehlende Unterlagen anfordern", text: "Fehlende Unterlagen werden angefordert" },
      { id: "ask-medication-information", label: "Medikationsangaben erfragen", text: "Medikationsangaben werden erfragt" },
      { id: "obtain-specialist-information", label: "Facharzt-/Vorbehandlerangaben einholen", text: "Facharzt- und Vorbehandlerangaben werden eingeholt" },
      { id: "provide-epa-information", label: "Informationen zur ePA bereitstellen", text: "Informationen zur ePA werden bereitgestellt" },
    ],
  },
  versorgung_im_alltag: {
    activities: [
      { id: "daily-support-recorded", label: "Angaben zur Alltagshilfe aufgenommen", text: "Angaben zur Alltagshilfe aufgenommen" },
      { id: "support-contact-identified", label: "Kontaktperson/Unterstützungsstelle ermittelt", text: "Kontaktperson oder Unterstützungsstelle ermittelt" },
      { id: "appointment-organization-reviewed", label: "Terminorganisation geprüft", text: "Terminorganisation geprüft" },
    ],
    nextSteps: [
      { id: "contact-support-person", label: "Kontaktperson kontaktieren", text: "Kontaktperson wird kontaktiert" },
      { id: "clarify-daily-support", label: "Organisation der Alltagshilfe klären", text: "Organisation der Alltagshilfe wird geklärt" },
      { id: "involve-support-service", label: "Unterstützungsstelle einbeziehen", text: "Unterstützungsstelle wird einbezogen" },
      { id: "coordinate-appointment", label: "Terminorganisation abstimmen", text: "Terminorganisation wird abgestimmt" },
    ],
  },
  pflegebeobachtung: {
    activities: [
      { id: "contact-person-feedback-recorded", label: "Rückmeldung der Kontaktperson aufgenommen", text: "Rückmeldung der Kontaktperson aufgenommen" },
      { id: "observation-records-filed", label: "Beobachtungsunterlagen abgelegt", text: "Beobachtungsunterlagen abgelegt" },
    ],
    nextSteps: [
      { id: "submit-feedback-for-review", label: "Rückmeldung zur ärztlichen Sichtung vorlegen", text: "Rückmeldung wird zur ärztlichen Sichtung vorgelegt" },
      { id: "prepare-contact-person-follow-up", label: "Rückfrage bei der Kontaktperson vorbereiten", text: "Rückfrage bei der Kontaktperson wird vorbereitet" },
    ],
  },
  reha: {
    activities: [
      { id: "rehab-records-reviewed", label: "Reha-Unterlagen gesichtet", text: "Reha-Unterlagen gesichtet" },
      { id: "rehab-insurer-contact-recorded", label: "DRV-/GKV-Kontakt dokumentiert", text: "Kontakt zur DRV/GKV dokumentiert" },
    ],
    nextSteps: [
      { id: "request-rehab-records", label: "Fehlende Reha-Unterlagen anfordern", text: "Fehlende Reha-Unterlagen werden angefordert" },
      { id: "clarify-rehab-insurer-contact", label: "DRV-/GKV-Kontakt klären", text: "Kontakt zur DRV/GKV wird geklärt" },
    ],
  },
  pflegegrad: {
    activities: [
      { id: "md-records-reviewed", label: "MD-Unterlagen gesichtet", text: "MD-Unterlagen gesichtet" },
      { id: "care-diary-reviewed", label: "Pflegetagebuch gesichtet", text: "Pflegetagebuch gesichtet" },
    ],
    nextSteps: [
      { id: "request-md-records", label: "Fehlende MD-Unterlagen anfordern", text: "Fehlende MD-Unterlagen werden angefordert" },
      { id: "clarify-assessment-appointment", label: "Begutachtungstermin klären", text: "Begutachtungstermin wird geklärt" },
      { id: "prepare-care-diary", label: "Pflegetagebuch vorbereiten", text: "Pflegetagebuch wird vorbereitet" },
    ],
  },
  jobcenter: {
    activities: [
      { id: "application-records-reviewed", label: "Antragsunterlagen gesichtet", text: "Antragsunterlagen gesichtet" },
    ],
    nextSteps: [
      { id: "request-application-information", label: "Fehlende Antragsangaben anfordern", text: "Fehlende Antragsangaben werden angefordert" },
      { id: "prepare-authority-response", label: "Rückmeldung an zuständige Stelle vorbereiten", text: "Rückmeldung an die zuständige Stelle wird vorbereitet" },
    ],
  },
};

const FOLLOW_UP_AREAS = [
  { selection: "Reha-Antrag", checkpointIds: ["K03", "K04", "K05", "K06", "K07", "K14", "K15"], area: "reha" },
  { selection: "Pflegegrad / Höherstufung", checkpointIds: ["K03", "K04", "K05", "K06", "K07", "K16", "K17"], area: "pflegegrad" },
  { selection: "Jobcenter / Sozialleistungen", checkpointIds: ["K03", "K04", "K05", "K06", "K15"], area: "jobcenter" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function uniqueOptions(options: MfaDocumentationOption[]): MfaDocumentationOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

export function getMfaDocumentationOptions(
  m1SnapshotInitial: unknown,
  checkpoints: unknown,
): MfaDocumentationOptions {
  const areas = new Set<DocumentationArea>();
  const activeCheckpoints = Array.isArray(checkpoints)
    ? checkpoints.filter(isRecord)
    : [];
  const activeCheckpointIds = new Set(
    activeCheckpoints.flatMap((checkpoint) =>
      typeof checkpoint.id === "string" ? [checkpoint.id] : [],
    ),
  );
  const k11 = activeCheckpoints.find((checkpoint) => checkpoint.id === "K11");
  const selections = k11 && Array.isArray(k11.selections)
    ? k11.selections.filter((selection): selection is string => typeof selection === "string")
    : [];
  const conditionalCheckpointIds = new Set<string>(
    FOLLOW_UP_AREAS
      .filter((followUp) => selections.includes(followUp.selection))
      .flatMap((followUp) => followUp.checkpointIds),
  );

  const initialBlocks = isRecord(m1SnapshotInitial) && isRecord(m1SnapshotInitial.blocks)
    ? m1SnapshotInitial.blocks
    : {};
  for (const area of CORE_AREAS) {
    if (initialBlocks[area] === "unklar") areas.add(area);
    if (M1_CHECKPOINT_MAP[area].some(
      (id) => activeCheckpointIds.has(id) && !conditionalCheckpointIds.has(id),
    )) {
      areas.add(area);
    }
  }

  if (activeCheckpoints.some((checkpoint) =>
    (checkpoint.id === "K12" || checkpoint.id === "K13") && checkpoint.enabled === true
  )) {
    areas.add("pflegebeobachtung");
  }

  for (const followUp of FOLLOW_UP_AREAS) {
    if (
      selections.includes(followUp.selection) &&
      followUp.checkpointIds.every((id) => activeCheckpointIds.has(id))
    ) {
      areas.add(followUp.area);
    }
  }

  const selectedAreas = [...areas];
  return {
    activities: uniqueOptions(selectedAreas.flatMap((area) => OPTIONS_BY_AREA[area].activities)),
    nextSteps: uniqueOptions(selectedAreas.flatMap((area) => OPTIONS_BY_AREA[area].nextSteps)),
  };
}

function phrase(text: string): string {
  return text.trim().replace(/[.!?]+$/, "");
}

export function buildMfaDocumentationText(
  options: MfaDocumentationOptions,
  activityIds: readonly string[],
  nextStepIds: readonly string[],
  additionalText = "",
): string {
  const activities = activityIds.flatMap((id) => {
    const option = options.activities.find((candidate) => candidate.id === id);
    return option ? [option] : [];
  });
  const nextSteps = nextStepIds.flatMap((id) => {
    const option = options.nextSteps.find((candidate) => candidate.id === id);
    return option ? [option] : [];
  });
  if (activities.length === 0 || nextSteps.length === 0) return "";

  const activityText = activities.map((option) => phrase(option.text)).join("; ");
  const nextStepText = nextSteps.map((option) => phrase(option.label)).join("; ");
  const output = `MFA: ${activityText}. Weiteres Vorgehen: ${nextStepText}.`;
  const additional = additionalText.trim().slice(0, 160);
  return additional ? `${output} Ergänzung: ${phrase(additional)}.` : output;
}