/**
 * Tests für die Vorlagenfunktion in InquirySession.
 *
 * Geprüft wird:
 *  - createInquirySession mit asTemplate=true legt is_template=true und
 *    den Vorlagennamen ab.
 *  - Fehlender/leerer Vorlagenname → InquirySessionError("template_name_required").
 *  - instantiateFromTemplate kopiert die Vorauswahlen in eine neue, normale
 *    Arbeits-Session (is_template=false).
 *  - Practice-Guard: Vorlage einer anderen Practice → session_not_found.
 *  - Nicht-Vorlage über instantiateFromTemplate → session_not_found.
 *  - getInquirySessionWithOutput blendet Vorlagen standardmäßig aus.
 */

import { PracticeRole } from "@prisma/client";
import {
  createInquirySession,
  instantiateFromTemplate,
  saveSessionAsTemplate,
  getInquirySessionWithOutput,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";
import {
  canAccessInquirySession,
  canAccessInquiryTemplate,
  canManageInquiryTemplates,
} from "@/lib/inquiries/practiceScope";

type MockClient = {
  inquirySession: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

function makeClient(): MockClient {
  return {
    inquirySession: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

const testPractice = {
  id: "practice-1",
  slug: "practice-1",
  name: "Testpraxis",
  is_approved: true,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  office_cases_enabled: true,
  arbeitsprozesse_enabled: true,
};

describe("createInquirySession – Vorlagen", () => {
  it("legt is_template=true und template_name an, wenn asTemplate=true", async () => {
    const client = makeClient();
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "tpl-1",
      ...data,
    }));

    const result = await createInquirySession(
      {
        ownerAccountId: "acc-1",
        selectedInquiryIds: ["AU"],
        asTemplate: true,
        templateName: "  AU-Anfrage  ",
      },
      client as never,
    );

    expect(client.inquirySession.create).toHaveBeenCalledTimes(1);
    const data = client.inquirySession.create.mock.calls[0][0].data;
    expect(data.is_template).toBe(true);
    expect(data.template_name).toBe("AU-Anfrage");
    expect(result.is_template).toBe(true);
  });

  it("standard ohne asTemplate → is_template=false, template_name=null", async () => {
    const client = makeClient();
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "sess-1",
      ...data,
    }));

    await createInquirySession(
      { ownerAccountId: "acc-1", selectedInquiryIds: ["AU"] },
      client as never,
    );

    const data = client.inquirySession.create.mock.calls[0][0].data;
    expect(data.is_template).toBe(false);
    expect(data.template_name).toBeNull();
  });

  it("wirft template_name_required, wenn asTemplate=true ohne Namen", async () => {
    const client = makeClient();
    await expect(
      createInquirySession(
        {
          ownerAccountId: "acc-1",
          selectedInquiryIds: ["AU"],
          asTemplate: true,
          templateName: "   ",
        },
        client as never,
      ),
    ).rejects.toMatchObject({
      name: "InquirySessionError",
      code: "template_name_required",
    });
    expect(client.inquirySession.create).not.toHaveBeenCalled();
  });
});

