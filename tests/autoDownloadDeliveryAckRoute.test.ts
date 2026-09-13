import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/auto-download-devices/deliveries/[id]/ack/route";

jest.mock("@/lib/autoDownloadDevices/auth", () => ({
  requireAutoDownloadDevice: jest.fn(),
}));
jest.mock("@/lib/autoDownloadDevices/delivery", () => ({
  acknowledgeAutoDownloadDelivery: jest.fn(),
}));

import { requireAutoDownloadDevice } from "@/lib/autoDownloadDevices/auth";
import { acknowledgeAutoDownloadDelivery } from "@/lib/autoDownloadDevices/delivery";

const authenticate = requireAutoDownloadDevice as jest.Mock;
const acknowledge = acknowledgeAutoDownloadDelivery as jest.Mock;
const device = { deviceId: "device-1", practiceId: "practice-1", deviceName: "Server" };

function request(token = "lease-token") {
  return new NextRequest(
    "http://localhost/api/auto-download-devices/deliveries/delivery-1/ack",
    {
      method: "POST",
      headers: {
        authorization: "Device device-1.secret",
        "X-Auto-Download-Lease-Token": token,
      },
    },
  );
}

beforeEach(() => {
  authenticate.mockReset().mockResolvedValue({ device, error: null });
  acknowledge.mockReset().mockResolvedValue({ ok: true, alreadyAcknowledged: false });
});

it("bestätigt ausschließlich mit authentifiziertem Gerät und Lease-Token", async () => {
  const response = await POST(request(), {
    params: Promise.resolve({ id: "delivery-1" }),
  });

  expect(response.status).toBe(200);
  expect(acknowledge).toHaveBeenCalledWith(
    "delivery-1",
    "lease-token",
    device,
  );
});

it("meldet ein identisches zweites ACK idempotent", async () => {
  acknowledge.mockResolvedValue({ ok: true, alreadyAcknowledged: true });

  const response = await POST(request(), {
    params: Promise.resolve({ id: "delivery-1" }),
  });

  expect(await response.json()).toEqual({ ok: true, alreadyAcknowledged: true });
});

it.each([
  ["not_found", 404],
  ["invalid_lease", 409],
  ["expired_lease", 409],
] as const)("weist %s zurück", async (reason, status) => {
  acknowledge.mockResolvedValue({ ok: false, reason });

  const response = await POST(request(), {
    params: Promise.resolve({ id: "delivery-1" }),
  });

  expect(response.status).toBe(status);
});

it("verlangt Geräteauthentifizierung", async () => {
  authenticate.mockResolvedValue({
    device: null,
    error: NextResponse.json({ ok: false }, { status: 401 }),
  });

  const response = await POST(request(), {
    params: Promise.resolve({ id: "delivery-1" }),
  });

  expect(response.status).toBe(401);
  expect(acknowledge).not.toHaveBeenCalled();
});
