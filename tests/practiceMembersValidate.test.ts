/**
 * Phase P4b: Unit-Tests für `validateAddMemberInput`.
 *
 * Stellt sicher, dass:
 *   - E-Mail getrimmt + lowercased wird,
 *   - leere/ungültige E-Mail einen Feldfehler liefert,
 *   - Rolle exakt ADMIN oder USER sein muss,
 *   - "OWNER" explizit verworfen wird (mit dedizierter Meldung),
 *   - unbekannte Rollen einen Feldfehler liefern.
 */

import { validateAddMemberInput } from "@/lib/practiceMembers/validateAddInput";

describe("validateAddMemberInput", () => {
  it("normalisiert E-Mail (trim + lowercase) und akzeptiert USER", () => {
    const r = validateAddMemberInput({ email: "  Foo@Example.COM  ", role: "USER" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("foo@example.com");
      expect(r.value.role).toBe("USER");
    }
  });

  it("akzeptiert ADMIN", () => {
    const r = validateAddMemberInput({ email: "a@b.de", role: "ADMIN" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.role).toBe("ADMIN");
  });

  it("liefert Feldfehler bei fehlender E-Mail", () => {
    const r = validateAddMemberInput({ role: "USER" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBeTruthy();
  });

  it("liefert Feldfehler bei leerer E-Mail (nur Whitespace)", () => {
    const r = validateAddMemberInput({ email: "   ", role: "USER" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBeTruthy();
  });

  it("liefert Feldfehler bei ungültiger E-Mail-Form", () => {
    const r = validateAddMemberInput({ email: "not-an-email", role: "USER" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBe("Ungültige E-Mail.");
  });

  it("liefert Feldfehler bei zu langer E-Mail", () => {
    const long = "a".repeat(200) + "@b.de";
    const r = validateAddMemberInput({ email: long, role: "USER" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBeTruthy();
  });

  it("verwirft OWNER explizit mit dedizierter Meldung", () => {
    const r = validateAddMemberInput({ email: "x@y.de", role: "OWNER" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.role).toBe(
        "OWNER kann in dieser Phase nicht vergeben werden.",
      );
    }
  });

  it("verwirft unbekannte Rollen", () => {
    const r = validateAddMemberInput({ email: "x@y.de", role: "BANANA" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.role).toBe("Ungültige Rolle.");
  });

  it("verwirft fehlende Rolle", () => {
    const r = validateAddMemberInput({ email: "x@y.de" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.role).toBeTruthy();
  });

  it("verwirft Nicht-String-Typen", () => {
    const r = validateAddMemberInput({ email: 123 as unknown, role: 0 as unknown });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.email).toBeTruthy();
      expect(r.fieldErrors.role).toBeTruthy();
    }
  });
});
