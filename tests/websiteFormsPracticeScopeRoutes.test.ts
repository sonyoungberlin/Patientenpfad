/**
 * Phase P3a: Integrations-Tests für die Practice-Skopierung der
 * Website-Formulare in den vier betroffenen Pfaden.
 *
 * Sicherungen:
 *   - Liste: Account mit current_practice filtert auf owner_practice_id.
 *   - Detail: Account A sieht Form von Kollege B in derselben Practice.
 *   - Detail: Account in fremder Practice → notFound() (kein 403).
 *   - Update-Route: Cross-Practice-Update → 404, kein update().
 *   - Update-Route: kein stilles Setzen von owner_practice_id.
 *   - Create-Route: Doppelschreiben owner_account_id + owner_practice_id.
 *   - Submit-Route: Practice-Flags überstimmen Account-Flags.
 *   - Submit-Route: Doppelschreiben owner_practice_id in Session.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});
const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}));

jest.mock("next/headers", () => ({
  headers: async () =>
    new Map([
      ["host", "praxis.example.com"],
      ["x-forwarded-proto", "https"],
    ]) as unknown as Headers,
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientQuestionnaireSession: {
      create: jest.fn().mockResolvedValue({ id: "sess-1" }),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/mail/sendWebsiteFormConfirmationEmail", () => ({
  sendWebsiteFormConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount, getSessionAccountFromCookies } from "@/lib/auth";

import WebsiteFormsListPage from "@/app/website-forms/page";
import WebsiteFormDetailPage from "@/app/website-forms/[id]/page";
import { POST as CreateRoute } from "@/app/api/website-forms/route";
import { POST as UpdateRoute } from "@/app/api/website-forms/[id]/route";
import PublicFormPage from "@/app/p/[slug]/page";
import { POST as SubmitRoute } from "@/app/api/p/[slug]/submit/route";

type PrismaMock = {
  practiceQuestionnaireForm: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  patientQuestionnaireSession: { create: jest.Mock; delete: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;
const getAcc = getSessionAccount as jest.Mock;

const PRACTICE_A = {
  id: "p-A",
  name: "Praxis A",
  slug: "praxis-a",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

const PRACTICE_B = {
  ...PRACTICE_A,
  id: "p-B",
  slug: "praxis-b",
  name: "Praxis B",
};

const ACCOUNT_A1_IN_PRACTICE_A = {
  id: "acc-A1",
  email: "a1@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  current_practice: PRACTICE_A,
};

const ACCOUNT_A2_IN_PRACTICE_A = {
  ...ACCOUNT_A1_IN_PRACTICE_A,
  id: "acc-A2",
  email: "a2@example.com",
};

const ACCOUNT_B_IN_PRACTICE_B = {
  ...ACCOUNT_A1_IN_PRACTICE_A,
  id: "acc-B",
  email: "b@example.com",
  current_practice: PRACTICE_B,
};

const ADMIN_NO_PRACTICE = {
  ...ACCOUNT_A1_IN_PRACTICE_A,
  id: "acc-ADMIN",
  email: "admin@example.com",
  is_admin: true,
  current_practice: null,
};

beforeEach(() => {
  redirectMock.mockClear();
  notFoundMock.mockClear();
  getCookies.mockReset();
  getAcc.mockReset();
  pm.practiceQuestionnaireForm.findMany.mockReset();
  pm.practiceQuestionnaireForm.findUnique.mockReset();
  pm.practiceQuestionnaireForm.create.mockReset();
  pm.practiceQuestionnaireForm.update.mockReset();
  pm.patientQuestionnaireSession.create.mockReset().mockResolvedValue({
    id: "sess-1",
  });
});

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

describe("/website-forms list — Practice-Scope", () => {
  it("filtert auf owner_practice_id wenn current_practice gesetzt", async () => {
    getCookies.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.practiceQuestionnaireForm.findMany.mockResolvedValue([]);
    try {
      await WebsiteFormsListPage({});
    } catch {
      /* renderToStaticMarkup erlaubt */
    }
    const args = pm.practiceQuestionnaireForm.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ owner_practice_id: "p-A" });
  });
});

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

async function runDetail(id = "form-1"): Promise<{
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await WebsiteFormDetailPage({
      params: Promise.resolve({ id }),
    });
    return { notFound: false, markup: renderToStaticMarkup(node) };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__") return { notFound: true, markup: null };
    throw err;
  }
}

