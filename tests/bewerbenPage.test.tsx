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
  is_approved: true,
  office_cases_enabled: true,
  name: "Praxis am Markt",
};

beforeEach(() => jest.clearAllMocks());

describe("/bewerben/[slug]", () => {
  it("rendert über den öffentlichen Praxis-Slug", async () => {
    findUnique.mockResolvedValueOnce(ACTIVE_PRACTICE);
    const node = await BewerbenPage({
      params: Promise.resolve({ slug: "praxis-am-markt" }),
    });
    expect(renderToStaticMarkup(node)).toContain("Bewerbung bei Praxis am Markt");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { public_slug: "praxis-am-markt" } }),
    );
  });

  it("rendert weiterhin über den technischen Practice-Slug", async () => {
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ACTIVE_PRACTICE);
    const node = await BewerbenPage({
      params: Promise.resolve({ slug: "technischer-slug" }),
    });
    expect(renderToStaticMarkup(node)).toContain("Bewerbung bei Praxis am Markt");
    expect(findUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { slug: "technischer-slug" } }),
    );
  });
});