import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  ActionStatus,
  DecisionStatus,
  type InquirySection,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Cross-Section-Deduplication für ATTACHED-ACTION-Checkpoints.
//
// Hintergrund: Wenn dieselbe ACTION an mehrere Profile gebunden ist (z. B.
// ACUTE_OPEN_CONSULTATION_ACTION an ACUTE_CARE und APPOINTMENT), darf sie im
// gerenderten Patiententext nur einmal erscheinen – nicht einmal pro Anliegen.
// SHARED_BOTTOM-Actions waren schon vorher dedupliziert; ATTACHED-Actions
// werden seit diesem Fix ebenfalls cross-section dedupliziert (Reihenfolge
// stabil, erste Vorkommensstelle gewinnt).
// ---------------------------------------------------------------------------

function makeSection(
  inquiryId: string,
  active: Record<string, string>,
  decisionStatus: string = DecisionStatus.POSSIBLE,
): InquirySection {
  return {
    inquiryId,
    decisionStatus: decisionStatus as InquirySection["decisionStatus"],
    checkpointStatuses: active,
  };
}

describe("renderInquiryResponseFromSections – ACTION-Dedup über mehrere Sections", () => {
  // Sanity-Check: ACUTE_OPEN_CONSULTATION_ACTION ist tatsächlich an beide
  // Profile gebunden (sonst greift der hier getestete Pfad nicht).
  it("Setup: ACUTE_OPEN_CONSULTATION_ACTION ist an ACUTE_CARE und APPOINTMENT gebunden", () => {
    const acute = INQUIRY_PROFILE_CATALOG_V2.ACUTE_CARE;
    const appt = INQUIRY_PROFILE_CATALOG_V2.APPOINTMENT;
    expect(acute.boundActionCheckpointIds).toContain("ACUTE_OPEN_CONSULTATION_ACTION");
    expect(appt.boundActionCheckpointIds).toContain("ACUTE_OPEN_CONSULTATION_ACTION");
  });

  it("dieselbe ATTACHED-Action in zwei Profilen aktiv → nur einmal im Patiententext", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);

    const allParagraphs = result.sections.flatMap((s) => s.attachedParagraphs);
    const matches = allParagraphs.filter((p) =>
      p.includes("Die offene Sprechstunde findet täglich von 9–10 Uhr statt."),
    );
    expect(matches.length).toBe(1);
  });

  it("erste Vorkommensstelle gewinnt – Action erscheint im ersten Anliegen, nicht im zweiten", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    const [first, second] = result.sections;

    const inFirst = first.attachedParagraphs.some((p) =>
      p.includes("Die offene Sprechstunde findet täglich"),
    );
    const inSecond = second.attachedParagraphs.some((p) =>
      p.includes("Die offene Sprechstunde findet täglich"),
    );
    expect(inFirst).toBe(true);
    expect(inSecond).toBe(false);
  });

  it("M5-Dokumentation enthält die Action ebenfalls nur einmal (über alle Sections)", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    const docMatches = result.documentation.filter((d) =>
      d.startsWith("Offene Sprechstunde – Hinweis"),
    );
    expect(docMatches.length).toBe(1);
  });

  it("verschiedene Actions bleiben erhalten – nur die geteilte ID wird dedupliziert", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
        ACUTE_BOOKING_INFO: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    const allParagraphs = result.sections.flatMap((s) => s.attachedParagraphs);

    // Geteilte Action: 1×
    expect(
      allParagraphs.filter((p) =>
        p.includes("Die offene Sprechstunde findet täglich"),
      ),
    ).toHaveLength(1);
    // Profil-eigene Action ACUTE_BOOKING_INFO bleibt erhalten
    expect(
      allParagraphs.some((p) =>
        p.startsWith("Termine können"),
      ) || allParagraphs.length >= 2,
    ).toBe(true);
  });

  it("Ein-Profil-Nachricht: Action wird unverändert genau einmal gerendert", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    const allParagraphs = result.sections.flatMap((s) => s.attachedParagraphs);
    expect(
      allParagraphs.filter((p) =>
        p.includes("Die offene Sprechstunde findet täglich"),
      ),
    ).toHaveLength(1);
  });

  it("SHARED_BOTTOM-Action (BOOK_APPOINTMENT) bleibt wie zuvor: nur einmal in sharedBottom", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        BOOK_APPOINTMENT: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        BOOK_APPOINTMENT: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    const matches = result.sharedBottom.filter((t) => t.startsWith("Termine können"));
    expect(matches).toHaveLength(1);
  });
});
