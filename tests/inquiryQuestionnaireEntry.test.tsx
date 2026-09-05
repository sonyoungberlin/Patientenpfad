/**
 * @jest-environment jsdom
 */

import React from "react";

const account = {
  id: "account-1",
  current_practice: { id: "practice-1" },
};

const findManyMock = jest.fn();
const findUniqueMock = jest.fn();
const authMock = jest.fn();

jest.mock("@/lib/authz", () => ({
  requireInquiriesAccessFromCookies: authMock,
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    inquirySession: { findMany: findManyMock },
    practice: { findUnique: findUniqueMock },
  },
}));

jest.mock("@/app/inquiries/InquiryListClient", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/app/inquiries/[id]/m3/InquiryM3Client", () => ({
  QuestionnaireRequestSection: (props: Record<string, unknown>) =>
    React.createElement("div", { "data-questionnaire-section": true, ...props }),
}));

import InquiriesPage from "@/app/inquiries/page";
import DirectQuestionnairePage from "@/app/inquiries/questionnaire/page";

type TestElement = React.ReactElement<Record<string, unknown>>;

function findElement(
  node: unknown,
  predicate: (element: TestElement) => boolean,
): TestElement | null {
  if (!node || typeof node !== "object") return null;
  if (React.isValidElement(node)) {
    const element = node as TestElement;
    if (predicate(element)) return element;
    const children = element.props.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        const found = findElement(child, predicate);
        if (found) return found;
      }
    } else {
      return findElement(children, predicate);
    }
  }
  return null;
}

describe("Eigenständiger Fragebogen-Einstieg", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(account);
    findManyMock.mockResolvedValue([]);
    findUniqueMock.mockResolvedValue({
      questionnaire_confirmation_text_1: "Bestätigung 1",
      questionnaire_confirmation_text_2: null,
      questionnaire_confirmation_text_3: null,
    });
  });

  it("bietet auf /inquiries den Einstieg /inquiries/questionnaire an", async () => {
    const tree = await InquiriesPage();
    const link = findElement(
      tree,
      (element) => element.props.href === "/inquiries/questionnaire",
    );

    expect(link).not.toBeNull();
    expect(link?.props.children).toBe("Fragebogen starten");
  });

  it("öffnet die wiederverwendete Section direkt ohne InquirySession", async () => {
    const tree = await DirectQuestionnairePage();
    const section = findElement(
      tree,
      (element) => element.props.mode === "direct",
    );

    expect(section).not.toBeNull();
    expect(section?.props.initialOpen).toBe(true);
    expect(section?.props.mode).toBe("direct");
    expect(section?.props.inquirySessionId).toBeUndefined();
    expect(section?.props.onLinkGenerated).toBeUndefined();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "practice-1" },
      select: {
        questionnaire_confirmation_text_1: true,
        questionnaire_confirmation_text_2: true,
        questionnaire_confirmation_text_3: true,
      },
    });
  });
});
