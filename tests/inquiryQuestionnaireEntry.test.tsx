/**
 * @jest-environment jsdom
 */

import React from "react";

const account = {
  id: "account-1",
  current_practice: { id: "practice-1" },
  memberships: [{ practice_id: "practice-1", role: "USER" }],
};

const findManyMock = jest.fn();
const findUniqueMock = jest.fn();
const authMock = jest.fn();
const mockInquiryListClient = jest.fn(() => null);

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
  default: mockInquiryListClient,
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
    mockInquiryListClient.mockClear();
    findUniqueMock.mockResolvedValue({
      questionnaire_confirmation_text_1: "Bestätigung 1",
      questionnaire_confirmation_text_2: null,
      questionnaire_confirmation_text_3: null,
    });
  });

  it("verweist für den Einstieg ausschließlich auf das persistente Menü", async () => {
    const tree = await InquiriesPage();
    const link = findElement(
      tree,
      (element) => element.props.href === "/inquiries/questionnaire",
    );

    expect(link).toBeNull();
  });

  it("lädt Praxisvorlagen für USER über die aktuelle Practice", async () => {
    const tree = await InquiriesPage();
    const templateList = findElement(
      tree,
      (element) => element.type === mockInquiryListClient,
    );

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { owner_practice_id: "practice-1", is_template: true },
      }),
    );
    expect(templateList?.props.canManageTemplates).toBe(false);
  });

  it("kennzeichnet OWNER als verwaltungsberechtigt", async () => {
    authMock.mockResolvedValue({
      ...account,
      memberships: [{ practice_id: "practice-1", role: "OWNER" }],
    });

    const tree = await InquiriesPage();
    const templateList = findElement(
      tree,
      (element) => element.type === mockInquiryListClient,
    );

    expect(templateList?.props.canManageTemplates).toBe(true);
  });

  it("zeigt ADMIN Praxisvorlagen ohne Verwaltungsrecht", async () => {
    authMock.mockResolvedValue({
      ...account,
      memberships: [{ practice_id: "practice-1", role: "ADMIN" }],
    });

    const tree = await InquiriesPage();
    const templateList = findElement(
      tree,
      (element) => element.type === mockInquiryListClient,
    );

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { owner_practice_id: "practice-1", is_template: true },
      }),
    );
    expect(templateList?.props.canManageTemplates).toBe(false);
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
