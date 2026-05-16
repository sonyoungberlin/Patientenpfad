import {
  AUTHORITIES,
  getAuthority,
  isAuthorityId,
  listAuthorities,
  type AuthorityId,
} from "@/lib/office/authorities";
import { isLegalSourceId } from "@/lib/office/legalSources";

describe("authorities registry", () => {
  it("alle IDs sind eindeutig", () => {
    const ids = AUTHORITIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDs enthalten keine Sonderzeichen", () => {
    for (const entry of AUTHORITIES) {
      expect(entry.id).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("listAuthorities liefert nichtleere Liste", () => {
    expect(listAuthorities().length).toBeGreaterThan(0);
  });

  it("isAuthorityId und getAuthority sind konsistent", () => {
    for (const entry of AUTHORITIES) {
      expect(isAuthorityId(entry.id)).toBe(true);
      expect(getAuthority(entry.id as AuthorityId).id).toBe(entry.id);
    }
    expect(isAuthorityId("DOES_NOT_EXIST")).toBe(false);
  });

  it("legalBasis verweist nur auf bekannte LegalSourceIds", () => {
    for (const entry of AUTHORITIES) {
      for (const ref of entry.legalBasis ?? []) {
        expect(isLegalSourceId(ref)).toBe(true);
      }
    }
  });

  it("Berliner Datenschutzaufsicht ist als BERLIN_DATENSCHUTZBEAUFTRAGTE registriert (kein BfDI)", () => {
    expect(isAuthorityId("BERLIN_DATENSCHUTZBEAUFTRAGTE")).toBe(true);
    expect(isAuthorityId("BLN_BFDI")).toBe(false);
    expect(isAuthorityId("BFDI")).toBe(false);
  });
});
