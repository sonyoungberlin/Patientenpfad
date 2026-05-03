/**
 * Phase 3d: Tests für lib/websiteForms/submitValidation.ts und emailHash.ts.
 */

import {
  HONEYPOT_FIELD_NAME,
  isHoneypotTriggered,
  MAX_EMAIL_LENGTH,
  normalizeEmail,
  validateSubmitterEmail,
} from "@/lib/websiteForms/submitValidation";
import { hashSubmitterEmail } from "@/lib/websiteForms/emailHash";

describe("submitValidation.normalizeEmail", () => {
  it("trimmt und lowercased", () => {
    expect(normalizeEmail("  P@Example.COM  ")).toBe("p@example.com");
  });

  it("liefert null für leere/falsche Eingaben", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(123)).toBeNull();
  });
});

describe("submitValidation.validateSubmitterEmail", () => {
  it("akzeptiert gültige Adresse", () => {
    const r = validateSubmitterEmail("p@example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe("p@example.com");
  });

  it("missing_email für Leeres", () => {
    const r = validateSubmitterEmail("");
    expect(r).toEqual({ ok: false, error: "missing_email" });
  });

  it("invalid_email für Müll", () => {
    expect(validateSubmitterEmail("not-an-email").ok).toBe(false);
    expect(validateSubmitterEmail("a@b").ok).toBe(false);
    expect(validateSubmitterEmail("a@b.").ok).toBe(false);
  });

  it("email_too_long bei > MAX_EMAIL_LENGTH", () => {
    const long = "a".repeat(MAX_EMAIL_LENGTH) + "@x.de";
    const r = validateSubmitterEmail(long);
    expect(r).toEqual({ ok: false, error: "email_too_long" });
  });
});

describe("submitValidation.isHoneypotTriggered", () => {
  it("false für leer/whitespace/nicht-string", () => {
    expect(isHoneypotTriggered("")).toBe(false);
    expect(isHoneypotTriggered("   ")).toBe(false);
    expect(isHoneypotTriggered(undefined)).toBe(false);
    expect(isHoneypotTriggered(null)).toBe(false);
    expect(isHoneypotTriggered(0)).toBe(false);
  });

  it("true für irgendeinen ausgefüllten String", () => {
    expect(isHoneypotTriggered("https://spam.example")).toBe(true);
    expect(isHoneypotTriggered("x")).toBe(true);
  });
});

describe("HONEYPOT_FIELD_NAME ist stabil", () => {
  it("bleibt 'company_website'", () => {
    // Der Form-View und der Endpoint MÜSSEN denselben Namen verwenden.
    expect(HONEYPOT_FIELD_NAME).toBe("company_website");
  });
});

describe("emailHash.hashSubmitterEmail", () => {
  it("ist deterministisch und normalisiert (trim+lowercase)", () => {
    const a = hashSubmitterEmail("p@example.com");
    const b = hashSubmitterEmail("  P@Example.COM  ");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("unterschiedliche Adressen → unterschiedliche Hashes", () => {
    expect(hashSubmitterEmail("a@example.com")).not.toBe(
      hashSubmitterEmail("b@example.com"),
    );
  });
});
