import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchesAutoDownloadDeviceSecret } from "./credentials";

export type AutoDownloadDeviceIdentity = {
  deviceId: string;
  practiceId: string;
  deviceName: string;
};

const AUTHORIZATION_PATTERN = /^Device ([^.\s]+)\.([^\s]+)$/;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Auto-Download-Gerät nicht autorisiert." },
    { status: 401 },
  );
}

export async function authenticateAutoDownloadDevice(
  req: NextRequest,
): Promise<AutoDownloadDeviceIdentity | null> {
  const authorization = req.headers.get("authorization");
  const match = authorization?.match(AUTHORIZATION_PATTERN);
  if (!match) return null;

  const [, deviceId, secret] = match;
  const device = await prisma.practiceAutoDownloadDevice.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      practice_id: true,
      name: true,
      credential_hash: true,
      is_active: true,
      revoked_at: true,
      practice: { select: { is_approved: true, disabled_at: true } },
    },
  });
  if (
    !device?.credential_hash ||
    !device.is_active ||
    device.revoked_at ||
    !device.practice.is_approved ||
    device.practice.disabled_at ||
    !matchesAutoDownloadDeviceSecret(secret, device.credential_hash)
  ) {
    return null;
  }

  const seen = await prisma.practiceAutoDownloadDevice.updateMany({
    where: {
      id: device.id,
      credential_hash: device.credential_hash,
      is_active: true,
      revoked_at: null,
      practice: { is: { is_approved: true, disabled_at: null } },
    },
    data: { last_seen_at: new Date() },
  });
  if (seen.count !== 1) return null;

  return {
    deviceId: device.id,
    practiceId: device.practice_id,
    deviceName: device.name,
  };
}

export async function requireAutoDownloadDevice(req: NextRequest) {
  const device = await authenticateAutoDownloadDevice(req);
  return device
    ? { device, error: null }
    : { device: null, error: unauthorized() };
}
