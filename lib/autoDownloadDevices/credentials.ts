import { createHash, randomBytes, timingSafeEqual } from "crypto";

const SECRET_BYTES = 32;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createAutoDownloadDeviceSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

export function hashAutoDownloadDeviceSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function isValidAutoDownloadDeviceSecret(secret: string): boolean {
  return SECRET_PATTERN.test(secret);
}

export function matchesAutoDownloadDeviceSecret(
  secret: string,
  expectedHash: string,
): boolean {
  if (!isValidAutoDownloadDeviceSecret(secret)) return false;
  const actual = Buffer.from(hashAutoDownloadDeviceSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
