import { BLOCK_CATALOG, type QuestionnaireBlock } from "@/lib/questionnaire/blockCatalog";

export const QUESTIONNAIRE_BLOCK_GROUPS = [
  {
    id: "basis-kontakt",
    label: "Basis & Kontakt",
    blockIds: [
      "IDENTITAET",
      "KONTAKT",
      "KONTAKTPERSON",
      "ADRESSE",
      "VERSICHERUNG",
    ],
  },
  {
    id: "kurzanamnese",
    label: "Kurzanamnese",
    blockIds: ["KURZANAMNESE"],
  },
  {
    id: "praxisanliegen-verordnungen",
    label: "Praxisanliegen & Verordnungen",
    blockIds: [
      "ARBEITSUNFAEHIGKEIT",
      "REZEPT",
      "HEILMITTELVERORDNUNG",
      "UEBERWEISUNG",
      "HOSPITAL_ADMISSION",
      "TRANSPORT",
      "FACHAERZTE",
    ],
  },
  {
    id: "gesundheit-anamnese",
    label: "Gesundheit & Anamnese",
    blockIds: [
      "VOLLST_BASISDATEN",
      "VOLLST_ERKRANKUNGEN",
      "VOLLST_ALLERGIEN",
      "VOLLST_INFEKTIONEN",
      "VOLLST_FAMILIENANAMNESE",
      "VOLLST_VERSORGUNGSSTATUS",
      "VOLLST_NIKOTIN",
      "VOLLST_ALKOHOL",
      "VOLLST_SUBSTANZEN",
    ],
  },
  {
    id: "vorsorge-impfen",
    label: "Vorsorge & Impfen",
    blockIds: ["VOLLST_PRAEVENTION", "VOLLST_IMPFSTATUS", "IMPFBERATUNG"],
  },
  {
    id: "gewicht",
    label: "Gewicht",
    blockIds: ["ADIPOSITAS_GEWICHTSREDUKTION"],
  },
] as const;

export const QUESTIONNAIRE_BLOCK_IDS_PRESENTATION = QUESTIONNAIRE_BLOCK_GROUPS.flatMap(
  (group) => group.blockIds,
);

type PresentationBlock = Pick<QuestionnaireBlock, "id" | "label"> &
  Record<string, unknown>;

export type QuestionnaireBlockGroup<T extends PresentationBlock = PresentationBlock> = {
  id: (typeof QUESTIONNAIRE_BLOCK_GROUPS)[number]["id"];
  label: string;
  blocks: T[];
};

export function groupQuestionnaireBlocks<T extends PresentationBlock>(
  blocks: readonly T[],
): QuestionnaireBlockGroup<T>[] {
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  return QUESTIONNAIRE_BLOCK_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    blocks: group.blockIds.flatMap((id) => {
      const block = blocksById.get(id);
      return block ? [block] : [];
    }),
  })).filter((group) => group.blocks.length > 0);
}

export function validateQuestionnaireBlockPresentation(): void {
  const selectableIds = new Set(
    Object.values(BLOCK_CATALOG)
      .filter((block) => block.selectable !== false)
      .map((block) => block.id),
  );
  const presentationIds = QUESTIONNAIRE_BLOCK_IDS_PRESENTATION;
  const uniqueIds = new Set(presentationIds);
  const unknownIds = presentationIds.filter((id) => !(id in BLOCK_CATALOG));
  const nonSelectableIds = presentationIds.filter(
    (id) => BLOCK_CATALOG[id]?.selectable === false,
  );

  if (
    uniqueIds.size !== presentationIds.length ||
    presentationIds.length !== selectableIds.size ||
    unknownIds.length > 0 ||
    nonSelectableIds.length > 0
  ) {
    throw new Error(
      `Invalid questionnaire block presentation: unknown=${unknownIds.join(",")}, nonSelectable=${nonSelectableIds.join(",")}`,
    );
  }
}

validateQuestionnaireBlockPresentation();
