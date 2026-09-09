/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

jest.mock("@/components/SelfCheckInQrCode", () => ({
  SelfCheckInQrCode: () => null,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

async function submitYesNo(question: QuestionDefinition, value: string) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QuestionnaireFormClient
        token="token-1"
        questions={[question]}
        source="practice_direct"
        context="office"
      />,
    );
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>(`[data-q-yesno="${question.id}:${value}"]`)!.click();
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
    await Promise.resolve();
    await Promise.resolve();
  });
  const request = fetchMock.mock.calls[0][1] as RequestInit;
  const answers = JSON.parse(request.body as string).answers as Record<string, string>;
  await act(async () => root.unmount());
  document.body.removeChild(container);
  return answers;
}

describe("QuestionnaireFormClient yes_no-Werte", () => {
  beforeEach(() => fetchMock.mockReset());

  it.each(["ja", "nein"])("sendet Standardwert %s unverändert", async (value) => {
    const answers = await submitYesNo({
      id: "STANDARD_YES_NO",
      text: "Standardfrage",
      type: "yes_no",
      required: false,
    }, value);

    expect(answers.STANDARD_YES_NO).toBe(value);
  });

  it.each(["unauffällig", "auffällig"])("sendet klinischen Custom-Wert %s unverändert", async (value) => {
    const answers = await submitYesNo({
      id: "HEALTH_CHECK_GENERAL_STATUS",
      text: "Allgemeinzustand",
      type: "yes_no",
      required: false,
      options: ["unauffällig", "auffällig"],
    }, value);

    expect(answers.HEALTH_CHECK_GENERAL_STATUS).toBe(value);
  });
});