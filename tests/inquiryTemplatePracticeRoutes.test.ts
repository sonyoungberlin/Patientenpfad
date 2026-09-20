import { NextRequest } from "next/server";
import { POST as createHandler } from "@/app/api/inquiries/create/route";
import { POST as instantiateHandler } from "@/app/api/inquiries/templates/[id]/instantiate/route";
import { POST as saveAsTemplateHandler } from "@/app/api/inquiries/[id]/save-as-template/route";
import { SESSION_COOKIE } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findUnique: jest.fn() },
    inquirySession: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type Role = "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY";

type PrismaMock = {
  session: { findUnique: jest.Mock };
  inquirySession: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

const pm = prisma as unknown as PrismaMock;

function mockSession(role: Role, practiceId = "p-1") {
  const accountId = `acc-${role.toLowerCase()}`;
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: {
      id: accountId,
      email: `${role.toLowerCase()}@example.com`,
      is_approved: true,
      patient_communication_enabled: true,
      website_forms_enabled: false,
      office_cases_enabled: false,
      arbeitsprozesse_enabled: false,
      inquiry_assistant_enabled: true,
      is_admin: false,
      memberships: [
        {
          practice_id: practiceId,
          role,
          created_at: new Date("2025-01-01"),
          practice: {
            id: practiceId,
            slug: practiceId,
            name: `Praxis ${practiceId}`,
            is_approved: true,
            inquiry_assistant_enabled: true,
            patient_communication_enabled: true,
            website_forms_enabled: false,
            office_cases_enabled: false,
            arbeitsprozesse_enabled: false,
          },
        },
      ],
    },
  });
  return accountId;
}

function request(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      Cookie: `${SESSION_COOKIE}=good-token`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const template = {
  id: "tpl-1",
  owner_account_id: "acc-owner",
  owner_practice_id: "p-1",
  is_template: true,
  template_name: "Praxisvorlage",
  status: "DRAFT",
  selected_inquiry_ids: ["AU"],
  section_snapshot: [],
  checkpoint_statuses: {},
  action_statuses: {},
  explanation_output_statuses: {},
  communication_reason_selection: {},
  response_goal_selection: {},
};

const sourceSession = {
  ...template,
  id: "sess-1",
  is_template: false,
  template_name: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  pm.inquirySession.create.mockImplementation(({ data }) => ({
    id: data.is_template ? "tpl-new" : "sess-new",
    ...data,
  }));
});

