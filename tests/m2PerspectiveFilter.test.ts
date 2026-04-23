import {
  CHECKPOINT_CATALOGUE,
  MULTI_SELECT_CATALOGUE,
} from "@/lib/logic/checkpointCatalog";
import { CheckpointPerspective } from "@/lib/types";

/**
 * Hilfsfunktion: entspricht der perspectives-Filterlogik in M2PrefillClient
 * und M2TokenFormClient.
 */
function hasPerspective(
  id: string,
  perspective: CheckpointPerspective,
): boolean {
  const entry = CHECKPOINT_CATALOGUE[id] ?? MULTI_SELECT_CATALOGUE[id];
  if (!entry) return false;
  return entry.perspectives.includes(perspective);
}

describe("M2 perspectives-Filterlogik", () => {
  describe("K09 (Mitwirkung)", () => {
    it("erscheint im MFA-Modus (perspectives enthält MFA)", () => {
      expect(hasPerspective("K09", CheckpointPerspective.MFA)).toBe(true);
    });

    it("erscheint NICHT im PATIENT-Modus (perspectives enthält kein PATIENT)", () => {
      expect(hasPerspective("K09", CheckpointPerspective.PATIENT)).toBe(false);
    });
  });

  describe("K12 (Alltagssituation / Pflegeeinschätzung)", () => {
    it("erscheint im PATIENT-Modus (perspectives enthält PATIENT)", () => {
      expect(hasPerspective("K12", CheckpointPerspective.PATIENT)).toBe(true);
    });

    it("erscheint NICHT im MFA-Modus (perspectives enthält kein MFA)", () => {
      expect(hasPerspective("K12", CheckpointPerspective.MFA)).toBe(false);
    });
  });

  describe("K10 (Besonderer Versorgungsaufwand)", () => {
    it("erscheint NICHT im MFA-Modus", () => {
      expect(hasPerspective("K10", CheckpointPerspective.MFA)).toBe(false);
    });

    it("erscheint NICHT im PATIENT-Modus", () => {
      expect(hasPerspective("K10", CheckpointPerspective.PATIENT)).toBe(false);
    });
  });

  describe("K11 (Formularanliegen)", () => {
    it("erscheint NICHT im MFA-Modus", () => {
      expect(hasPerspective("K11", CheckpointPerspective.MFA)).toBe(false);
    });

    it("erscheint NICHT im PATIENT-Modus", () => {
      expect(hasPerspective("K11", CheckpointPerspective.PATIENT)).toBe(false);
    });
  });
});
