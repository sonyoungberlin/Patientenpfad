import { renderToStaticMarkup } from "react-dom/server";

const notFoundMock = jest.fn(() => { throw new Error("__NOT_FOUND__"); });
jest.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));
jest.mock("@/lib/prisma", () => ({ prisma: { practice: { findUnique: jest.fn() } } }));

import { prisma } from "@/lib/prisma";
import PracticeImprintPage from "@/app/praxis/[slug]/impressum/page";
import PracticePrivacyPage from "@/app/praxis/[slug]/datenschutz/page";

const profile = {
  official_practice_name: "Hausarztpraxis A",
  contract_party_name: "Praxis A GmbH",
  representative_name: null,
  legal_form: "GmbH",
  street: "A-Straße",
  house_number: "1",
  postal_code: "11111",
  city: "A-Stadt",
  country: "Deutschland",
  official_email: "a@example.test",
  phone: "030 111",
  medical_chamber: null,
  professional_title: null,
  professional_title_country: null,
  supervisory_authority: null,
  statutory_health_association: null,
  professional_rules_label: null,
  professional_rules_url: null,
  register_type: null,
  register_court: null,
  register_number: null,
  vat_id: null,
  additional_legal_information: null,
};

const practice = {
  id: "p-a",
  slug: "technical-a",
  public_slug: "praxis-a",
  name: "Intern A",
  public_name: "Praxis A",
  is_approved: true,
  message_signature: null,
  legal_profile: profile,
};

beforeEach(() => jest.clearAllMocks());

it("rendert Impressum und Datenschutz für die per Slug gefundene Praxis", async () => {
  (prisma.practice.findUnique as jest.Mock).mockResolvedValue(practice);
  const imprint = renderToStaticMarkup(
    await PracticeImprintPage({ params: Promise.resolve({ slug: "praxis-a" }) }),
  );
  const privacy = renderToStaticMarkup(
    await PracticePrivacyPage({ params: Promise.resolve({ slug: "praxis-a" }) }),
  );
  expect(imprint).toContain("Hausarztpraxis A");
  expect(imprint).toContain("A-Straße");
  expect(privacy).toContain("Empfangende Praxis");
  expect(privacy).toContain("30 Tage");
  expect(privacy).not.toContain("Praxis B");
  expect(prisma.practice.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { public_slug: "praxis-a" } }),
  );
});

it("zeigt bei unbekanntem oder manipuliertem Slug keine fremde Praxis", async () => {
  (prisma.practice.findUnique as jest.Mock).mockResolvedValue(null);
  await expect(
    PracticeImprintPage({ params: Promise.resolve({ slug: "praxis-b" }) }),
  ).rejects.toThrow("__NOT_FOUND__");
});