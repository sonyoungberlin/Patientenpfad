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

const contactEmailQuestion: QuestionDefinition = {
  id: "CONTACT_EMAIL",
  text: "Wie lautet Ihre E-Mail-Adresse?",
  text_en: "What is your email address?",
  type: "text",
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

async function renderForm(language: "de" | "en" = "de") {
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
        questions={[contactEmailQuestion]}
        language={language}
        conditionalRules={[]}
      />,
    );
  });
  const upper = container.querySelector<HTMLInputElement>("[data-q-email]")!;
  const lower = container.querySelector<HTMLInputElement>("#CONTACT_EMAIL")!;
  return { container, root, upper, lower };
}

async function cleanup(
  root: ReturnType<typeof createRoot>,
  container: HTMLElement,
) {
  await act(async () => root.unmount());
  document.body.removeChild(container);
}

describe("PublicFormView CONTACT_EMAIL-Prefill", () => {
  it.each(["de", "en"] as const)(
    "synchronisiert die obere E-Mail im %s-Formular bis zur unteren Bearbeitung",
    async (language) => {
      const { container, root, upper, lower } = await renderForm(language);

      await act(async () => setInputValue(upper, "first@example.com"));
      expect(lower.value).toBe("first@example.com");

      await act(async () => setInputValue(upper, "second@example.com"));
      expect(lower.value).toBe("second@example.com");

      await act(async () => setInputValue(lower, "practice@example.org"));
      await act(async () => setInputValue(upper, "third@example.com"));
      expect(lower.value).toBe("practice@example.org");

      await cleanup(root, container);
    },
  );

  it("erhält bewusstes Leeren nach weiteren Änderungen der oberen E-Mail", async () => {
    const { container, root, upper, lower } = await renderForm();

    await act(async () => setInputValue(upper, "first@example.com"));
    await act(async () => setInputValue(lower, ""));
    await act(async () => setInputValue(upper, "second@example.com"));
    expect(lower.value).toBe("");

    await cleanup(root, container);
  });
});