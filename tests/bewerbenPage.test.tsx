import { renderToStaticMarkup } from "react-dom/server";

const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { practice: { findUnique: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import BewerbenPage from "@/app/bewerben/[slug]/page";

const findUnique = (
  prisma as unknown as { practice: { findUnique: jest.Mock } }
).practice.findUnique;

const ACTIVE_PRACTICE = {
  id: "practice-1",
  is_approved: true,
  office_cases_enabled: true,
  name: "Praxis am Markt",
  public_name: "Hausarztpraxis Muster",
  legal_profile: null,
};

beforeEach(() => jest.clearAllMocks());

describe("/bewerben/[slug]", () => {
  it("rendert über den öffentlichen Praxis-Slug", async () => {
    findUnique.mockResolvedValueOnce(ACTIVE_PRACTICE).mockResolvedValueOnce(ACTIVE_PRACTICE);
    const node = await BewerbenPage({
      params: Promise.resolve({ slug: "praxis-am-markt" }),
    });
    const markup = renderToStaticMarkup(node);
    expect(markup).toContain("Bewerben bei Hausarztpraxis Muster");
    expect(markup).not.toContain("Bewerben bei Praxis am Markt");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { public_slug: "praxis-am-markt" } }),
    );
  });

  it("rendert weiterhin über den technischen Practice-Slug", async () => {
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ACTIVE_PRACTICE)
      .mockResolvedValueOnce(ACTIVE_PRACTICE);
    const node = await BewerbenPage({
      params: Promise.resolve({ slug: "technischer-slug" }),
    });
    expect(renderToStaticMarkup(node)).toContain("Bewerben bei Hausarztpraxis Muster");
    expect(findUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { slug: "technischer-slug" } }),
    );
  });
});