describe("/website-forms/[id] detail — Practice-Scope", () => {
  it("Account A2 darf Form sehen, das Account A1 in derselben Practice angelegt hat", async () => {
    getCookies.mockResolvedValue(ACCOUNT_A2_IN_PRACTICE_A);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Kollegen-Form",
      slug: "kollege-form",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["REZEPT"],
    });
    const r = await runDetail();
    expect(r.notFound).toBe(false);
    expect(r.markup).toContain("Kollegen-Form");
  });

  it("Account aus fremder Practice → notFound() (kein 403)", async () => {
    getCookies.mockResolvedValue(ACCOUNT_B_IN_PRACTICE_B);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Form aus A",
      slug: "form-a",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["REZEPT"],
    });
    const r = await runDetail();
    expect(r.notFound).toBe(true);
  });

  it("Form mit owner_practice_id=null wird im Practice-Modus nicht sichtbar (kein stilles Backfill)", async () => {
    getCookies.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Bestand ohne Practice",
      slug: "bestand",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["REZEPT"],
    });
    const r = await runDetail();
    expect(r.notFound).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Update-Route
// ---------------------------------------------------------------------------

function jsonReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/website-forms/[id] — Practice-Scope", () => {
  it("Account aus fremder Practice → 404, kein update()", async () => {
    getAcc.mockResolvedValue(ACCOUNT_B_IN_PRACTICE_B);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      is_active: true,
    });
    const res = await UpdateRoute(
      jsonReq("http://localhost/api/website-forms/form-1", {
        action: "toggle_active",
      }),
      { params: Promise.resolve({ id: "form-1" }) },
    );
    expect(res.status).toBe(404);
    expect(pm.practiceQuestionnaireForm.update).not.toHaveBeenCalled();
  });

  it("Account A2 darf Toggle für Form von A1 in derselben Practice ausführen", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A2_IN_PRACTICE_A);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      is_active: true,
    });
    pm.practiceQuestionnaireForm.update.mockResolvedValue({});
    const res = await UpdateRoute(
      jsonReq("http://localhost/api/website-forms/form-1", {
        action: "toggle_active",
      }),
      { params: Promise.resolve({ id: "form-1" }) },
    );
    expect(res.status).toBe(200);
    const args = pm.practiceQuestionnaireForm.update.mock.calls[0][0];
    expect(args.data).toEqual({ is_active: false });
    // KEIN stilles Setzen von owner_practice_id (P3a-Regel).
    expect(args.data.owner_practice_id).toBeUndefined();
  });

  it("Voll-Update aktualisiert NICHT owner_practice_id (kein stilles Nachziehen)", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: null, // Bestand vor P1
      is_active: true,
    });
    // Account ist im Practice-Modus → Form ist gar nicht erst sichtbar.
    const res = await UpdateRoute(
      jsonReq("http://localhost/api/website-forms/form-1", {
        title: "Neu",
        slug: "neu-x",
        selected_block_ids: ["REZEPT"],
        is_active: true,
      }),
      { params: Promise.resolve({ id: "form-1" }) },
    );
    expect(res.status).toBe(404);
    expect(pm.practiceQuestionnaireForm.update).not.toHaveBeenCalled();
  });

  it("Plattform-Admin ohne Practice-Membership ist KEIN Bypass", async () => {
    getAcc.mockResolvedValue(ADMIN_NO_PRACTICE);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      is_active: true,
    });
    const res = await UpdateRoute(
      jsonReq("http://localhost/api/website-forms/form-1", {
        action: "toggle_active",
      }),
      { params: Promise.resolve({ id: "form-1" }) },
    );
    expect(res.status).toBe(404);
    expect(pm.practiceQuestionnaireForm.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Create-Route
// ---------------------------------------------------------------------------

describe("POST /api/website-forms — Doppelschreiben", () => {
  it("setzt owner_account_id UND owner_practice_id wenn current_practice da ist", async () => {
    getAcc.mockResolvedValue(ACCOUNT_A1_IN_PRACTICE_A);
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-1",
      slug: "abc-def",
    });
    await CreateRoute(
      jsonReq("http://localhost/api/website-forms", {
        title: "T",
        slug: "abc-def",
        selected_block_ids: ["REZEPT"],
      }),
    );
    const args = pm.practiceQuestionnaireForm.create.mock.calls[0][0];
    expect(args.data.owner_account_id).toBe("acc-A1");
    expect(args.data.owner_practice_id).toBe("p-A");
  });

  it("setzt owner_practice_id NICHT wenn keine current_practice (kein null)", async () => {
    getAcc.mockResolvedValue(ADMIN_NO_PRACTICE);
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-1",
      slug: "abc-def",
    });
    await CreateRoute(
      jsonReq("http://localhost/api/website-forms", {
        title: "T",
        slug: "abc-def",
        selected_block_ids: ["REZEPT"],
      }),
    );
    const args = pm.practiceQuestionnaireForm.create.mock.calls[0][0];
    expect(args.data.owner_account_id).toBe("acc-ADMIN");
    expect(
      Object.prototype.hasOwnProperty.call(args.data, "owner_practice_id"),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Public Page — Practice-Flags überstimmen Account-Flags
// ---------------------------------------------------------------------------

const ENABLED_FLAGS = {
  is_approved: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

async function runPublic(slug = "praxis-formular"): Promise<{
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await PublicFormPage({ params: Promise.resolve({ slug }) });
    return { notFound: false, markup: renderToStaticMarkup(node) };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__") return { notFound: true, markup: null };
    throw err;
  }
}

describe("/p/[slug] — Practice-Flags gewinnen", () => {
  it("Practice aktiv + Account deaktiviert → Seite rendert", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      title: "X",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["KONTAKT"],
      owner_practice_id: "p-A",
      owner_practice: ENABLED_FLAGS,
      owner_account: { ...ENABLED_FLAGS, website_forms_enabled: false },
    });
    const r = await runPublic();
    expect(r.notFound).toBe(false);
  });

  it("Practice deaktiviert + Account aktiv → notFound()", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      title: "X",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["KONTAKT"],
      owner_practice_id: "p-A",
      owner_practice: { ...ENABLED_FLAGS, website_forms_enabled: false },
      owner_account: ENABLED_FLAGS,
    });
    const r = await runPublic();
    expect(r.notFound).toBe(true);
  });

  it("Form ohne Practice → Fallback auf Account-Flags", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      title: "X",
      intro_text: null,
      is_active: true,
      selected_block_ids: ["KONTAKT"],
      owner_practice_id: null,
      owner_practice: null,
      owner_account: ENABLED_FLAGS,
    });
    const r = await runPublic();
    expect(r.notFound).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Submit-Route — Practice-Flags + Doppelschreiben
