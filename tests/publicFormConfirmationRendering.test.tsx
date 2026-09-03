/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

import { PublicFormView } from "@/app/p/[slug]/PublicFormView";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

const confirmationText = "Ich bestätige den bestehenden deutschen Praxistext.";
const confirmationQuestion: QuestionDefinition = {
  id: "PRACTICE_CONFIRMATION_1",
  text: confirmationText,
  type: "confirmation",
  required: true,
};
const fachaerzteQuestion: QuestionDefinition = {
  id: "FACHAERZTE",
  text: "Behandelnde Fachärzte",
  type: "textarea",
  required: false,
};

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderForm(questions: QuestionDefinition[]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <PublicFormView
        slug="test-form"
        title="Test"
        introText={null}
        practiceSignature={null}
        questions={questions}
        conditionalRules={[]}
      />,
    );
  });
  return { container, root };
}

async function cleanup(
  root: ReturnType<typeof createRoot>,
  container: HTMLElement,
) {
  await act(async () => root.unmount());
  document.body.removeChild(container);
}

async function submit(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("PublicFormView Praxisbestätigung", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    mockRouterPush.mockReset();
  });

  it("rendert den unveränderten Praxistext mit Checkbox und ohne Textfeld", async () => {
    const { container, root } = await renderForm([confirmationQuestion]);
    const question = container.querySelector<HTMLElement>(
      '[data-q-question="PRACTICE_CONFIRMATION_1"]',
    )!;

    expect(question.textContent).toContain(confirmationText);
    expect(question.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(question.querySelector('input[type="text"]')).toBeNull();

    await cleanup(root, container);
  });

  it("blockiert unchecked und sendet checked exakt als true", async () => {
    const { container, root } = await renderForm([confirmationQuestion]);
    const email = container.querySelector<HTMLInputElement>("[data-q-email]")!;
    const checkbox = container.querySelector<HTMLInputElement>(
      '#PRACTICE_CONFIRMATION_1',
    )!;

    await act(async () => setInputValue(email, "patient@example.com"));
    await submit(container);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(checkbox.getAttribute("aria-invalid")).toBe("true");

    await act(async () => checkbox.click());
    await submit(container);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).answers).toEqual({
      PRACTICE_CONFIRMATION_1: "true",
    });

    await cleanup(root, container);
  });

  it("sendet FACHAERZTE und Confirmation unabhängig gemeinsam", async () => {
    const { container, root } = await renderForm([
      fachaerzteQuestion,
      confirmationQuestion,
    ]);
    const email = container.querySelector<HTMLInputElement>("[data-q-email]")!;
    const checkbox = container.querySelector<HTMLInputElement>(
      '#PRACTICE_CONFIRMATION_1',
    )!;
    const fachaerzteCard = container.querySelector<HTMLElement>(
      '[data-q-question="FACHAERZTE"]',
    )!;

    await act(async () => setInputValue(email, "patient@example.com"));
    await act(async () => {
      fachaerzteCard.querySelector<HTMLButtonElement>("button")!.click();
      checkbox.click();
    });
    await submit(container);

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const answers = JSON.parse(request.body as string).answers;
    expect(JSON.parse(answers.FACHAERZTE)).toHaveLength(1);
    expect(answers.PRACTICE_CONFIRMATION_1).toBe("true");

    await cleanup(root, container);
  });

  it("lässt normale Feldtypen unverändert", async () => {
    const questions: QuestionDefinition[] = [
      { id: "TEXT", text: "Text", type: "text", required: false },
      { id: "AREA", text: "Textarea", type: "textarea", required: false },
      {
        id: "SELECT",
        text: "Select",
        type: "select",
        required: false,
        options: ["A"],
      },
      {
        id: "GROUP",
        text: "Gruppe",
        type: "repeatable_group",
        required: false,
        groupSchema: [
          { key: "name", label: "Name", type: "text", required: false },
        ],
      },
    ];
    const { container, root } = await renderForm(questions);

    expect(container.querySelector('#TEXT[type="text"]')).not.toBeNull();
    expect(container.querySelector("textarea#AREA")).not.toBeNull();
    expect(container.querySelector("select#SELECT")).not.toBeNull();
    expect(container.querySelector('[data-rg-add="GROUP"]')).not.toBeNull();

    await cleanup(root, container);
  });
});
