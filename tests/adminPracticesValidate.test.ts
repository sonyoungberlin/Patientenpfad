/**
 * Unit-Tests für validateAdminAddMemberInput (Plattform-Admin-Pfad,
 * OWNER ist erlaubt).
 */

import {
  validateAdminAddMemberInput,
  firstAdminAddMemberFieldError,
} from "@/lib/practiceMembers/validateAdminAddInput";

describe("validateAdminAddMemberInput", () => {
  it("akzeptiert OWNER (Plattform-Admin-Werkzeug)", () => {
    const r = validateAdminAddMemberInput({ email: "x@y.de", role: "OWNER" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.role).toBe("OWNER");
  });

  it("akzeptiert ADMIN", () => {
    const r = validateAdminAddMemberInput({ email: "x@y.de", role: "ADMIN" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.role).toBe("ADMIN");
  });

  it("akzeptiert INBOX_ONLY", () => {
    const r = validateAdminAddMemberInput({ email: "x@y.de", role: "INBOX_ONLY" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.role).toBe("INBOX_ONLY");
  });

  it("verwirft USER", () => {
    const r = validateAdminAddMemberInput({ email: "x@y.de", role: "USER" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.role).toBe("USER kann nicht mehr neu vergeben werden.");
    }
  });

  it("normalisiert E-Mail (trim + lowercase)", () => {
    const r = validateAdminAddMemberInput({
      email: "  Foo@Bar.DE ",
      role: "INBOX_ONLY",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email).toBe("foo@bar.de");
  });

  it("lehnt leere E-Mail ab", () => {
    const r = validateAdminAddMemberInput({ email: "", role: "INBOX_ONLY" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBeTruthy();
  });

  it("lehnt ungültige E-Mail ab", () => {
    const r = validateAdminAddMemberInput({
      email: "not-an-email",
      role: "INBOX_ONLY",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBeTruthy();
  });

  it("lehnt zu lange E-Mail ab", () => {
    const r = validateAdminAddMemberInput({
      email: "a".repeat(200) + "@b.de",
      role: "INBOX_ONLY",
    });
    expect(r.ok).toBe(false);
  });

  it("lehnt fehlende Rolle ab", () => {
    const r = validateAdminAddMemberInput({ email: "x@y.de", role: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.role).toBeTruthy();
  });

  it("lehnt unbekannte Rolle ab", () => {
    const r = validateAdminAddMemberInput({
      email: "x@y.de",
      role: "BANANA",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.role).toBe("Ungültige Rolle.");
  });

  it("firstAdminAddMemberFieldError priorisiert email vor role", () => {
    expect(
      firstAdminAddMemberFieldError({ email: "E", role: "R" }),
    ).toBe("E");
    expect(firstAdminAddMemberFieldError({ role: "R" })).toBe("R");
    expect(firstAdminAddMemberFieldError({})).toBe("Eingabe ist ungültig.");
  });
});
