/**
 * Tests für app/anfrage/[slug]/page.tsx.
 *
 * Nach Umstellung auf Practice.slug-Lookup:
 *   - Formular wird gerendert wenn Practice mit dem Slug existiert und
 *     is_approved=true + patient_communication_enabled=true.
 *   - notFound() bei ungültigem Slug-Format.
 *   - notFound() wenn keine Practice mit diesem Slug existiert.
 *   - notFound() wenn is_approved=false.
 *   - notFound() wenn patient_communication_enabled=false.
 *   - Formular-Action zeigt auf /api/anfrage/[slug].
 *   - Ein PracticeQuestionnaireForm-Slug ohne gleichnamige Practice → 404
 *     (kein Rückfall auf altes Lookup).
 */

import { renderToStaticMarkup } from "react-dom/server";

const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import AnfragePage from "@/app/anfrage/[slug]/page";

type PrismaMock = { practice: { findUnique: jest.Mock } };
const pm = prisma as unknown as PrismaMock;

function activePractice() {
  return {
    is_approved: true,
    patient_communication_enabled: true,
    message_signature: null,
  };
}

async function runPage(slug: string): Promise<{
  notFound: boolean;
  markup: string | null;
}> {
  try {
    const node = await AnfragePage({
      params: Promise.resolve({ slug }),
    });
    return { notFound: false, markup: renderToStaticMarkup(node) };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__") return { notFound: true, markup: null };
    throw err;
  }
}

beforeEach(() => {
  notFoundMock.mockClear();
  pm.practice.findUnique.mockReset();
});

describe("AnfragePage — Sichtbarkeits-Cascade", () => {
  it("rendert das Formular für gültige aktive Practice", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const r = await runPage("meine-praxis");
    expect(r.notFound).toBe(false);
    expect(r.markup).toContain("Digitales Anliegen");
  });

  it("Formular-Action zeigt auf /api/anfrage/[slug]", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const r = await runPage("meine-praxis");
    expect(r.markup).toContain('action="/api/anfrage/meine-praxis"');
  });

  it("notFound() bei ungültigem Slug-Format (zu kurz)", async () => {
    const r = await runPage("x");
    expect(r.notFound).toBe(true);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  });

  it("notFound() wenn keine Practice mit diesem Slug existiert", async () => {
    pm.practice.findUnique.mockResolvedValue(null);
    const r = await runPage("unbekannt-praxis");
    expect(r.notFound).toBe(true);
  });

  it("notFound() wenn Practice nicht freigegeben (is_approved=false)", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      is_approved: false,
    });
    const r = await runPage("gesperrte-praxis");
    expect(r.notFound).toBe(true);
  });

  it("notFound() wenn patient_communication_enabled=false", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      patient_communication_enabled: false,
    });
    const r = await runPage("praxis-ohne-kom");
    expect(r.notFound).toBe(true);
  });

  it("sucht nach Practice.slug, nicht nach PracticeQuestionnaireForm.slug", async () => {
    // Wenn ein PracticeQuestionnaireForm-Slug übergeben wird, aber keine
    // Practice mit diesem Slug existiert, muss 404 zurückgegeben werden.
    pm.practice.findUnique.mockResolvedValue(null);
    const r = await runPage("neupatient-formular");
    expect(r.notFound).toBe(true);
    // Lookup lief gegen practice.findUnique, nicht gegen practiceQuestionnaireForm
    expect(pm.practice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "neupatient-formular" } }),
    );
  });

  it("Geburtsdatum-Feld hat required-Attribut", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const r = await runPage("meine-praxis");
    expect(r.markup).toMatch(/name="birth_date"[^>]*required|required[^>]*name="birth_date"/);
  });

  it("rendert Checkboxen für AU, PRESCRIPTION und REFERRAL", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const r = await runPage("meine-praxis");
    expect(r.markup).toContain('value="AU"');
    expect(r.markup).toContain('value="PRESCRIPTION"');
    expect(r.markup).toContain('value="REFERRAL"');
    expect(r.markup).toContain('name="requested_topic"');
  });

  it("hat kein concern_text-Textarea mehr", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const r = await runPage("meine-praxis");
    expect(r.markup).not.toContain('name="concern_text"');
  });

  it("zeigt Praxis-Signatur wenn message_signature gesetzt", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      message_signature: "Ihre Muster-Praxis \nTel: 0800 123456",
    });
    const r = await runPage("meine-praxis");
    expect(r.markup).toContain("Ihre Muster-Praxis");
    expect(r.markup).toContain("data-testid=\"practice-signature\"");
  });

  it("zeigt keine Signatur wenn message_signature null", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const r = await runPage("meine-praxis");
    expect(r.markup).not.toContain("data-testid=\"practice-signature\"");
  });
});

