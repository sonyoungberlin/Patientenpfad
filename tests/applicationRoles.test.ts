import {
  OFFICE_APPLICATION_ROLES,
  VALID_APPLICATION_ROLES,
  applicationRoleLabel,
} from "@/lib/digitalRequests/applicationRoles";

describe("Öffentliche Bewerbungsarten", () => {
  it("enthält Famulatur und Schülerpraktikum im zentralen Rollen-Katalog", () => {
    expect(OFFICE_APPLICATION_ROLES.FAMULATUR).toBe("Famulatur");
    expect(OFFICE_APPLICATION_ROLES.SCHUELERPRAKTIKUM).toBe("Schülerpraktikum");
    expect(VALID_APPLICATION_ROLES).toEqual(
      new Set(["MFA", "RECEPTION_OFFICE", "PHYSICIAN", "FAMULATUR", "SCHUELERPRAKTIKUM"]),
    );
  });

  it("löst die neuen Rollen im Officepfad zu den sichtbaren Labels auf", () => {
    expect(applicationRoleLabel("FAMULATUR")).toBe("Famulatur");
    expect(applicationRoleLabel("SCHUELERPRAKTIKUM")).toBe("Schülerpraktikum");
  });
});