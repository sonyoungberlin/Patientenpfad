/**
 * Testet, dass K10/K11 (MULTI_SELECT) im M1-Ergänzungs-Flow korrekt
 * unter "Anlass / Besonderheiten" angezeigt werden.
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

const k10Disabled: ActiveCheckpointMultiSelect = {
  id: "K10",
  block_id: "medizinische_lage",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Besonderer Versorgungsaufwand",
  options: [
    "Neupatient / unbekannt",
    "Multimedikation",
    "postoperative / akute Nachsorge",
    "erhöhter Betreuungsbedarf",
    "eingeschränkte Kommunikation",
    "Betäubungsmittel",
    "psychischer oder psychosozialer Betreuungsbedarf",
  ],
  selections: [],
  enabled: false,
};

const k11Disabled: ActiveCheckpointMultiSelect = {
  id: "K11",
  block_id: "kommunikation",
  type: CheckpointType.BEDARF,
  category: CheckpointCategory.O,
  perspectives: [],
  mode: CheckpointMode.MULTI_SELECT,
  title: "Besonderer Anlass",
  options: ["Erstbesuch", "Akuttermin", "Folgebesuch nach Notfall"],
  selections: [],
  enabled: false,
};

const k10Enabled: ActiveCheckpointMultiSelect = {
  ...k10Disabled,
  enabled: true,
  selections: ["Multimedikation", "erhöhter Betreuungsbedarf"],
};

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

function setupCase(checkpoints: ActiveCheckpoint[]) {
  pm.caseSession.findUnique.mockResolvedValue({
    owner_account_id: "acc-test",
    active_checkpoints: checkpoints,
    doctor_confirmed: false,
    clinical_status: "none",
  });
}

describe("M1-Ergänzung – K10/K11 unter 'Anlass / Besonderheiten'", () => {
  beforeEach(() => {
    pm.caseSession.findUnique.mockReset();
  });

  it("zeigt Sektion 'Anlass / Besonderheiten' mit K10 und K11", async () => {
    setupCase([stdCheckpoint, k10Disabled, k11Disabled]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain("Anlass / Besonderheiten");
    expect(markup).toContain('data-multi-select-section');
  });

  it("rendert K10 als data-checkpoint-multi in M1", async () => {
    setupCase([stdCheckpoint, k10Disabled]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain('data-checkpoint-multi="K10"');
    expect(markup).toContain('data-multi-toggle="K10"');
  });

  it("rendert K11 als data-checkpoint-multi in M1", async () => {
    setupCase([stdCheckpoint, k11Disabled]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain('data-checkpoint-multi="K11"');
    expect(markup).toContain('data-multi-toggle="K11"');
  });

  it("zeigt keine Optionen wenn K10 deaktiviert", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).not.toContain("Neupatient / unbekannt");
    expect(markup).not.toContain("Multimedikation");
  });

  it("zeigt Optionen wenn K10 aktiviert (aus DB-Stand)", async () => {
    setupCase([k10Enabled]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain("Neupatient / unbekannt");
    expect(markup).toContain("Multimedikation");
    expect(markup).toContain("erhöhter Betreuungsbedarf");
  });

  it("zeigt den optionalen Untertitel", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).toContain(
      "Optional: Markieren Sie besondere Gründe oder Rahmenbedingungen des Falls.",
    );
  });

  it("zeigt keine Multi-Select-Sektion wenn keine MULTI_SELECT-Checkpoints in active_checkpoints", async () => {
    setupCase([stdCheckpoint]);

    const markup = renderToStaticMarkup(
      await M1ErgaenzungPage({ params: Promise.resolve({ id: "case-abc" }) }),
    );

    expect(markup).not.toContain("data-multi-select-section");
    expect(markup).not.toContain("Anlass / Besonderheiten");
  });
});
