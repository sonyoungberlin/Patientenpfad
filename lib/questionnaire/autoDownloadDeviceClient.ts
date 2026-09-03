export const QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY =
  "questionnaire_auto_download_device_id";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getOrCreateQuestionnaireAutoDeviceId(): string {
  const existing = window.localStorage.getItem(
    QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY,
  );
  if (existing && UUID_V4_RE.test(existing)) return existing;

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(
    QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY,
    deviceId,
  );
  return deviceId;
}