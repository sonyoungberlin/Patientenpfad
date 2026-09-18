import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authz", () => ({
  requireDigitalRequestWorkAccess: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireDigitalRequestWorkAccess } from "@/lib/authz";
import { PATCH } from "@/app/api/digital-requests/[id]/new-patient-exception/route";

const pm = prisma as unknown as {
  digitalRequest: { findFirst: jest.Mock; update: jest.Mock };
};
const requireAccessMock = requireDigitalRequestWorkAccess as jest.Mock;

const ACCOUNT = {
  id: "account-1",
  current_practice: { id: "p-1" },
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/digital-requests/dr-1/new-patient-exception", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CTX = { params: Promise.resolve({ id: "dr-1" }) };

beforeEach(() => {
  pm.digitalRequest.findFirst.mockReset();
  pm.digitalRequest.update.mockReset();
  requireAccessMock.mockReset();
  requireAccessMock.mockResolvedValue({ account: ACCOUNT, error: null });
  pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1" });
  pm.digitalRequest.update.mockResolvedValue({});
});

describe("PATCH /api/digital-requests/[id]/new-patient-exception", () => {
  it("verlangt Authentifizierung", async () => {
    requireAccessMock.mockResolvedValue({
      account: null,
      error: new Response(null, { status: 401 }),
    });

    const response = await PATCH(makeRequest({ confirmed: true }), CTX);

    expect(response.status).toBe(401);
    expect(pm.digitalRequest.findFirst).not.toHaveBeenCalled();
  });

  it("setzt den Ausnahmezeitpunkt für die eigene Anfrage", async () => {
    const response = await PATCH(makeRequest({ confirmed: true }), CTX);

    expect(response.status).toBe(200);
    expect(pm.digitalRequest.update).toHaveBeenCalledWith({
      where: { id: "dr-1" },
      data: {
        new_patient_exception_confirmed_at: expect.any(Date),
      },
    });
  });

  it("nimmt die Ausnahme ausdrücklich zurück", async () => {
    const response = await PATCH(makeRequest({ confirmed: false }), CTX);

    expect(response.status).toBe(200);
    expect(pm.digitalRequest.update).toHaveBeenCalledWith({
      where: { id: "dr-1" },
      data: { new_patient_exception_confirmed_at: null },
    });
  });

  it("verweigert Anfragen einer fremden Praxis", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ confirmed: true }), CTX);

    expect(response.status).toBe(404);
    expect(pm.digitalRequest.update).not.toHaveBeenCalled();
  });

  it("akzeptiert keine implizite oder ungültige Aktion", async () => {
    const response = await PATCH(makeRequest({}), CTX);

    expect(response.status).toBe(400);
    expect(pm.digitalRequest.findFirst).not.toHaveBeenCalled();
  });
});