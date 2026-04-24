/**
 * Testet, dass der Button "Ärztlich vorbereitet" in M1-Ergänzung erscheint
 * und die richtige data-Attribute trägt.
 */

import { renderToStaticMarkup } from "react-dom/server";
import M1ErgaenzungPage from "@/app/cases/[id]/m1/page";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
} from "@/lib/types";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

const stdCheckpoint: ActiveCheckpoint = {
  id: "K03",
  block_id: "medizinische_lage",
  type: CheckpointType.NACHWEIS,
  category: CheckpointCategory.M,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  status: "TO_DO",
  title: "Diagnosenlage",
  m4: { type: "ACTION", text: "Bitte Befunde mitbringen." },
};

const k10: ActiveCheckpointMultiSelect = {
  id: "K10",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Besonderer Versorgungsaufwand",
  options: ["Neupatient / unbekannt", "Multimedikation"],
  selections: [],
  enabled: false,
};

function setupCase(checkpoints: ActiveCheckpoint[]) {
  pm.caseSession.findUnique.mockResolvedValue({
    owner_account_id: "acc-test",
    active_checkpoints: checkpoints,
    doctor_confirmed: false,
    clinical_status: "none",
  });
}

describe("M1-Ergänzung – Button 'Ärztlich vorbereitet'", () => {
  beforeEach(() => {
    pm.caseSession.findUnique.mockReset();
  });

  it("zeigt 'Ärztlich vorbereitet'-Button mit data-clinical-status-prepared in M1", async () => {
    setupCase([stdCheckpoint, k10]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain("data-clinical-status-prepared");
    expect(markup).toContain("Ärztlich vorbereitet");
  });

  it("zeigt 'Ärztlich vorbereitet'-Button auch ohne MULTI_SELECT-Checkpoints", async () => {
    setupCase([stdCheckpoint]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain("data-clinical-status-prepared");
    expect(markup).toContain("Ärztlich vorbereitet");
  });

  it("zeigt 'Ärztlich vorbereitet' gemeinsam mit dem Ergänzungs-Formular", async () => {
    setupCase([stdCheckpoint]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    // Sowohl Ergänzungs-Formular als auch der neue Button sind sichtbar.
    expect(markup).toContain("Fall anlegen");
    expect(markup).toContain("data-clinical-status-prepared");
    expect(markup).toContain("Ärztlich vorbereitet");
  });

  it("'Ärztlich vorbereitet' erscheint nach dem Ergänzungs-Formular", async () => {
    setupCase([stdCheckpoint]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    const formIdx = markup.indexOf("Fall anlegen");
    const preparedIdx = markup.indexOf("data-clinical-status-prepared");
    expect(formIdx).toBeGreaterThan(-1);
    expect(preparedIdx).toBeGreaterThan(formIdx);
  });
});