// ---------------------------------------------------------------------------

function submitFormReq(slug: string, ip = "8.8.8.8"): NextRequest {
  return new NextRequest(`http://localhost/api/p/${slug}/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": ip,
    },
    body: new URLSearchParams({ email: "patient@example.com" }).toString(),
  });
}

describe("POST /api/p/[slug]/submit — Practice-Scope", () => {
  it("Practice aktiv + Account deaktiviert → erlaubt Submit; Session bekommt owner_practice_id", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      is_active: true,
      selected_block_ids: ["KONTAKT"],
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      owner_practice: ENABLED_FLAGS,
      owner_account: { ...ENABLED_FLAGS, website_forms_enabled: false },
    });
    const res = await SubmitRoute(submitFormReq("praxis-formular", "9.9.9.1"), {
      params: Promise.resolve({ slug: "praxis-formular" }),
    });
    expect(res.status).toBe(303);
    expect(pm.patientQuestionnaireSession.create).toHaveBeenCalledTimes(1);
    const data = pm.patientQuestionnaireSession.create.mock.calls[0][0].data;
    expect(data.owner_account_id).toBe("acc-A1");
    expect(data.owner_practice_id).toBe("p-A");
  });

  it("Practice deaktiviert + Account aktiv → 404", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      is_active: true,
      selected_block_ids: ["KONTAKT"],
      owner_account_id: "acc-A1",
      owner_practice_id: "p-A",
      owner_practice: { ...ENABLED_FLAGS, website_forms_enabled: false },
      owner_account: ENABLED_FLAGS,
    });
    const res = await SubmitRoute(submitFormReq("praxis-formular", "9.9.9.2"), {
      params: Promise.resolve({ slug: "praxis-formular" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("Form ohne owner_practice_id → Session ohne owner_practice_id (kein Setzen)", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      is_active: true,
      selected_block_ids: ["KONTAKT"],
      owner_account_id: "acc-A1",
      owner_practice_id: null,
      owner_practice: null,
      owner_account: ENABLED_FLAGS,
    });
    const res = await SubmitRoute(submitFormReq("praxis-formular", "9.9.9.3"), {
      params: Promise.resolve({ slug: "praxis-formular" }),
    });
    expect(res.status).toBe(303);
    const data = pm.patientQuestionnaireSession.create.mock.calls[0][0].data;
    expect(data.owner_account_id).toBe("acc-A1");
    expect(
      Object.prototype.hasOwnProperty.call(data, "owner_practice_id"),
    ).toBe(false);
  });
});
