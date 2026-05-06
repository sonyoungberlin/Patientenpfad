import {
  applyLabCheckpointCoupling,
  LAB_TEXT_TO_CONTROL_COUPLING,
} from "@/lib/inquiries/labCheckpointCoupling";

describe("applyLabCheckpointCoupling", () => {
  it("setzt LAB_INTERNAL_ORDER=YES wenn LAB_INTERNAL_ORDER_AVAILABLE=YES gesetzt wird", () => {
    const next = applyLabCheckpointCoupling({}, "LAB_INTERNAL_ORDER_AVAILABLE", "YES");
    expect(next.LAB_INTERNAL_ORDER_AVAILABLE).toBe("YES");
    expect(next.LAB_INTERNAL_ORDER).toBe("YES");
  });

  it("setzt LAB_INTERNAL_ORDER=NO wenn LAB_INTERNAL_ORDER_MISSING=YES gesetzt wird", () => {
    const next = applyLabCheckpointCoupling({}, "LAB_INTERNAL_ORDER_MISSING", "YES");
    expect(next.LAB_INTERNAL_ORDER_MISSING).toBe("YES");
    expect(next.LAB_INTERNAL_ORDER).toBe("NO");
  });

  it("setzt LAB_EXTERNAL_REFERRAL=YES wenn LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED=YES gesetzt wird", () => {
    const next = applyLabCheckpointCoupling(
      {},
      "LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED",
      "YES",
    );
    expect(next.LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED).toBe("YES");
    expect(next.LAB_EXTERNAL_REFERRAL).toBe("YES");
  });

  it("ändert den Steuer-Checkpoint NICHT, wenn der Text-Checkpoint auf NO gesetzt wird", () => {
    const prev = { LAB_INTERNAL_ORDER: "YES" };
    const next = applyLabCheckpointCoupling(prev, "LAB_INTERNAL_ORDER_AVAILABLE", "NO");
    expect(next.LAB_INTERNAL_ORDER_AVAILABLE).toBe("NO");
    // Steuer-Checkpoint bleibt unverändert (manuelle Korrektur möglich).
    expect(next.LAB_INTERNAL_ORDER).toBe("YES");
  });

  it("lässt unbeteiligte Checkpoints unverändert", () => {
    const prev = {
      SOME_OTHER: "ACTIVE",
      LAB_CHECKUP_RULES: "YES",
    };
    const next = applyLabCheckpointCoupling(prev, "LAB_INTERNAL_ORDER_AVAILABLE", "YES");
    expect(next.SOME_OTHER).toBe("ACTIVE");
    expect(next.LAB_CHECKUP_RULES).toBe("YES");
    expect(next.LAB_INTERNAL_ORDER).toBe("YES");
  });

  it("mutiert das übergebene Statuses-Objekt nicht", () => {
    const prev: Record<string, string> = {};
    const next = applyLabCheckpointCoupling(prev, "LAB_INTERNAL_ORDER_AVAILABLE", "YES");
    expect(prev).toEqual({});
    expect(next).not.toBe(prev);
  });

  it("hat genau drei Kopplungsregeln (Schutz vor versehentlicher Erweiterung)", () => {
    expect(LAB_TEXT_TO_CONTROL_COUPLING).toHaveLength(3);
  });

  it("ist no-op für Checkpoints außerhalb des Mappings", () => {
    const next = applyLabCheckpointCoupling({}, "LAB_CHECKUP_RULES", "YES");
    expect(next).toEqual({ LAB_CHECKUP_RULES: "YES" });
  });
});
