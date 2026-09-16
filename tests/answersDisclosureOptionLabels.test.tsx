import { renderToStaticMarkup } from "react-dom/server";
import AnswersDisclosure from "@/components/questionnaire/AnswersDisclosure";
import { QUESTION_CATALOG, type QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { resolveQuestionOptionLabel } from "@/lib/questionnaire/questionOptions";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";

describe("AnswersDisclosure option labels", () => {
  it("zeigt Labels statt gespeicherter Select-Werte", () => {
    const questions: QuestionDefinition[] = [
      {
        id: "SELECT",
        text: "Auswahl",
        type: "select",
        required: false,
        options: [{ value: "stored-value", label: "Lesbares Label" }],
      },
      {
        id: "MULTI",
        text: "Mehrfachauswahl",
        type: "multi_select",
        required: false,
        options: [
          { value: "first", label: "Erste Option" },
          { value: "second", label: "Zweite Option" },
        ],
      },
    ];

    const markup = renderToStaticMarkup(
      <AnswersDisclosure
        questions={questions}
        answers={{ SELECT: "stored-value", MULTI: "first, second" }}
        showSummary={false}
      />,
    );

    expect(markup).toContain("Lesbares Label");
    expect(markup).toContain("Erste Option, Zweite Option");
    expect(markup).not.toContain("stored-value");
  });

  it("zeigt unbekannte technische Werte nur als neutrales Fallback", () => {
    const question: QuestionDefinition = {
      id: "SELECT", text: "Auswahl", type: "select", required: false,
      options: [{ value: "known", label: "Bekannt" }],
    };
    const markup = renderToStaticMarkup(
      <AnswersDisclosure questions={[question]} answers={{ SELECT: "some_internal_value" }} showSummary={false} />,
    );
    expect(markup).toContain("Unbekannter Wert");
    expect(markup).not.toContain("some_internal_value");

    const legacyQuestion: QuestionDefinition = {
      id: "LEGACY_SELECT", text: "Legacy", type: "select", required: false,
    };
    const legacyMarkup = renderToStaticMarkup(
      <AnswersDisclosure
        questions={[legacyQuestion]}
        answers={{ LEGACY_SELECT: "some_internal_value" }}
        showSummary={false}
      />,
    );
    expect(legacyMarkup).toContain("Unbekannter Wert");
    expect(legacyMarkup).not.toContain("some_internal_value");
    expect(resolveQuestionOptionLabel(undefined, "SOME_INTERNAL_VALUE")).toBe("Unbekannter Wert");
  });

  it("zeigt echte Check-in-Values und eingefrorene historische Labels", () => {
    const frozenQuestion: QuestionDefinition = {
      ...QUESTION_CATALOG.CHECK_IN_PATIENT_TYPE,
      options: [{ value: "historic_patient", label: "Historischer Patient" }],
    };
    const currentMarkup = renderToStaticMarkup(
      <AnswersDisclosure
        questions={[
          QUESTION_CATALOG.CHECK_IN_PATIENT_TYPE,
          QUESTION_CATALOG.CHECK_IN_MAIN_REASON,
        ]}
        answers={{
          CHECK_IN_PATIENT_TYPE: "new_patient",
          CHECK_IN_MAIN_REASON: "sick_leave",
        }}
        showSummary={false}
      />,
    );
    const frozenMarkup = renderToStaticMarkup(
      <AnswersDisclosure
        questions={[frozenQuestion]}
        answers={{ CHECK_IN_PATIENT_TYPE: "historic_patient" }}
        showSummary={false}
      />,
    );
    expect(currentMarkup).toContain("Neupatient");
    expect(currentMarkup).toContain("Arbeitsunfähigkeit / AU");
    expect(currentMarkup).not.toContain("new_patient");
    expect(currentMarkup).not.toContain("sick_leave");
    expect(frozenMarkup).toContain("Historischer Patient");
    expect(frozenMarkup).not.toContain("historic_patient");
  });

  it("löst strukturierte Optionen in Repeatable-Unterfeldern auf", () => {
    const question: QuestionDefinition = {
      id: "GROUP", text: "Gruppe", type: "repeatable_group", required: false,
      groupSchema: [{
        key: "choice", label: "Wahl", type: "select", required: true,
        options: [{ value: "some_internal_value", label: "Menschenlesbares Label" }],
      }],
    };
    const markup = renderToStaticMarkup(
      <AnswersDisclosure
        questions={[question]}
        answers={{ GROUP: JSON.stringify([{ choice: "some_internal_value" }]) }}
        showSummary={false}
      />,
    );
    expect(markup).toContain("Menschenlesbares Label");
    expect(markup).not.toContain("some_internal_value");
  });

  it("rendert das strukturierte Impfobjekt menschenlesbar", () => {
    const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
    const answer = JSON.stringify({
      schema_version: 1,
      entries: [{
        vaccination_id: "hpv",
        status: "planned",
        note: "Termin vereinbart",
        doses: [{ number: 1, status: "done", date: "2026-01-31" }],
      }],
      supplemental_note: "Impfpass geprüft",
    });
    const markup = renderToStaticMarkup(
      <AnswersDisclosure questions={[question]} answers={{ VACCINATION_REVIEW_ITEMS: answer }} showSummary={false} />,
    );
    expect(markup).toContain("HPV: geplant");
    expect(markup).toContain("1. Dosis erfolgt am 31.01.2026");
    expect(markup).toContain("Impfpass geprüft");
    expect(markup).not.toContain("vaccination_id");
    expect(markup).not.toContain("schema_version");
  });
});