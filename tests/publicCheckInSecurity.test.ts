import {
  hasExactPublicCheckInBlocks,
  hasExactPublicCheckInFrozenBlocks,
  isPublicCheckInSession,
} from "@/lib/questionnaire/publicCheckIn";
import {
  createPublicHandoffSecret,
  hashPublicHandoffSecret,
  publicHandoffCookieName,
  publicHandoffCookieOptions,
} from "@/lib/questionnaire/publicHandoffAuth";

describe("public check-in security helpers", () => {
  const frozen = [
    { id: "KONTAKT", questions: [] },
    { id: "CHECK_IN", questions: [] },
  ];

  it("erkennt nur das exakte Preset und die Frozen-Struktur", () => {
    expect(hasExactPublicCheckInBlocks(["KONTAKT", "CHECK_IN"])).toBe(true);
    expect(hasExactPublicCheckInBlocks(["CHECK_IN", "KONTAKT"])).toBe(false);
    expect(hasExactPublicCheckInFrozenBlocks(frozen)).toBe(true);
    expect(hasExactPublicCheckInFrozenBlocks([{ id: "CHECK_IN", questions: [] }])).toBe(false);
  });

  it("prüft Source, Kontext, Practice und fehlendes Kioskgerät gemeinsam", () => {
    const session = {
      source: "public_check_in", session_kind: "patient_communication", context: "patient",
      owner_account_id: null,
      owner_practice_id: "practice-1", created_by_kiosk_device_id: null,
      selected_block_ids: ["KONTAKT", "CHECK_IN"], frozen_blocks: frozen,
    };
    expect(isPublicCheckInSession(session)).toBe(true);
    expect(isPublicCheckInSession({ ...session, created_by_kiosk_device_id: "device-1" })).toBe(false);
    expect(isPublicCheckInSession({ ...session, source: "kiosk_direct" })).toBe(false);
    expect(isPublicCheckInSession({ ...session, owner_account_id: "account-1" })).toBe(false);
  });

  it("erzeugt 256 Bit Entropie und persistierbare SHA-256-Hashes", () => {
    const first = createPublicHandoffSecret();
    const second = createPublicHandoffSecret();
    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(first).not.toBe(second);
    expect(hashPublicHandoffSecret(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPublicHandoffSecret(first)).not.toContain(first);
  });

  it("verwendet ein session-spezifisches enges HttpOnly-Cookie", () => {
    const expires = new Date("2026-09-17T20:00:00Z");
    expect(publicHandoffCookieName("parent-a")).not.toBe(publicHandoffCookieName("parent-b"));
    expect(publicHandoffCookieOptions("parent-a", expires)).toEqual(expect.objectContaining({
      httpOnly: true, sameSite: "strict", path: "/public-check-in/parent-a", expires,
    }));
  });
});