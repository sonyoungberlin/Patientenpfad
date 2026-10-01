jest.mock("@/lib/prisma", () => ({
  prisma: { patientQuestionnaireSession: { create: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { PUBLIC_CHECK_IN_BLOCK_IDS } from "@/lib/questionnaire/publicCheckIn";

const create = prisma.patientQuestionnaireSession.create as jest.Mock;

describe("createQuestionnaireSession public check-in", () => {
  beforeEach(() => create.mockReset().mockResolvedValue({ id: "parent-1" }));

  it("verwendet Identität vor den bisherigen Check-in-Blöcken im selben Fragebogen", () => {
    expect(PUBLIC_CHECK_IN_BLOCK_IDS).toEqual(["IDENTITAET", "KONTAKT", "CHECK_IN"]);
    expect(buildFrozenBlocks([...PUBLIC_CHECK_IN_BLOCK_IDS]).map((block) => block.id))
      .toEqual(["IDENTITAET", "KONTAKT", "CHECK_IN"]);
  });

  it("erlaubt null nur für den exakten ownerlosen Public-Check-in", async () => {
    await createQuestionnaireSession({
      selectedBlockIds: [...PUBLIC_CHECK_IN_BLOCK_IDS], patientReference: null,
      allowUnassignedPublicCheckIn: true, patientLanguage: "de",
      ownerPracticeId: "practice-1", source: "public_check_in", origin: "http://localhost",
    });
    expect(create.mock.calls[0][0].data).toEqual(expect.objectContaining({
      owner_account_id: null, owner_practice_id: "practice-1",
      patient_reference: null, source: "public_check_in",
      selected_block_ids: ["IDENTITAET", "KONTAKT", "CHECK_IN"],
    }));
    expect(create.mock.calls[0][0].data.created_by_kiosk_device_id).toBeUndefined();
  });

  it.each([
    [["CHECK_IN"], true],
    [["KONTAKT", "CHECK_IN"], false],
    [["IDENTITAET", "KONTAKT", "CHECK_IN"], false],
  ])("verweigert null bei Preset %j und Freigabe %s", async (selectedBlockIds, allowed) => {
    await expect(createQuestionnaireSession({
      selectedBlockIds, patientReference: null, allowUnassignedPublicCheckIn: allowed,
      patientLanguage: "de", ownerPracticeId: "practice-1",
      source: "public_check_in", origin: "http://localhost",
    })).rejects.toThrow("Patientenreferenz ist erforderlich");
    expect(create).not.toHaveBeenCalled();
  });

  it("verweigert Public-Source mit Account bereits im Service", async () => {
    await expect(createQuestionnaireSession({
      selectedBlockIds: ["KONTAKT"], patientReference: "4711", patientLanguage: "de",
      ownerAccountId: "account-1", ownerPracticeId: "practice-1",
      source: "public_check_in", origin: "http://localhost",
    })).rejects.toThrow("ohne Account oder Kioskgerät");
    expect(create).not.toHaveBeenCalled();
  });
});