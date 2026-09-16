export const KIOSK_CHECK_IN_BLOCK_IDS = ["KONTAKT", "CHECK_IN"] as const;

export type KioskHandoffStatus = "waiting" | "closed" | "questionnaire_ready";

export function hasExactKioskCheckInBlocks(value: unknown): boolean {
  return Array.isArray(value) &&
    value.length === KIOSK_CHECK_IN_BLOCK_IDS.length &&
    KIOSK_CHECK_IN_BLOCK_IDS.every((blockId, index) => value[index] === blockId);
}

export function isKioskCheckInSession(session: {
  source: string;
  session_kind: string;
  created_by_kiosk_device_id: string | null;
  selected_block_ids: unknown;
}): boolean {
  return session.source === "kiosk_direct" &&
    session.session_kind === "patient_communication" &&
    session.created_by_kiosk_device_id !== null &&
    hasExactKioskCheckInBlocks(session.selected_block_ids);
}