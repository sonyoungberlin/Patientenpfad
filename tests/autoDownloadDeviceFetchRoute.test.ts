import { createHash } from "crypto";
import { QuestionnaireAutoExportMode } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/auto-download-devices/next/route";

jest.mock("@/lib/prisma", () => ({
  prisma: { practice: { findUnique: jest.fn() } },
}));

jest.mock("@/lib/autoDownloadDevices/auth", () => ({
  requireAutoDownloadDevice: jest.fn(),
}));
jest.mock("@/lib/autoDownloadDevices/delivery", () => ({
  AUTO_DOWNLOAD_CONTENT_SHA256_HEADER: "X-Content-SHA256",
  AUTO_DOWNLOAD_DELIVERY_ID_HEADER: "X-Auto-Download-Delivery-Id",
  AUTO_DOWNLOAD_LEASE_TOKEN_HEADER: "X-Auto-Download-Lease-Token",
  acquireAutoDownloadArtifactLease: jest.fn(),
}));
jest.mock("@/lib/questionnaire/autoDownloadArtifactSelector", () => {
  class AutoDownloadArtifactBuildError extends Error {
    constructor(public readonly responseMessage: string) { super(responseMessage); }
  }
  return {
    AutoDownloadArtifactBuildError,
    selectNextAutoDownloadArtifactForDelivery: jest.fn(),
  };
});

import { requireAutoDownloadDevice } from "@/lib/autoDownloadDevices/auth";
import { acquireAutoDownloadArtifactLease } from "@/lib/autoDownloadDevices/delivery";
import { selectNextAutoDownloadArtifactForDelivery } from "@/lib/questionnaire/autoDownloadArtifactSelector";
import { prisma } from "@/lib/prisma";

const authenticate = requireAutoDownloadDevice as jest.Mock;
const practice = prisma.practice as unknown as { findUnique: jest.Mock };
const acquireLease = acquireAutoDownloadArtifactLease as jest.Mock;
const selectArtifact = selectNextAutoDownloadArtifactForDelivery as jest.Mock;
const device = { deviceId: "device-1", practiceId: "practice-1", deviceName: "Server" };
const bytes = new Uint8Array([37, 80, 68, 70]);
const candidate = {
  sessionId: "session-1",
  artifactType: "PDF" as const,
  artifact: { bytes, filename: "fragebogen.pdf", mimeType: "application/pdf" },
};

function request(practiceId?: string) {
  const headers = new Headers({ authorization: "Device device-1.secret" });
  if (practiceId) headers.set("x-practice-id", practiceId);
  return new NextRequest("http://localhost/api/auto-download-devices/next", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  authenticate.mockReset().mockResolvedValue({ device, error: null });
  practice.findUnique.mockReset().mockResolvedValue({
    questionnaire_auto_export_mode: QuestionnaireAutoExportMode.WINDOWS,
    questionnaire_auto_pdf_device_hash: null,
    questionnaire_auto_pdf_enabled_at: null,
  });
  acquireLease.mockReset().mockResolvedValue({
    ...candidate,
    deliveryId: "delivery-1",
    leaseToken: "lease-token",
    contentSha256: createHash("sha256").update(bytes).digest("hex"),
    leaseExpiresAt: new Date(),
  });
  selectArtifact.mockReset().mockImplementation(async ({ accept }) => {
    return await accept(candidate) ? candidate : null;
  });
});

it("blockiert den Windows-Pfad im BROWSER-Modus vor Auswahl und Lease", async () => {
  practice.findUnique.mockResolvedValue({
    questionnaire_auto_export_mode: QuestionnaireAutoExportMode.BROWSER,
    questionnaire_auto_pdf_device_hash: null,
    questionnaire_auto_pdf_enabled_at: null,
  });

  const response = await POST(request());

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({
    ok: false,
    error: "export_mode_mismatch",
  });
  expect(selectArtifact).not.toHaveBeenCalled();
  expect(acquireLease).not.toHaveBeenCalled();
});

it("liefert Datei, MIME, Dateiname, Delivery, Lease-Token und SHA-256", async () => {
  const response = await POST(request());

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toContain("fragebogen.pdf");
  expect(response.headers.get("x-auto-download-delivery-id")).toBe("delivery-1");
  expect(response.headers.get("x-auto-download-lease-token")).toBe("lease-token");
  expect(response.headers.get("x-content-sha256")).toBe(
    createHash("sha256").update(bytes).digest("hex"),
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("leitet die Praxis ausschließlich aus dem authentifizierten Gerät ab", async () => {
  await POST(request("foreign-practice"));

  expect(selectArtifact).toHaveBeenCalledWith(expect.objectContaining({
    practiceId: "practice-1",
  }));
});

it.each(["falsches Credential", "inaktives Gerät", "widerrufenes Gerät"])(
  "verweigert Zugriff für %s",
  async () => {
    authenticate.mockResolvedValue({
      device: null,
      error: NextResponse.json({ ok: false }, { status: 401 }),
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(selectArtifact).not.toHaveBeenCalled();
  },
);

it("liefert 204, wenn kein Artefakt offen ist", async () => {
  selectArtifact.mockResolvedValue(null);

  const response = await POST(request());

  expect(response.status).toBe(204);
  expect(acquireLease).not.toHaveBeenCalled();
});
