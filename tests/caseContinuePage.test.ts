import CaseContinuePage from "@/app/cases/[id]/page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
    },
  },
}));

import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RedirectMock = jest.MockedFunction<typeof redirect>;
type GetSessionMock = jest.MockedFunction<typeof getSessionAccountFromCookies>;
type PrismaMock = { caseSession: { findUnique: jest.Mock } };

const redirectMock = redirect as RedirectMock;
const getSessionMock = getSessionAccountFromCookies as GetSessionMock;
const prismaMock = prisma as unknown as PrismaMock;

describe("/cases/[id] Weiterleitung", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock.mockResolvedValue({
      id: "acc-test",
      email: "test@example.com",
      is_approved: true,
      is_admin: false,
      inquiry_assistant_enabled: false,
    });
  });

  it("leitet zu / um wenn kein Login vorhanden ist", async () => {
    getSessionMock.mockResolvedValue(null);

    await CaseContinuePage({ params: Promise.resolve({ id: "case-1" }) });

    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("leitet zu / um wenn der Fall nicht dem Account gehört", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-other",
      ctx_prefill: null,
      stage_status: "INTAKE",
      active_checkpoints: [],
      doctor_confirmed: false,
    });

    await CaseContinuePage({ params: Promise.resolve({ id: "case-1" }) });

    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("leitet zu M2 um wenn keine Prefill-Daten vorhanden sind", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      ctx_prefill: {},
      stage_status: "INTAKE",
      active_checkpoints: [],
      doctor_confirmed: false,
    });

    await CaseContinuePage({ params: Promise.resolve({ id: "case-1" }) });

    expect(redirectMock).toHaveBeenCalledWith("/cases/case-1/m2");
  });

  it("leitet zu M3 um wenn Prefill-Daten vorhanden sind", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      ctx_prefill: { K01: { "M2-01": "ja" } },
      stage_status: "PREFILL",
      active_checkpoints: [],
      doctor_confirmed: false,
    });

    await CaseContinuePage({ params: Promise.resolve({ id: "case-1" }) });

    expect(redirectMock).toHaveBeenCalledWith("/cases/case-1/m3");
  });

  it("leitet bestätigte Fälle direkt zu M3 – auch ohne Prefill-Daten", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      ctx_prefill: {},
      stage_status: "CLOSED",
      active_checkpoints: [],
      doctor_confirmed: true,
    });

    await CaseContinuePage({ params: Promise.resolve({ id: "case-1" }) });

    expect(redirectMock).toHaveBeenCalledWith("/cases/case-1/m3");
    expect(redirectMock).not.toHaveBeenCalledWith("/cases/case-1/m2");
  });
});