describe("instantiateFromTemplate", () => {
  const template = {
    id: "tpl-1",
    owner_account_id: "acc-1",
    owner_practice_id: "practice-1",
    is_template: true,
    template_name: "Neupatient",
    status: "DRAFT",
    selected_inquiry_ids: ["AU"],
    section_snapshot: [{ inquiryId: "AU", decisionStatus: "DISABLED", checkpointStatuses: {} }],
    checkpoint_statuses: { foo: "bar" },
    action_statuses: {},
    explanation_output_statuses: { ex: "SHOW" },
    communication_reason_selection: { AU: "REASON_A" },
    response_goal_selection: null,
  };

  it("kopiert Vorauswahlen in neue Arbeits-Session (is_template=false)", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue(template);
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "sess-new",
      ...data,
    }));

    const result = await instantiateFromTemplate(
      "tpl-1",
      "acc-2",
      "practice-1",
      client as never,
    );

    expect(result.id).toBe("sess-new");
    const data = client.inquirySession.create.mock.calls[0][0].data;
    expect(data.is_template).toBe(false);
    expect(data.template_name).toBeNull();
    expect(data.status).toBe("DRAFT");
    expect(data.owner_account_id).toBe("acc-2");
    expect(data.owner_practice_id).toBe("practice-1");
    expect(data.selected_inquiry_ids).toEqual(["AU"]);
    expect(data.checkpoint_statuses).toEqual({ foo: "bar" });
    expect(data.communication_reason_selection).toEqual({ AU: "REASON_A" });
  });

  it("erlaubt ein Template mit passendem Account- und Praxis-Scope", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...template,
      owner_practice_id: "practice-1",
    });
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "sess-scoped",
      ...data,
    }));

    expect(
      canAccessInquirySession(
        { id: "acc-1", current_practice: testPractice },
        { owner_account_id: "acc-1", owner_practice_id: "practice-1" },
      ),
    ).toBe(true);
    expect(
      canAccessInquiryTemplate(
        { current_practice: testPractice },
        { owner_practice_id: "practice-1", is_template: true },
      ),
    ).toBe(true);
    await expect(
      instantiateFromTemplate("tpl-1", "acc-2", "practice-1", client as never),
    ).resolves.toMatchObject({ id: "sess-scoped" });
  });

  it("verweigert ein Template ohne Praxis-Zuordnung", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...template,
      owner_practice_id: null,
    });
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "sess-legacy",
      ...data,
    }));

    await expect(
      instantiateFromTemplate("tpl-1", "acc-1", "practice-1", client as never),
    ).rejects.toMatchObject({ code: "session_not_found" });
  });

  it("verweigert ein Template aus einer anderen Praxis weiterhin", async () => {
    expect(
      canAccessInquiryTemplate(
        { current_practice: testPractice },
        { owner_practice_id: "practice-2", is_template: true },
      ),
    ).toBe(false);
  });

  it("erlaubt die Praxisvorlage eines anderen Accounts", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...template,
      owner_account_id: "acc-other",
    });
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "sess-from-owner-template",
      ...data,
    }));

    await expect(
      instantiateFromTemplate("tpl-1", "acc-user", "practice-1", client as never),
    ).resolves.toMatchObject({
      owner_account_id: "acc-user",
      owner_practice_id: "practice-1",
    });
  });

  it("nicht existierende Vorlage → session_not_found", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue(null);

    await expect(
      instantiateFromTemplate("missing", "acc-1", "practice-1", client as never),
    ).rejects.toMatchObject({ code: "session_not_found" });
  });

  it("normale Session (is_template=false) → session_not_found", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...template,
      is_template: false,
      template_name: null,
    });

    await expect(
      instantiateFromTemplate("tpl-1", "acc-1", "practice-1", client as never),
    ).rejects.toBeInstanceOf(InquirySessionError);
  });
});

