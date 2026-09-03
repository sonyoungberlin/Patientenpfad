import { createHash } from "node:crypto";

export const QUESTIONNAIRE_AUTO_DEVICE_HEADER =
  "x-questionnaire-auto-device";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidQuestionnaireAutoDeviceId(
  value: unknown,
): value is string {
  return typeof value === "string" && UUID_V4_RE.test(value);
}

export function hashQuestionnaireAutoDeviceId(deviceId: string): string {
  return createHash("sha256").update(deviceId, "utf8").digest("hex");
}