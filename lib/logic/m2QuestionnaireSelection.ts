import {
  CheckpointPerspective,
  isAssessmentCheckpoint,
  isMultiSelectCheckpoint,
  type ActiveCheckpoint,
} from "@/lib/types";
import {
  backfillPerspectives,
  ensureSelectionConditionalCheckpoints,
} from "@/lib/logic/checkpointCatalog";
import {
  getCatalogForMode,
  type M2Question,
} from "@/lib/logic/m2Questions";

export type M2QuestionnaireMode = "mfa" | "conversation";

export type M2QuestionGroupItem = {
  checkpointId: "K12" | "K13";
  question: M2Question;
};

export type M2QuestionGroup = {
  title: string;
  items: M2QuestionGroupItem[];
};

type K12K13GroupSpec = {
  title: string;
  items: ReadonlyArray<{ checkpointId: "K12" | "K13"; questionId: string }>;
};

export const M2_K12_K13_GROUPS: ReadonlyArray<K12K13GroupSpec> = [
  {
    title: "Mobilität & Sturz",
    items: [
      { checkpointId: "K12", questionId: "M2-01" },
      { checkpointId: "K12", questionId: "M2-02" },
      { checkpointId: "K13", questionId: "M2-01" },
      { checkpointId: "K13", questionId: "M2-02" },
    ],
  },
  {
    title: "Selbstversorgung & Alltag",
    items: [
      { checkpointId: "K12", questionId: "M2-03" },
      { checkpointId: "K12", questionId: "M2-04" },
      { checkpointId: "K13", questionId: "M2-04" },
    ],
  },
  {
    title: "Kognition & Stimmung",
    items: [
      { checkpointId: "K12", questionId: "M2-05" },
      { checkpointId: "K12", questionId: "M2-06" },
      { checkpointId: "K13", questionId: "M2-03" },
    ],
  },
  {
    title: "Ernährung & Flüssigkeit",
    items: [
      { checkpointId: "K12", questionId: "M2-07" },
      { checkpointId: "K12", questionId: "M2-08" },
      { checkpointId: "K12", questionId: "M2-09" },
      { checkpointId: "K12", questionId: "M2-10" },
      { checkpointId: "K13", questionId: "M2-08" },
    ],
  },
  {
    title: "Beschwerden & Sinnesfunktionen",
    items: [
      { checkpointId: "K12", questionId: "M2-11" },
      { checkpointId: "K13", questionId: "M2-05" },
      { checkpointId: "K13", questionId: "M2-07" },
      { checkpointId: "K13", questionId: "M2-06" },
    ],
  },
  {
    title: "Versorgung & Vorsorge",
    items: [
      { checkpointId: "K12", questionId: "M2-13" },
      { checkpointId: "K12", questionId: "M2-14" },
      { checkpointId: "K13", questionId: "M2-09" },
    ],
  },
  {
    title: "Durchgeführte Assessments",
    items: [
      { checkpointId: "K13", questionId: "M2-10" },
      { checkpointId: "K13", questionId: "M2-12" },
      { checkpointId: "K13", questionId: "M2-14" },
    ],
  },
];

export const M2_ASSESSMENT_GROUP_TITLE = "Durchgeführte Assessments";

export type M2QuestionnaireSelection = {
  visibleCheckpoints: ActiveCheckpoint[];
  questionsByCheckpoint: Record<string, readonly M2Question[]>;
  k13EmbeddedInK12: boolean;
  k13Checkpoint: ActiveCheckpoint | null;
  k12K13Groups: M2QuestionGroup[];
};

export function groupM2K12K13Questions(
  k12Questions: readonly M2Question[],
  k13Questions: readonly M2Question[],
): M2QuestionGroup[] {
  const byCheckpoint = {
    K12: new Map(k12Questions.map((question) => [question.id, question])),
    K13: new Map(k13Questions.map((question) => [question.id, question])),
  };
  const usedIds = new Set<string>();
  const groups = M2_K12_K13_GROUPS.flatMap((group) => {
    const items: M2QuestionGroupItem[] = [];
    for (const item of group.items) {
      const question = byCheckpoint[item.checkpointId].get(item.questionId);
      if (!question) continue;
      usedIds.add(`${item.checkpointId}:${item.questionId}`);
      items.push({ checkpointId: item.checkpointId, question });
    }
    return items.length > 0 ? [{ title: group.title, items }] : [];
  });

  const remaining = ([
    ...k12Questions.map((question) => ({ checkpointId: "K12" as const, question })),
    ...k13Questions.map((question) => ({ checkpointId: "K13" as const, question })),
  ]).filter(({ checkpointId, question }) => !usedIds.has(`${checkpointId}:${question.id}`));

  if (remaining.length > 0) {
    groups.push({ title: "Weitere Fragen", items: remaining });
  }
  return groups;
}

export function selectM2Questionnaire(
  checkpoints: ActiveCheckpoint[],
  mode: M2QuestionnaireMode,
): M2QuestionnaireSelection {
  const normalizedCheckpoints = backfillPerspectives(
    ensureSelectionConditionalCheckpoints(checkpoints),
  );
  const visibleCheckpoints = normalizedCheckpoints.filter((checkpoint) => {
    if (isMultiSelectCheckpoint(checkpoint)) return false;
    if (isAssessmentCheckpoint(checkpoint) && checkpoint.enabled !== true) return false;
    if (mode === "mfa") return true;
    return checkpoint.perspectives.includes(CheckpointPerspective.PATIENT);
  });
  const questionCatalog = getCatalogForMode(mode) ?? {};
  const questionsByCheckpoint = Object.fromEntries(
    visibleCheckpoints.map((checkpoint) => [
      checkpoint.id,
      questionCatalog[checkpoint.id] ?? [],
    ]),
  ) as Record<string, readonly M2Question[]>;
  const k12 = visibleCheckpoints.find((checkpoint) => checkpoint.id === "K12");
  const k13Checkpoint = visibleCheckpoints.find((checkpoint) => checkpoint.id === "K13") ?? null;
  const k13EmbeddedInK12 = Boolean(k12 && k13Checkpoint);
  const k12Questions = questionsByCheckpoint.K12 ?? [];
  const k13Questions = questionsByCheckpoint.K13 ?? [];
  const k12K13Groups = mode === "conversation" && k12 && k13Checkpoint &&
      k12Questions.length > 0 && k13Questions.length > 0
    ? groupM2K12K13Questions(k12Questions, k13Questions)
    : [];

  return {
    visibleCheckpoints,
    questionsByCheckpoint,
    k13EmbeddedInK12,
    k13Checkpoint,
    k12K13Groups,
  };
}