describe("saveSessionAsTemplate", () => {
  const session = {
    id: "sess-1",
    owner_account_id: "acc-1",
    owner_practice_id: "practice-1",
    is_template: false,
    template_name: null,
    status: "DRAFT",
    selected_inquiry_ids: ["AU"],
    section_snapshot: [{ inquiryId: "AU", decisionStatus: "DISABLED", checkpointStatuses: {} }],
    checkpoint_statuses: { foo: "YES" },
    action_statuses: { act1: "ACTIVE" },
    explanation_output_statuses: { ex: "SHOW" },
    communication_reason_selection: { AU: "REASON_A" },
    response_goal_selection: { AU: "GOAL_X" },
  };

  it("kopiert alle M1/M2/M3-Felder in eine neue is_template=true-Vorlage", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue(session);
    client.inquirySession.create.mockImplementation(({ data }) => ({
      id: "tpl-new",
      ...data,
    }));

    const result = await saveSessionAsTemplate(
      "sess-1",
      "acc-1",
      "practice-1",
      "  Neupatient  ",
      client as never,
    );

    expect(result.id).toBe("tpl-new");
    const data = client.inquirySession.create.mock.calls[0][0].data;
    expect(data.is_template).toBe(true);
    expect(data.template_name).toBe("Neupatient");
    expect(data.status).toBe("DRAFT");
    expect(data.owner_account_id).toBe("acc-1");
    expect(data.owner_practice_id).toBe("practice-1");
    expect(data.selected_inquiry_ids).toEqual(["AU"]);
    expect(data.section_snapshot).toEqual(session.section_snapshot);
    expect(data.checkpoint_statuses).toEqual({ foo: "YES" });
    expect(data.action_statuses).toEqual({ act1: "ACTIVE" });
    expect(data.explanation_output_statuses).toEqual({ ex: "SHOW" });
    expect(data.communication_reason_selection).toEqual({ AU: "REASON_A" });
    expect(data.response_goal_selection).toEqual({ AU: "GOAL_X" });
  });

  it("leerer/whitespace-only Vorlagenname → template_name_required", async () => {
    const client = makeClient();
    await expect(
      saveSessionAsTemplate("sess-1", "acc-1", "practice-1", "   ", client as never),
    ).rejects.toMatchObject({ code: "template_name_required" });
    expect(client.inquirySession.findUnique).not.toHaveBeenCalled();
    expect(client.inquirySession.create).not.toHaveBeenCalled();
  });

  it("fremde Session → session_not_found (kein 403)", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...session,
      owner_account_id: "acc-other",
    });

    await expect(
      saveSessionAsTemplate("sess-1", "acc-1", "practice-1", "Name", client as never),
    ).rejects.toMatchObject({ code: "session_not_found" });
    expect(client.inquirySession.create).not.toHaveBeenCalled();
  });

  it("nicht existierende Session → session_not_found", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue(null);
    await expect(
      saveSessionAsTemplate("missing", "acc-1", "practice-1", "Name", client as never),
    ).rejects.toMatchObject({ code: "session_not_found" });
  });

  it("Quelle ist selbst bereits eine Vorlage → session_not_found", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...session,
      is_template: true,
      template_name: "Existing",
    });
    await expect(
      saveSessionAsTemplate("sess-1", "acc-1", "practice-1", "Name", client as never),
    ).rejects.toMatchObject({ code: "session_not_found" });
    expect(client.inquirySession.create).not.toHaveBeenCalled();
  });
});

describe("Praxisvorlagen-Rollen", () => {
  const accountForRole = (role: PracticeRole) => ({
    current_practice: testPractice,
    memberships: [{ practice_id: "practice-1", role }],
  });

  it.each([
    [PracticeRole.OWNER, true],
    [PracticeRole.ADMIN, false],
    [PracticeRole.USER, false],
    [PracticeRole.INBOX_ONLY, false],
  ])("Management für %s = %s", (role, expected) => {
    expect(canManageInquiryTemplates(accountForRole(role) as never)).toBe(expected);
  });

  it("verweigert Template-Zugriff ohne aktuelle Practice", () => {
    expect(
      canAccessInquiryTemplate(
        { current_practice: null },
        { owner_practice_id: "practice-1", is_template: true },
      ),
    ).toBe(false);
  });
});

describe("getInquirySessionWithOutput – Template-Filter", () => {
  it("blendet Vorlagen standardmäßig aus (gibt null zurück)", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      id: "tpl-1",
      owner_account_id: "acc-1",
      is_template: true,
    });

    const result = await getInquirySessionWithOutput(
      "tpl-1",
      "acc-1",
      client as never,
    );
    expect(result).toBeNull();
  });

  it("liefert Vorlage zurück, wenn includeTemplates=true", async () => {
    const client = makeClient();
    const tpl = { id: "tpl-1", owner_account_id: "acc-1", is_template: true };
    client.inquirySession.findUnique.mockResolvedValue(tpl);

    const result = await getInquirySessionWithOutput(
      "tpl-1",
      "acc-1",
      client as never,
      { includeTemplates: true },
    );
    expect(result).toEqual(tpl);
  });
});
