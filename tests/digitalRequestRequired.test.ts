/**
 * Tests für den globalen ACTION-Baustein DIGITAL_REQUEST_REQUIRED.
 *
 * Hinweis: Der Checkpoint ist fachlich überholt (Fragebögen werden inzwischen
 * direkt versendet) und wird nicht mehr automatisch in Profilen gebunden.
 * Die Definition bleibt im Katalog erhalten (deprecated), daher prüfen die
 * Tests hier nur noch die Katalogstruktur.
 *
 * 1. Katalogstruktur: kind, scope, placement, actionCategory, textByStatus
 */

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  ActionStatus,
  InquiryCheckpointKind,
  InquiryCheckpointPlacement,
  InquiryCheckpointScope,
} from "@/lib/inquiries/types";

const EXPECTED_TEXT =
  "Für die Prüfung Ihres Anliegens benötigen wir noch einige Angaben.\nBitte stellen Sie dazu eine digitale Anfrage über den folgenden Link und beantworten Sie die Fragen.";

// ---------------------------------------------------------------------------
// 1. Katalogstruktur
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST_REQUIRED – Katalogstruktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["DIGITAL_REQUEST_REQUIRED"];

  it("ist im Katalog definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat placement ATTACHED", () => {
    expect(cp.placement).toBe(InquiryCheckpointPlacement.ATTACHED);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit erwartetem Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ActionStatus.ACTIVE
    ];
    expect(typeof text).toBe("string");
    expect(text).toBe(EXPECTED_TEXT);
  });

  it("hat INACTIVE-Text nicht gesetzt", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ActionStatus.INACTIVE
    ];
    expect(text).toBeUndefined();
  });
});

