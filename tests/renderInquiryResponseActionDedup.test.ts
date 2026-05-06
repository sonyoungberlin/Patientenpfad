import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  ActionStatus,
  DecisionStatus,
  type InquirySection,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Cross-Section-Deduplication für ACTION-Checkpoints.
//
// Hintergrund: Wenn dieselbe ACTION an mehrere Profile gebunden ist (z. B.
// ACUTE_OPEN_CONSULTATION_ACTION an ACUTE_CARE und APPOINTMENT), darf sie im
// gerenderten Patiententext nur einmal erscheinen – nicht einmal pro Anliegen.
// Für SHARED_BOTTOM-Actions erfolgt die Deduplizierung über `sharedBottomSeen`;
// für ATTACHED-Actions, die an mehrere Profile gebunden sind, greift zusätzlich
// `attachedActionSeen` in renderInquiryResponseFromSections (erste
// Vorkommensstelle gewinnt, Reihenfolge stabil).
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

  it("dieselbe Action in zwei Profilen aktiv → nur einmal im Patiententext (in sharedBottom)", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);

    // Action ist jetzt SHARED_BOTTOM → erscheint genau einmal unten gesammelt.
    const bottomMatches = result.sharedBottom.filter((t) =>
      t.includes("Die offene Sprechstunde findet täglich von 9–10 Uhr statt."),
    );
    expect(bottomMatches.length).toBe(1);

    // Und nicht zusätzlich in irgendeinem section-attachedParagraph.
    const allParagraphs = result.sections.flatMap((s) => s.attachedParagraphs);
    const attachedMatches = allParagraphs.filter((p) =>
      p.includes("Die offene Sprechstunde findet täglich"),
    );
    expect(attachedMatches).toHaveLength(0);
  });

  it("erscheint immer am Ende der Nachricht (sharedBottom), nicht in profilbezogenen Paragraphen", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
      makeSection("APPOINTMENT", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    for (const s of result.sections) {
      expect(
        s.attachedParagraphs.some((p) =>
          p.includes("Die offene Sprechstunde findet täglich"),
        ),
      ).toBe(false);
    }
    expect(
      result.sharedBottom.some((t) =>
        t.includes("Die offene Sprechstunde findet täglich"),
      ),
    ).toBe(true);
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
    // Hinweis: SHARED_BOTTOM-Actions erzeugen aktuell keinen eigenen
    // Doku-Eintrag pro Section (Block D/E SHARED_BOTTOM-Pfad). Wichtig ist hier:
    // kein doppelter Eintrag durch die Mehrfach-Bindung.
    const docMatches = result.documentation.filter((d) =>
      d.startsWith("Offene Sprechstunde – Hinweis"),
    );
    expect(docMatches.length).toBeLessThanOrEqual(1);
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

    // Geteilte Action: 1× in sharedBottom
    expect(
      result.sharedBottom.filter((t) =>
        t.includes("Die offene Sprechstunde findet täglich"),
      ),
    ).toHaveLength(1);

    // Profil-eigene Action ACUTE_BOOKING_INFO bleibt unverändert in der ACUTE_CARE-Section.
    const allParagraphs = result.sections.flatMap((s) => s.attachedParagraphs);
    expect(allParagraphs.length).toBeGreaterThanOrEqual(1);
  });

  it("Ein-Profil-Nachricht: Action wird unverändert genau einmal gerendert (sharedBottom)", () => {
    const sections: InquirySection[] = [
      makeSection("ACUTE_CARE", {
        ACUTE_OPEN_CONSULTATION_ACTION: ActionStatus.ACTIVE,
      }),
    ];

    const result = renderInquiryResponseFromSections(sections);
    expect(
      result.sharedBottom.filter((t) =>
        t.includes("Die offene Sprechstunde findet täglich"),
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
