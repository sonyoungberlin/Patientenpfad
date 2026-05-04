import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";
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
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
    current_practice: { id: "prac-test" },
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    practice: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  practice: {
    findUnique: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const mCheckpoint: ActiveCheckpoint = {
  id: "K03",
  block_id: "medizinische_lage",
  type: CheckpointType.NACHWEIS,
  category: CheckpointCategory.M,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  status: "TO_DO",
  title: "Diagnosenlage",
  m4: { type: "ACTION", text: "Bitte Befunde mitbringen." },
};

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
  ],
  selections: [],
  enabled: false,
};

const k10Enabled: ActiveCheckpointMultiSelect = {
  ...k10Disabled,
  enabled: true,
  selections: ["Multimedikation", "erhöhter Betreuungsbedarf"],
};

describe("M3 – K10 nicht mehr in M3 (nach Migration nach M1)", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.practice.findUnique.mockReset();
    prismaMock.practice.findUnique.mockResolvedValue({ message_signature: null });
  });

  function setupCase(checkpoints: ActiveCheckpoint[]) {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: checkpoints,
    });
  }

  it("rendert K10 NICHT als Multi-Select-Block in M3 (nach Migration nach M1)", async () => {
    setupCase([mCheckpoint, k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // K10 darf nicht mehr als data-checkpoint-multi in M3 erscheinen
    expect(markup).not.toContain('data-checkpoint-multi="K10"');
    // Standard-Checkpoint wird weiterhin als data-checkpoint-item gerendert
    expect(markup).toContain('data-checkpoint-item="K03"');
  });

  it("zeigt keine Toggle-Checkbox für K10 in M3", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain('data-multi-toggle="K10"');
  });

  it("zeigt keine Auswahloptionen für K10 in M3 (auch wenn disabled)", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Keine interaktiven Option-Checkboxen für K10 in M3
    expect(markup).not.toContain('data-multi-option="K10:Neupatient / unbekannt"');
    expect(markup).not.toContain('data-multi-option="K10:Multimedikation"');
    expect(markup).not.toContain('data-multi-option="K10:postoperative / akute Nachsorge"');
  });

  it("zeigt keine Auswahloptionen für K10 in M3 (auch wenn enabled)", async () => {
    setupCase([k10Enabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Keine interaktive Option-UI für K10 in M3 – Optionen dürfen nicht als
    // data-multi-option oder in einem data-checkpoint-multi-Block erscheinen.
    expect(markup).not.toContain('data-multi-option="K10:Neupatient / unbekannt"');
    expect(markup).not.toContain('data-multi-option="K10:Multimedikation"');
    expect(markup).not.toContain('data-multi-option="K10:erhöhter Betreuungsbedarf"');
    // Kein Toggle-Checkbox in M3
    expect(markup).not.toContain('data-multi-toggle="K10"');
    // Kein card-Container für K10
    expect(markup).not.toContain('data-checkpoint-multi="K10"');
  });

  it("hat keine Status-Buttons für K10", async () => {
    setupCase([k10Enabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain('data-status-button="K10:OK"');
    expect(markup).not.toContain('data-status-button="K10:TO_DO"');
    expect(markup).not.toContain('data-status-button="K10:ZURÜCKSTELLEN"');
  });

  it("K10 erzeugt keinen M4-Text (Patientenhinweis)", async () => {
    setupCase([k10Enabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Kein TO_DO-Checkpoint → kein M4
    expect(markup).toContain("Keine weiteren Schritte erforderlich.");
  });

  it("K10 erzeugt M5-Dokumentation wenn aktiviert und ausgewählt", async () => {
    setupCase([k10Enabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain(
      "Besonderer Versorgungsaufwand: Multimedikation, erhöhter Betreuungsbedarf",
    );
  });

  it("K10 erzeugt keine M5-Dokumentation wenn nicht aktiviert", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).not.toContain("Besonderer Versorgungsaufwand:");
  });

  it("Standard-Checkpoints werden durch K10 nicht beeinflusst", async () => {
    setupCase([mCheckpoint, k10Enabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Standard M4 text from K03 still present
    expect(markup).toContain("Bitte Befunde mitbringen.");
    // K03 M5 fallback text present
    expect(markup).toContain("Diagnosenlage ist aktuell nicht ausreichend geklärt.");
    // K10 M5 also present (read from DB, not editable in M3)
    expect(markup).toContain(
      "Besonderer Versorgungsaufwand: Multimedikation, erhöhter Betreuungsbedarf",
    );
    // But K10 has no toggle or options rendered in M3
    expect(markup).not.toContain('data-checkpoint-multi="K10"');
    expect(markup).not.toContain('data-multi-toggle="K10"');
  });
});