describe("POST /api/inquiries/create – Template-Rollen", () => {
  it("OWNER erstellt eine Praxisvorlage", async () => {
    const accountId = mockSession("OWNER");
    const response = await createHandler(request("/api/inquiries/create", {
      inquiryIds: ["AU"],
      asTemplate: true,
      templateName: "Neue Vorlage",
    }));

    expect(response.status).toBe(201);
    expect(pm.inquirySession.create.mock.calls[0][0].data).toMatchObject({
      owner_account_id: accountId,
      owner_practice_id: "p-1",
      is_template: true,
    });
  });

  it.each(["ADMIN", "USER"] as const)(
    "%s kann Template-Erstellung nicht per API umgehen",
    async (role) => {
      mockSession(role);
      const response = await createHandler(request("/api/inquiries/create", {
        inquiryIds: ["AU"],
        asTemplate: true,
        templateName: "Nicht erlaubt",
      }));

      expect(response.status).toBe(403);
      expect(pm.inquirySession.create).not.toHaveBeenCalled();
    },
  );

  it("USER kann weiterhin eine normale Inquiry erstellen", async () => {
    const accountId = mockSession("USER");
    const response = await createHandler(request("/api/inquiries/create", {
      inquiryIds: ["AU"],
    }));

    expect(response.status).toBe(201);
    expect(pm.inquirySession.create.mock.calls[0][0].data).toMatchObject({
      owner_account_id: accountId,
      owner_practice_id: "p-1",
      is_template: false,
    });
  });

  it("INBOX_ONLY bleibt vollständig ausgeschlossen", async () => {
    mockSession("INBOX_ONLY");
    const response = await createHandler(request("/api/inquiries/create", {
      inquiryIds: ["AU"],
    }));

    expect(response.status).toBe(403);
    expect(pm.inquirySession.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/inquiries/templates/[id]/instantiate", () => {
  it.each(["OWNER", "ADMIN", "USER"] as const)(
    "%s verwendet eine Vorlage derselben Praxis",
    async (role) => {
      const accountId = mockSession(role);
      pm.inquirySession.findUnique.mockResolvedValue(template);

      const response = await instantiateHandler(
        request("/api/inquiries/templates/tpl-1/instantiate"),
        { params: Promise.resolve({ id: "tpl-1" }) },
      );

      expect(response.status).toBe(201);
      expect(pm.inquirySession.create.mock.calls[0][0].data).toMatchObject({
        owner_account_id: accountId,
        owner_practice_id: "p-1",
        is_template: false,
      });
    },
  );

  it("liefert für eine Vorlage einer fremden Praxis 404", async () => {
    mockSession("USER");
    pm.inquirySession.findUnique.mockResolvedValue({
      ...template,
      owner_practice_id: "p-2",
    });

    const response = await instantiateHandler(
      request("/api/inquiries/templates/tpl-1/instantiate"),
      { params: Promise.resolve({ id: "tpl-1" }) },
    );

    expect(response.status).toBe(404);
    expect(pm.inquirySession.create).not.toHaveBeenCalled();
  });

  it("liefert für eine normale Session 404", async () => {
    mockSession("USER");
    pm.inquirySession.findUnique.mockResolvedValue(sourceSession);

    const response = await instantiateHandler(
      request("/api/inquiries/templates/sess-1/instantiate"),
      { params: Promise.resolve({ id: "sess-1" }) },
    );

    expect(response.status).toBe(404);
    expect(pm.inquirySession.create).not.toHaveBeenCalled();
  });

  it("liefert für eine manipulierte ID 404", async () => {
    mockSession("USER");
    pm.inquirySession.findUnique.mockResolvedValue(null);

    const response = await instantiateHandler(
      request("/api/inquiries/templates/missing/instantiate"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("INBOX_ONLY kann keine Vorlage instanziieren", async () => {
    mockSession("INBOX_ONLY");
    pm.inquirySession.findUnique.mockResolvedValue(template);

    const response = await instantiateHandler(
      request("/api/inquiries/templates/tpl-1/instantiate"),
      { params: Promise.resolve({ id: "tpl-1" }) },
    );

    expect(response.status).toBe(403);
    expect(pm.inquirySession.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/inquiries/[id]/save-as-template", () => {
  it("OWNER speichert eine eigene Session derselben Praxis als Vorlage", async () => {
    const accountId = mockSession("OWNER");
    pm.inquirySession.findUnique.mockResolvedValue({
      ...sourceSession,
      owner_account_id: accountId,
    });

    const response = await saveAsTemplateHandler(
      request("/api/inquiries/sess-1/save-as-template", {
        templateName: "Gespeichert",
      }),
      { params: Promise.resolve({ id: "sess-1" }) },
    );

    expect(response.status).toBe(201);
    expect(pm.inquirySession.create.mock.calls[0][0].data).toMatchObject({
      owner_account_id: accountId,
      owner_practice_id: "p-1",
      is_template: true,
    });
  });

  it.each(["ADMIN", "USER"] as const)(
    "%s kann Save-as-template nicht per API umgehen",
    async (role) => {
      mockSession(role);
      const response = await saveAsTemplateHandler(
        request("/api/inquiries/sess-1/save-as-template", {
          templateName: "Nicht erlaubt",
        }),
        { params: Promise.resolve({ id: "sess-1" }) },
      );

      expect(response.status).toBe(403);
      expect(pm.inquirySession.findUnique).not.toHaveBeenCalled();
      expect(pm.inquirySession.create).not.toHaveBeenCalled();
    },
  );

  it("OWNER kann keine Session einer fremden Praxis speichern", async () => {
    const accountId = mockSession("OWNER");
    pm.inquirySession.findUnique.mockResolvedValue({
      ...sourceSession,
      owner_account_id: accountId,
      owner_practice_id: "p-2",
    });

    const response = await saveAsTemplateHandler(
      request("/api/inquiries/sess-1/save-as-template", {
        templateName: "Fremd",
      }),
      { params: Promise.resolve({ id: "sess-1" }) },
    );

    expect(response.status).toBe(404);
    expect(pm.inquirySession.create).not.toHaveBeenCalled();
  });
});