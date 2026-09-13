import { prisma } from "@/lib/prisma";
import {
  createAutoDownloadDeviceSecret,
  hashAutoDownloadDeviceSecret,
  isValidAutoDownloadDeviceSecret,
} from "./credentials";

export const AUTO_DOWNLOAD_ENROLLMENT_DURATION_MS = 15 * 60 * 1000;

export type AutoDownloadDeviceEnrollment = {
  deviceId: string;
  deviceName: string;
  credential: string;
};

export function createAutoDownloadEnrollmentCode(): string {
  return createAutoDownloadDeviceSecret();
}

export function hashAutoDownloadEnrollmentCode(code: string): string {
  return hashAutoDownloadDeviceSecret(code);
}

export async function enrollAutoDownloadDevice(
  code: string,
  now = new Date(),
): Promise<AutoDownloadDeviceEnrollment | null> {
  if (!isValidAutoDownloadDeviceSecret(code)) return null;

  const enrollmentTokenHash = hashAutoDownloadEnrollmentCode(code);
  const pendingDevice = await prisma.practiceAutoDownloadDevice.findUnique({
    where: { enrollment_token_hash: enrollmentTokenHash },
    select: { id: true, name: true },
  });
  if (!pendingDevice) return null;

  const secret = createAutoDownloadDeviceSecret();
  const credentialHash = hashAutoDownloadDeviceSecret(secret);
  const claim = await prisma.practiceAutoDownloadDevice.updateMany({
    where: {
      id: pendingDevice.id,
      enrollment_token_hash: enrollmentTokenHash,
      enrollment_expires_at: { gt: now },
      enrollment_used_at: null,
      credential_hash: null,
      is_active: true,
      revoked_at: null,
      practice: { is: { is_approved: true, disabled_at: null } },
    },
    data: {
      credential_hash: credentialHash,
      enrollment_token_hash: null,
      enrollment_expires_at: null,
      enrollment_used_at: now,
    },
  });
  if (claim.count !== 1) return null;

  return {
    deviceId: pendingDevice.id,
    deviceName: pendingDevice.name,
    credential: `${pendingDevice.id}.${secret}`,
  };
}
