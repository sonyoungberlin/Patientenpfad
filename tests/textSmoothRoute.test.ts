import { NextRequest } from "next/server";
import { POST } from "@/app/api/text/smooth/route";

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/server/textSmoothing", () => ({
  TextSmoothingError: class TextSmoothingError extends Error {
    code: "missing_api_key" | "provider_error" | "invalid_response";
    constructor(
      code: "missing_api_key" | "provider_error" | "invalid_response",
      message: string,
    ) {
      super(message);
      this.code = code;
    }
  },
  smoothTextWithOpenAI: jest.fn(),
}));

import { getSessionAccount } from "@/lib/auth";
import {
  TextSmoothingError,
  smoothTextWithOpenAI,
} from "@/lib/server/textSmoothing";

const getSessionAccountMock = getSessionAccount as jest.Mock;
const smoothTextWithOpenAIMock = smoothTextWithOpenAI as jest.Mock;

const APPROVED_ACCOUNT = {
  id: "acc-test",
  email: "arzt@example.com",
  is_approved: true,
  is_admin: false,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/text/smooth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/text/smooth", () => {
  beforeEach(() => {
    getSessionAccountMock.mockReset();
    smoothTextWithOpenAIMock.mockReset();
  });

  it("gibt 401 zurück, wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ text: "Hallo" }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.ok).toBe(false);
  });

  it("gibt 403 zurück, wenn Account nicht freigeschaltet", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED_ACCOUNT,
      is_approved: false,
    });

    const response = await POST(makeRequest({ text: "Hallo" }));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.ok).toBe(false);
  });

  it("gibt 400 zurück bei leerem Text", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const response = await POST(makeRequest({ text: "   " }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("gibt 400 zurück bei zu langem Text", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    const tooLong = "a".repeat(8001);

    const response = await POST(makeRequest({ text: tooLong }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("gibt 400 zurück bei ungültigem Kontext", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);

    const response = await POST(
      makeRequest({ text: "Bitte melden Sie sich.", context: "foo" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("gibt geglätteten Text zurück", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    smoothTextWithOpenAIMock.mockResolvedValue(
      "Liebe Patientin, lieber Patient, bitte melden Sie sich morgen.",
    );

    const response = await POST(
      makeRequest({
        text: "Liebe Patientin, lieber Patient, melden Sie sich morgen.",
        context: "inquiry_patient_message",
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      smoothedText:
        "Liebe Patientin, lieber Patient, bitte melden Sie sich morgen.",
    });
    expect(smoothTextWithOpenAIMock).toHaveBeenCalledWith({
      text: "Liebe Patientin, lieber Patient, melden Sie sich morgen.",
      context: "inquiry_patient_message",
    });
  });

  it("gibt 500 zurück bei fehlender OPENAI_API_KEY-Konfiguration", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    smoothTextWithOpenAIMock.mockRejectedValue(
      new TextSmoothingError("missing_api_key", "OPENAI_API_KEY fehlt."),
    );

    const response = await POST(makeRequest({ text: "Bitte kommen Sie morgen." }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.ok).toBe(false);
  });

  it("gibt 500 zurück bei Providerfehler", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    smoothTextWithOpenAIMock.mockRejectedValue(
      new TextSmoothingError("provider_error", "Providerfehler"),
    );

    const response = await POST(makeRequest({ text: "Bitte kommen Sie morgen." }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.ok).toBe(false);
  });

  it("gibt error-code im Fehlerfall zur\u00fcck (diagnostisch)", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    smoothTextWithOpenAIMock.mockRejectedValue(
      new TextSmoothingError("provider_error", "Providerfehler"),
    );

    const response = await POST(makeRequest({ text: "Bitte kommen Sie morgen." }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.code).toBe("provider_error");
  });

  it("nutzt code missing_api_key f\u00fcr fehlende Konfiguration", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    smoothTextWithOpenAIMock.mockRejectedValue(
      new TextSmoothingError("missing_api_key", "OPENAI_API_KEY fehlt."),
    );

    const response = await POST(makeRequest({ text: "Bitte kommen Sie morgen." }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.code).toBe("missing_api_key");
  });

  it("setzt code unknown_error bei allgemeinen Fehlern", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    smoothTextWithOpenAIMock.mockRejectedValue(new Error("Allgemeiner Fehler"));

    const response = await POST(makeRequest({ text: "Bitte kommen Siemorgen." }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.code).toBe("unknown_error");
  });
});
