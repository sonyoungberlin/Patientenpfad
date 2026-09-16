import {
  QUESTION_CATALOG,
  type QuestionDefinition,
  type QuestionOptionDefinition,
} from "@/lib/questionnaire/blockCatalog";
import { INTERNAL_QUESTION_CATALOG } from "@/lib/questionnaire/internalWorkflowRegistry";
import { OFFICE_QUESTION_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";
import { parseMultiSelectValue } from "@/lib/questionnaire/multiSelect";
import {
  getQuestionOptionLabel,
  getQuestionOptionValue,
  resolveQuestionOptionLabel,
  UNKNOWN_OPTION_LABEL,
} from "@/lib/questionnaire/questionOptions";

const catalogs = [
  { name: "patient", questions: QUESTION_CATALOG },
  { name: "office", questions: OFFICE_QUESTION_CATALOG },
  { name: "internal", questions: INTERNAL_QUESTION_CATALOG },
] as const;

const catalogQuestions = catalogs.flatMap(({ name, questions }) =>
  Object.values(questions).map((question) => ({ catalogName: name, question })),
);

const structuredQuestions = catalogQuestions.filter(({ question }) =>
  question.options?.some((option) => typeof option !== "string"),
);

const structuredOptionPairs = catalogQuestions.flatMap(({ catalogName, question }) =>
  (question.options ?? [])
    .filter((option): option is Exclude<QuestionOptionDefinition, string> => typeof option !== "string")
    .map((option) => ({ catalogName, question, option })),
);

const structuredMultiSelects = structuredQuestions.filter(
  ({ question }) => question.type === "multi_select" && (question.options?.length ?? 0) >= 2,
);

const repeatableFields = catalogQuestions.flatMap(({ catalogName, question }) =>
  (question.groupSchema ?? [])
    .filter((field) => field.options !== undefined)
    .map((field) => ({ catalogName, question, field })),
);

const structuredRepeatablePairs = repeatableFields.flatMap(({ catalogName, question, field }) =>
  (field.options ?? [])
    .filter((option): option is Exclude<QuestionOptionDefinition, string> => typeof option !== "string")
    .map((option) => ({ catalogName, question, field, option })),
);

const stringRepeatableOptions = repeatableFields.flatMap(({ catalogName, question, field }) =>
  (field.options ?? [])
    .filter((option): option is string => typeof option === "string")
    .map((option) => ({ catalogName, question, field, option })),
);

describe(
  `Questionnaire human labels (${catalogs.length} catalogs, ${structuredQuestions.length} structured questions, ${structuredOptionPairs.length} value-label pairs, ${repeatableFields.length} repeatable option fields, ${structuredRepeatablePairs.length} structured repeatable pairs, ${stringRepeatableOptions.length} repeatable string options)`,
  () => {
    it.each(catalogs)("$name catalog has human-readable text for every regular question", ({ questions }) => {
      for (const [questionId, question] of Object.entries(questions)) {
        expect({ questionId, text: question.text.trim() }).toEqual({
          questionId,
          text: expect.any(String),
        });
        expect(question.text.trim()).not.toBe("");
        expect(question.text.trim()).not.toBe(questionId);
      }
    });

    it.each(structuredOptionPairs)(
      "$catalogName/$question.id resolves $option.value to its defined label",
      ({ question, option }) => {
        const resolved = resolveQuestionOptionLabel(question, option.value);
        expect(resolved).toBe(option.label);
        if (option.value !== option.label) expect(resolved).not.toBe(option.value);
      },
    );

    it.each(structuredMultiSelects)(
      "$catalogName/$question.id resolves multiple stored values to labels",
      ({ question }) => {
        const options = question.options!.slice(0, 2);
        const storedValue = options.map(getQuestionOptionValue).join(", ");
        const expectedLabels = options.map(getQuestionOptionLabel);
        const labels = parseMultiSelectValue(
          storedValue,
          question.options!.map(getQuestionOptionValue),
        ).map((value) => resolveQuestionOptionLabel(question, value));

        expect(labels).toEqual(expectedLabels);
      },
    );

    it("covers at least one structured multi-select from the catalogs", () => {
      expect(structuredMultiSelects.length).toBeGreaterThan(0);
    });

    if (structuredRepeatablePairs.length > 0) {
      it.each(structuredRepeatablePairs)(
        "$catalogName/$question.id.$field.key resolves repeatable value $option.value to its label",
        ({ field, option }) => {
          expect(resolveQuestionOptionLabel({ options: field.options }, option.value)).toBe(option.label);
        },
      );
    } else {
      it("has no structured repeatable options in the current catalogs", () => {
        expect(structuredRepeatablePairs).toHaveLength(0);
      });
    }

    it.each(stringRepeatableOptions)(
      "$catalogName/$question.id.$field.key keeps visible string option $option compatible",
      ({ option }) => {
        expect(getQuestionOptionValue(option)).toBe(option);
        expect(getQuestionOptionLabel(option)).toBe(option);
      },
    );

    it.each([
      "some_internal_value",
      "NEW_PATIENT",
      "medical-examination",
      "INTERNAL.VALUE",
    ])("does not expose unknown technical value %s", (technicalValue) => {
      const question: QuestionDefinition = {
        id: "KNOWN_OPTIONS",
        text: "Bekannte Auswahl",
        type: "select",
        required: false,
        options: [{ value: "known", label: "Bekannt" }],
      };

      const resolved = resolveQuestionOptionLabel(question, technicalValue);
      expect(resolved).toBe(UNKNOWN_OPTION_LABEL);
      expect(resolved).not.toBe(technicalValue);
    });
  },
);