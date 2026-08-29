import { renderToStaticMarkup } from "react-dom/server";

const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
    },
    practiceQuestionnaireForm: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/app/p/[slug]/PublicFormView", () => ({
  PublicFormView: (props: { slug: string; successPath?: string }) => (
    <div data-slug={props.slug} data-success-path={props.successPath} />
  ),
}));

jest.mock("@/lib/questionnaire/frozenBlocks", () => ({
  buildFrozenBlocks: () => [],
}));

import { prisma } from "@/lib/prisma";
import PublicPracticeFormPage from "@/app/formular/[practiceSlug]/[formSlug]/page";

const pm = prisma as unknown as {
  practice: {
    findUnique: jest.Mock;
  };
  practiceQuestionnaireForm: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
  };
};

const ACTIVE_FORM = {
  title: "Bluthochdruck",
  intro_text: null,
  is_active: true,
  selected_block_ids: [],
  patient_language: "de",
  owner_practice_id: "p-1",
  owner_practice: {
    is_approved: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    message_signature: null,
  },
  owner_account: {
    is_approved: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  pm.practice.findUnique.mockResolvedValue({ id: "p-1" });
});

describe("/formular/[practiceSlug]/[formSlug]", () => {
  it("rendert ein Formular der angegebenen öffentlichen Praxis", async () => {
    pm.practiceQuestionnaireForm.findFirst.mockResolvedValue({ id: "form-1" });
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(ACTIVE_FORM);

    const node = await PublicPracticeFormPage({
      params: Promise.resolve({
        practiceSlug: "praxis-am-markt",
        formSlug: "bluthochdruck",
      }),
    });
    const markup = renderToStaticMarkup(node);

    expect(markup).toContain('data-slug="bluthochdruck"');
    expect(markup).toContain(
      'data-success-path="/formular/praxis-am-markt/bluthochdruck/eingereicht"',
    );
    expect(pm.practiceQuestionnaireForm.findFirst).toHaveBeenCalledWith({
      where: {
        slug: "bluthochdruck",
        owner_practice_id: "p-1",
      },
      select: { id: true },
    });
  });

  it("liefert 404 für eine falsche Praxis bei gültigem Formular-Slug", async () => {
    pm.practice.findUnique.mockResolvedValue(null);

    await expect(
      PublicPracticeFormPage({
        params: Promise.resolve({
          practiceSlug: "falsche-praxis",
          formSlug: "bluthochdruck",
        }),
      }),
    ).rejects.toThrow("__NOTFOUND__");
    expect(pm.practiceQuestionnaireForm.findFirst).not.toHaveBeenCalled();
  });
});