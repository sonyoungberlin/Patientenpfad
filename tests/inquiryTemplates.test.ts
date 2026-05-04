/**
 * Tests für die Vorlagenfunktion in InquirySession.
 *
 * Geprüft wird:
 *  - createInquirySession mit asTemplate=true legt is_template=true und
 *    den Vorlagennamen ab.
 *  - Fehlender/leerer Vorlagenname → InquirySessionError("template_name_required").
 *  - instantiateFromTemplate kopiert die Vorauswahlen in eine neue, normale
 *    Arbeits-Session (is_template=false).
 *  - Owner-Guard: Vorlage eines anderen Accounts → session_not_found.
 *  - Nicht-Vorlage über instantiateFromTemplate → session_not_found.
 *  - getInquirySessionWithOutput blendet Vorlagen standardmäßig aus.
 */

import {
  createInquirySession,
  instantiateFromTemplate,
  getInquirySessionWithOutput,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";

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

    const result = await instantiateFromTemplate("tpl-1", "acc-1", client as never);

    expect(result.id).toBe("sess-new");
    const data = client.inquirySession.create.mock.calls[0][0].data;
    expect(data.is_template).toBe(false);
    expect(data.template_name).toBeNull();
    expect(data.status).toBe("DRAFT");
    expect(data.owner_account_id).toBe("acc-1");
    expect(data.selected_inquiry_ids).toEqual(["AU"]);
    expect(data.checkpoint_statuses).toEqual({ foo: "bar" });
    expect(data.communication_reason_selection).toEqual({ AU: "REASON_A" });
  });

  it("fremde Vorlage → session_not_found", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue({
      ...template,
      owner_account_id: "acc-other",
    });

    await expect(
      instantiateFromTemplate("tpl-1", "acc-1", client as never),
    ).rejects.toMatchObject({ code: "session_not_found" });
    expect(client.inquirySession.create).not.toHaveBeenCalled();
  });

  it("nicht existierende Vorlage → session_not_found", async () => {
    const client = makeClient();
    client.inquirySession.findUnique.mockResolvedValue(null);

    await expect(
      instantiateFromTemplate("missing", "acc-1", client as never),
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
      instantiateFromTemplate("tpl-1", "acc-1", client as never),
    ).rejects.toBeInstanceOf(InquirySessionError);
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
