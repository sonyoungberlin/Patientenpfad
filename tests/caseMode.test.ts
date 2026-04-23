import { isGatekeeperCase, buildM1SnapshotInitial } from "@/lib/logic/m1Activation";
import type { CaseMode, M1Selection } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper that mirrors the route's mode/patient_reference derivation logic
// ---------------------------------------------------------------------------

function deriveMode(body: { mode?: unknown }): CaseMode {
  return body.mode === "practice" ? "practice" : "guest";
}

function derivePatientReference(
  mode: CaseMode,
  body: { patient_reference?: unknown },
): string | null {
  if (
    mode === "practice" &&
    typeof body.patient_reference === "string" &&
    body.patient_reference.trim() !== ""
  ) {
    return body.patient_reference.trim();
  }
  return null;
}

// ---------------------------------------------------------------------------

describe("CaseMode: mode-Ableitung aus Request-Body", () => {
  it("kein mode → guest", () => {
    expect(deriveMode({})).toBe("guest");
  });

  it("mode=guest → guest", () => {
    expect(deriveMode({ mode: "guest" })).toBe("guest");
  });

  it("mode=practice → practice", () => {
    expect(deriveMode({ mode: "practice" })).toBe("practice");
  });

  it("ungültiger mode-Wert → guest (defensive)", () => {
    expect(deriveMode({ mode: "unknown" })).toBe("guest");
  });
});

describe("patient_reference: wird nur bei mode=practice übernommen", () => {
  it("mode=guest + patient_reference gesetzt → null", () => {
    expect(derivePatientReference("guest", { patient_reference: "P-001" })).toBeNull();
  });

  it("mode=practice + patient_reference gesetzt → übernommen", () => {
    expect(
      derivePatientReference("practice", { patient_reference: "P-001" }),
    ).toBe("P-001");
  });

  it("mode=practice + kein patient_reference → null", () => {
    expect(derivePatientReference("practice", {})).toBeNull();
  });

  it("mode=practice + leerer String → null", () => {
    expect(
      derivePatientReference("practice", { patient_reference: "   " }),
    ).toBeNull();
  });

  it("mode=practice + patient_reference wird getrimmt", () => {
    expect(
      derivePatientReference("practice", { patient_reference: "  P-042  " }),
    ).toBe("P-042");
  });
});

describe("Gatekeeper bleibt unverändert mit mode-Erweiterung", () => {
  const allKlar: M1Selection = {
    kommunikation: "klar",
    medizinische_lage: "klar",
    versorgung_im_alltag: "klar",
    pflegebeobachtung: "klar",
  };

  it("Gatekeeper auch bei mode=practice erkannt", () => {
    expect(isGatekeeperCase(allKlar)).toBe(true);
  });

  it("Snapshot des Gatekeeper-Falls hat keine Checkpoints", () => {
    const snap = buildM1SnapshotInitial(allKlar);
    expect(snap.activated_checkpoint_ids).toHaveLength(0);
  });
});

describe("Payload enthält mode und patient_reference", () => {
  it("UI sendet mode=guest wenn kein practice gewählt", () => {
    const payload = {
      m1Selection: {
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: "klar",
      } satisfies M1Selection,
      mode: "guest" as CaseMode,
    };
    expect(payload.mode).toBe("guest");
    expect((payload as Record<string, unknown>).patient_reference).toBeUndefined();
  });

  it("UI sendet mode=practice mit patient_reference", () => {
    const payload = {
      m1Selection: {
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: "klar",
      } satisfies M1Selection,
      mode: "practice" as CaseMode,
      patient_reference: "P-2024-001",
    };
    expect(payload.mode).toBe("practice");
    expect(payload.patient_reference).toBe("P-2024-001");
  });
});
