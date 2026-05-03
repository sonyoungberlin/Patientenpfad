/**
 * Phase 3d: Tests für app/p/confirm/[token]/page.tsx.
 *
 * Prüft die Reihenfolge (Plan-Anpassung 6):
 *   Tokenformat → Hash+Lookup → Status/Expiry → Owner-/Feature-Flags → bestätigen.
 *
 * In allen Negativfällen: identische generische Fehlermeldung im Markup.
 */

import { renderToStaticMarkup } from "react-dom/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import ConfirmPage from "@/app/p/confirm/[token]/page";
import {
  generateConfirmToken,
  hashConfirmToken,
} from "@/lib/websiteForms/confirmToken";

type PrismaMock = {
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;

const ENABLED_OWNER = {
  is_approved: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};
const ACTIVE_FORM = { is_active: true };

function validSession(over: Partial<{
  source: string;
  status: string;
  confirmed_at: Date | null;
  confirm_token_expires_at: Date | null;
  owner_account: typeof ENABLED_OWNER | null;
  practice_form: typeof ACTIVE_FORM | null;
}> = {}) {
  return {
    id: "s-1",
    source: "website",
    status: "awaiting_email_confirmation",
    confirmed_at: null,
    confirm_token_expires_at: new Date(Date.now() + 60_000),
    owner_account: ENABLED_OWNER,
    practice_form: ACTIVE_FORM,
    ...over,
  };
}

async function run(token: string): Promise<string> {
  const node = await ConfirmPage({ params: Promise.resolve({ token }) });
  return renderToStaticMarkup(node);
}

let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  pm.patientQuestionnaireSession.findUnique.mockReset();
  pm.patientQuestionnaireSession.update.mockReset().mockResolvedValue({});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleErrorSpy.mockRestore());

describe("/p/confirm/[token]", () => {
  it("ungültiges Tokenformat → Fehlermeldung, KEIN DB-Roundtrip", async () => {
    const m = await run("kaputt");
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.findUnique).not.toHaveBeenCalled();
  });

  it("unbekannter Token → Fehlermeldung", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(null);
    const m = await run(generateConfirmToken().raw);
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("falscher source → Fehler, kein update", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      validSession({ source: "internal_link" }),
    );
    const m = await run(generateConfirmToken().raw);
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("falscher Status → Fehler", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      validSession({ status: "completed", confirmed_at: new Date() }),
    );
    const m = await run(generateConfirmToken().raw);
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("abgelaufenes Token → Fehler", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      validSession({
        confirm_token_expires_at: new Date(Date.now() - 1000),
      }),
    );
    const m = await run(generateConfirmToken().raw);
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Owner-Cascade nachträglich gebrochen → Fehler", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      validSession({
        owner_account: { ...ENABLED_OWNER, website_forms_enabled: false },
      }),
    );
    const m = await run(generateConfirmToken().raw);
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("inaktives Formular → Fehler", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      validSession({ practice_form: { is_active: false } }),
    );
    const m = await run(generateConfirmToken().raw);
    expect(m).toContain("data-public-confirm-error");
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Happy Path: update mit status=completed, confirmed_at, submitted_at, Token verbrennt", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(validSession());
    const t = generateConfirmToken().raw;
    const m = await run(t);

    expect(m).toContain("data-public-confirm-success");
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledTimes(1);
    const arg = pm.patientQuestionnaireSession.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "s-1" });
    expect(arg.data.status).toBe("completed");
    expect(arg.data.confirmed_at).toBeInstanceOf(Date);
    expect(arg.data.submitted_at).toBeInstanceOf(Date);
    expect(arg.data.confirm_token).toBeNull();
    expect(arg.data.confirm_token_expires_at).toBeNull();

    // findUnique wurde mit dem hex-Hash aufgerufen (NICHT Klartext).
    const findArg = pm.patientQuestionnaireSession.findUnique.mock.calls[0][0];
    expect(findArg.where.confirm_token).toBe(hashConfirmToken(t));
    expect(findArg.where.confirm_token).not.toBe(t);
  });
});
