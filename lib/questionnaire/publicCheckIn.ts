export const PUBLIC_CHECK_IN_BLOCK_IDS = ["KONTAKT", "CHECK_IN"] as const;

export type PublicHandoffStatus = "waiting" | "closed" | "questionnaire_ready";

export function hasExactPublicCheckInBlocks(value: unknown): boolean {
  return Array.isArray(value) &&
    value.length === PUBLIC_CHECK_IN_BLOCK_IDS.length &&
    PUBLIC_CHECK_IN_BLOCK_IDS.every((blockId, index) => value[index] === blockId);
}

export function hasExactPublicCheckInFrozenBlocks(value: unknown): boolean {
  return Array.isArray(value) &&
    value.length === PUBLIC_CHECK_IN_BLOCK_IDS.length &&
    PUBLIC_CHECK_IN_BLOCK_IDS.every((blockId, index) => {
      const block = value[index];
      return block !== null && typeof block === "object" &&
        "id" in block && block.id === blockId &&
        "questions" in block && Array.isArray(block.questions);
    });
}

export function isPublicCheckInSession(session: {
  source: string;
  session_kind: string;
  context: string;
  owner_account_id: string | null;
  owner_practice_id: string | null;
  created_by_kiosk_device_id: string | null;
  selected_block_ids: unknown;
  frozen_blocks: unknown;
}): boolean {
  return session.source === "public_check_in" &&
    session.session_kind === "patient_communication" &&
    session.context === "patient" &&
    session.owner_account_id === null &&
    session.owner_practice_id !== null &&
    session.created_by_kiosk_device_id === null &&
    hasExactPublicCheckInBlocks(session.selected_block_ids) &&
    hasExactPublicCheckInFrozenBlocks(session.frozen_blocks);
}