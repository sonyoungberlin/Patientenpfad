import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

import OfficeCaseEditorClient from "@/app/office-cases/[id]/OfficeCaseEditorClient";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";
import {
  buildCheckpointComplianceMap,
  getEmptyCompliance,
  type CheckpointComplianceView,
} from "@/lib/office/checkpointCompliance";
import {
  buildInitialSnapshotForTopic,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  type OfficeTopicId,
} from "@/lib/office/checkpointCatalog";

function makeSnapshot(id: string, title: string): OfficeCheckpointSnapshot {
  return {
    id,
    title,
    kind: OfficeCheckpointKind.FACT,
    state: OfficeCheckpointState.OPEN,
  };
}

function makeOfficeCase() {
  return {
    id: "oc-1",
    title: "Testfall",
    trigger_note: null,
    topicId: "kv-schreiben-abrechnungsrueckfrage",
    topicTitle: "KV-Abrechnungspruefung",
    checkpoint_snapshot: {
      topicId: "kv-schreiben-abrechnungsrueckfrage",
      checkpoints: [
        makeSnapshot("KV-02", "Konkrete KV-Rueckfrage liegt vor"),
        makeSnapshot("KV-03", "Vorbereitung der Stellungnahme"),
      ],
    },
  };
}

describe("OfficeCaseEditorClient + Compliance-Footer", () => {
  it("zeigt bei allen drei Personal-V2-Themen den organisatorischen Abschluss und gruppierte M2-Abschnitte", () => {
    const targetTopics: OfficeTopicId[] = [
      OFFICE_TOPIC_MFA_HIRING,
      OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
      OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
    ];

    for (const topicId of targetTopics) {
      const checkpoints = buildInitialSnapshotForTopic(topicId, 2);
      const officeCase = {
        id: "personnel-case",
        title: "Testfall",
        trigger_note: null,
        topicId,
        topicTitle: topicId,
        checkpoint_snapshot: {
          topicId,
          templateVersion: 2,
          decisionRevision: 1,
          finalReview: { decision: "APPROVED", reviewed_revision: 0 },
          finalReviewHistory: [{ decision: "APPROVED", reviewed_revision: 0 }],
          checkpoints,
        },
      };
      const m3Html = renderToStaticMarkup(
        <OfficeCaseEditorClient officeCase={officeCase} mode="m3" />,
      );
      const m2Html = renderToStaticMarkup(
        <OfficeCaseEditorClient officeCase={officeCase} mode="m2" />,
      );
      const sectionTitle =
        topicId === OFFICE_TOPIC_MFA_HIRING
          ? "Eintritt und Vertrag"
          : topicId === OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION
            ? "Beendigung und Personalabschluss"
            : "Vertrag und Ausbildung";

      expect(m3Html).toContain("Organisatorischer Abschluss");
      expect(m3Html).toContain(
        "Dies ist keine rechtliche Genehmigung und keine Bestätigung, dass sämtliche gesetzlichen Anforderungen erfüllt sind.",
      );
      expect(m3Html).toContain("Erneute organisatorische Prüfung erforderlich");
      expect(m3Html).toContain("Organisatorischen Abschluss dokumentieren");
      expect(m3Html).not.toContain("Abschlussfreigabe");
      expect(m3Html).not.toContain("Freigabehistorie");
      expect(m3Html).not.toContain("Manuell freigeben");
      expect(m3Html).toContain("Organisatorischer Bearbeitungsstand");
      expect(m2Html).toContain(sectionTitle);
    }
  });

  it("M3 zeigt den Footer mit checkpoint-spezifischer testid, wenn Compliance-Map gesetzt ist", () => {
    const complianceByCheckpointId = buildCheckpointComplianceMap(
      "kv-schreiben-abrechnungsrueckfrage",
    );
    const html = renderToStaticMarkup(
      <OfficeCaseEditorClient
        officeCase={makeOfficeCase()}
        mode="m3"
        complianceByCheckpointId={complianceByCheckpointId}
      />,
    );
    expect(html).toContain('data-testid="office-compliance-footer-KV-02"');
    expect(html).toContain('data-testid="office-compliance-footer-KV-03"');
  });

  it("M2 zeigt keinen Footer, auch wenn die Compliance-Map uebergeben wird", () => {
    const complianceByCheckpointId = buildCheckpointComplianceMap(
      "kv-schreiben-abrechnungsrueckfrage",
    );
    const html = renderToStaticMarkup(
      <OfficeCaseEditorClient
        officeCase={makeOfficeCase()}
        mode="m2"
        complianceByCheckpointId={complianceByCheckpointId}
      />,
    );
    expect(html).not.toContain("office-compliance-footer");
  });

  it("M3 ohne Compliance-Prop crasht nicht und rendert keinen Footer", () => {
    const html = renderToStaticMarkup(
      <OfficeCaseEditorClient officeCase={makeOfficeCase()} mode="m3" />,
    );
    expect(html).not.toContain("office-compliance-footer");
    expect(html.length).toBeGreaterThan(0);
  });

  it("M3 mit leerem Compliance-View fuer einen Checkpoint rendert dessen Footer nicht", () => {
    const empty: CheckpointComplianceView = getEmptyCompliance();
    const html = renderToStaticMarkup(
      <OfficeCaseEditorClient
        officeCase={makeOfficeCase()}
        mode="m3"
        complianceByCheckpointId={{ "KV-02": empty }}
      />,
    );
    expect(html).not.toContain("office-compliance-footer-KV-02");
  });
});
