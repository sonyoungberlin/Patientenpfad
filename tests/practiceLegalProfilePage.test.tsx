import { renderToStaticMarkup } from "react-dom/server";

const notFoundMock = jest.fn(() => { throw new Error("__NOT_FOUND__"); });
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  notFound: () => notFoundMock(),
}));
jest.mock("@/lib/auth", () => ({ getSessionAccountFromCookies: jest.fn() }));
jest.mock("@/lib/authz", () => ({ requirePracticeRoleFromCookies: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { practiceLegalProfile: { findUnique: jest.fn() } },
}));

import { getSessionAccountFromCookies } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import PracticeLegalProfilePage from "@/app/practice/legal-profile/page";

const account = {
  id: "acc-1",
  is_approved: true,
  current_practice: { id: "p-1" },
};

beforeEach(() => jest.clearAllMocks());

it.each(["OWNER", "ADMIN"])("%s kann das offizielle Profil lesen", async () => {
  (getSessionAccountFromCookies as jest.Mock).mockResolvedValue(account);
  (requirePracticeRoleFromCookies as jest.Mock).mockResolvedValue(account);
  (prisma.practiceLegalProfile.findUnique as jest.Mock).mockResolvedValue({
    official_practice_name: "Praxis Eins",
    street: "Musterweg",
    house_number: "1",
    postal_code: "12345",
    city: "Musterstadt",
    country: "Deutschland",
    official_email: "praxis@example.test",
    phone: "030 123",
  });
  const html = renderToStaticMarkup(await PracticeLegalProfilePage());
  expect(html).toContain("Praxis Eins");
  expect(html).not.toContain("<form");
});

it.each(["USER", "INBOX_ONLY"])("%s erhält keinen Lesezugriff", async () => {
  (getSessionAccountFromCookies as jest.Mock).mockResolvedValue(account);
  (requirePracticeRoleFromCookies as jest.Mock).mockResolvedValue(null);
  await expect(PracticeLegalProfilePage()).rejects.toThrow("__NOT_FOUND__");
  expect(prisma.practiceLegalProfile.findUnique).not.toHaveBeenCalled();
});