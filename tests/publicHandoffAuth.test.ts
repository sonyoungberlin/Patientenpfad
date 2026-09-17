import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: { publicQuestionnaireHandoff: { findUnique: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  hashPublicHandoffSecret,
  publicHandoffCookieName,
  resolvePublicHandoff,
} from "@/lib/questionnaire/publicHandoffAuth";

const findHandoff = prisma.publicQuestionnaireHandoff.findUnique as jest.Mock;
const secret = "a".repeat(43);
const parent = {
  source: "public_check_in", session_kind: "patient_communication", context: "patient",
  owner_account_id: null,
  owner_practice_id: "practice-1", created_by_kiosk_device_id: null,
  selected_block_ids: ["KONTAKT", "CHECK_IN"],
  frozen_blocks: [{ id: "KONTAKT", questions: [] }, { id: "CHECK_IN", questions: [] }],
  status: "completed", deleted_at: null,
  patient_reference: "4711",
};
function request(parentId: string, value?: string) {
  const headers = new Headers();
  if (value) headers.set("cookie", `${publicHandoffCookieName(parentId)}=${value}`);
  return new NextRequest(`http://localhost/public-check-in/${parentId}/status`, { headers });
}

describe("resolvePublicHandoff", () => {
  beforeEach(() => {
    findHandoff.mockReset().mockResolvedValue({
      parent_session_id: "parent-1", secret_hash: hashPublicHandoffSecret(secret),
      expires_at: new Date(Date.now() + 60_000), status: "waiting",
      follow_up_session_id: null, parent_session: parent,
    });
  });

  it("autorisiert ausschließlich das passende session-spezifische Cookie", async () => {
    await expect(resolvePublicHandoff(request("parent-1", secret), "parent-1")).resolves.toEqual(expect.objectContaining({ status: "waiting" }));
    await expect(resolvePublicHandoff(request("parent-1", "wrong"), "parent-1")).resolves.toBeNull();
    await expect(resolvePublicHandoff(request("parent-2", secret), "parent-1")).resolves.toBeNull();
    await expect(resolvePublicHandoff(request("parent-1"), "parent-1")).resolves.toBeNull();
  });

  it.each([
    ["abgelaufen", { expires_at: new Date(0) }],
    ["gelöscht", { parent_session: { ...parent, deleted_at: new Date() } }],
    ["falsche Source", { parent_session: { ...parent, source: "kiosk_direct" } }],
    ["falsche Practice-Struktur", { parent_session: { ...parent, owner_practice_id: null } }],
    ["Kioskgerät gesetzt", { parent_session: { ...parent, created_by_kiosk_device_id: "device-1" } }],
    ["ungültiger Status", { status: "tampered" }],
  ])("verweigert %s", async (_label, override) => {
    const current = await findHandoff();
    findHandoff.mockResolvedValue({ ...current, ...override });
    await expect(resolvePublicHandoff(request("parent-1", secret), "parent-1")).resolves.toBeNull();
  });
});