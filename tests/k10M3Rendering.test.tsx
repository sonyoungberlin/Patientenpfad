import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointRelevance,
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
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    account: {
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
  account: {
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
  relevance: CheckpointRelevance.P,
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
  relevance: CheckpointRelevance.A,
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

describe("M3 – K10 Besonderer Versorgungsaufwand", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.account.findUnique.mockReset();
    prismaMock.account.findUnique.mockResolvedValue({ message_signature: null });
  });

  function setupCase(checkpoints: ActiveCheckpoint[]) {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: checkpoints,
    });
  }

  it("rendert K10 als Multi-Select-Block (nicht als Standard-Checkpoint)", async () => {
    setupCase([mCheckpoint, k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // K10 wird als data-checkpoint-multi gerendert, nicht als data-checkpoint-item
    expect(markup).toContain('data-checkpoint-multi="K10"');
    expect(markup).not.toContain('data-checkpoint-item="K10"');
    // Standard-Checkpoint wird weiterhin als data-checkpoint-item gerendert
    expect(markup).toContain('data-checkpoint-item="K03"');
  });

  it("zeigt Titel und Toggle-Checkbox für K10 (deaktiviert)", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Besonderer Versorgungsaufwand");
    expect(markup).toContain('data-multi-toggle="K10"');
  });

  it("zeigt keine Auswahloptionen wenn K10 nicht aktiviert", async () => {
    setupCase([k10Disabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    // Optionen dürfen nicht sichtbar sein
    expect(markup).not.toContain("Neupatient / unbekannt");
    expect(markup).not.toContain("Multimedikation");
    expect(markup).not.toContain("postoperative / akute Nachsorge");
  });

  it("zeigt Auswahloptionen wenn K10 aktiviert ist", async () => {
    setupCase([k10Enabled]);

    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-123" }) }),
    );

    expect(markup).toContain("Neupatient / unbekannt");
    expect(markup).toContain("Multimedikation");
    expect(markup).toContain("postoperative / akute Nachsorge");
    expect(markup).toContain("erhöhter Betreuungsbedarf");
    expect(markup).toContain("eingeschränkte Kommunikation");
  });

  it("hat keine ausreichend/nicht-ausreichend/unklar Buttons für K10", async () => {
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
    // K10 M5 also present
    expect(markup).toContain(
      "Besonderer Versorgungsaufwand: Multimedikation, erhöhter Betreuungsbedarf",
    );
  });
});
