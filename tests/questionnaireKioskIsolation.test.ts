import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function request(path: string, cookies?: string) {
  return new NextRequest(`http://localhost${path}`, { headers: cookies ? { cookie: cookies } : undefined });
}

describe("Questionnaire Kiosk Route-Isolation", () => {
  it.each([
    "/dashboard",
    "/questionnaires",
    "/inquiries/one",
    "/digital-requests/one",
    "/cases/one",
    "/workflow-cases/one",
    "/office-cases/one",
    "/practice/members",
    "/website-forms/one",
    "/admin/accounts",
  ])("lässt normale App-Seiten bei vorhandenem Account-Login erreichbar", (path) => {
    const response = middleware(request(path, "pp_session=valid-account; pp_questionnaire_kiosk_device=device"));
    expect(response.status).toBe(200);
  });

  it.each([
    "/api/auth/me",
    "/api/questionnaire/one/pdf",
    "/api/questionnaire/one/restore",
    "/api/inquiries/one",
    "/api/practice/members",
    "/api/admin/accounts",
  ])("lässt normale APIs bei vorhandenem Account-Login zur serverseitigen Autorisierung durch", (path) => {
    const response = middleware(request(path, "pp_session=valid-account; pp_questionnaire_kiosk_device=device"));
    expect(response.status).toBe(200);
  });

  it.each(["/questionnaire-kiosk/lock", "/questionnaire-kiosk/direct", "/api/questionnaire-kiosk/direct", "/api/questionnaire-kiosk/check-in", "/q/token", "/api/q/token"])("lässt den Geräte-Kiosk-Pfad %s zu", (path) => {
    expect(middleware(request(path, "pp_questionnaire_kiosk_device=device")).status).toBe(200);
  });

  it("lässt den Geräte-Recovery-Pfad passieren", () => {
    expect(middleware(request("/api/questionnaire-kiosk-recovery", "pp_questionnaire_kiosk_device=device")).status).toBe(200);
    expect(middleware(request("/api/auth/login", "pp_questionnaire_kiosk_device=device")).status).toBe(200);
    expect(middleware(request("/api/practice/questionnaire-kiosk-devices", "pp_questionnaire_kiosk_device=device")).status).toBe(403);
  });

  it("isoliert einen internen Dokumentations-Account-Kiosk von der normalen App", () => {
    const cookies = "pp_session=account-session; pp_kiosk_account=INTERNAL_DOCUMENTATION; pp_questionnaire_kiosk_device=stale-device";
    expect(middleware(request("/questionnaire-kiosk/internal", cookies)).status).toBe(200);
    expect(middleware(request("/api/questionnaire-kiosk/internal/templates", cookies)).status).toBe(200);
    expect(middleware(request("/questionnaire-kiosk/direct", cookies)).headers.get("location"))
      .toBe("http://localhost/questionnaire-kiosk/internal");
    expect(middleware(request("/dashboard", cookies)).headers.get("location"))
      .toBe("http://localhost/questionnaire-kiosk/internal");
    expect(middleware(request("/api/auth/logout", cookies)).status).toBe(200);
    expect(middleware(request("/api/practice/members", cookies)).status).toBe(403);
  });

  it("ermöglicht KIOSK → Mini → KIOSK im selben Browser trotz altem Geräte-Cookie", () => {
    const staleDevice = "pp_questionnaire_kiosk_device=legacy-device";
    const kioskSession = `pp_session=kiosk-session; pp_kiosk_account=INTERNAL_DOCUMENTATION; ${staleDevice}`;
    expect(middleware(request("/questionnaire-kiosk/internal", kioskSession)).status).toBe(200);
    expect(middleware(request("/api/auth/logout", kioskSession)).status).toBe(200);

    const miniSession = `pp_session=mini-session; ${staleDevice}`;
    expect(middleware(request("/questionnaires", miniSession)).status).toBe(200);
    expect(middleware(request("/api/auth/logout", miniSession)).status).toBe(200);

    expect(middleware(request("/login", staleDevice)).status).toBe(200);
    expect(middleware(request("/api/auth/login", staleDevice)).status).toBe(200);

    const renewedKioskSession = `pp_session=kiosk-session-2; pp_kiosk_account=INTERNAL_DOCUMENTATION; ${staleDevice}`;
    expect(middleware(request("/questionnaire-kiosk/internal", renewedKioskSession)).status).toBe(200);
    expect(middleware(request("/dashboard", renewedKioskSession)).headers.get("location"))
      .toBe("http://localhost/questionnaire-kiosk/internal");
  });

  it("erlaubt im Fragebogen-Kiosk nur die benötigten öffentlichen Formular-APIs", () => {
    const cookies = "pp_session=account-session; pp_kiosk_account=QUESTIONNAIRES";
    expect(middleware(request("/questionnaire-kiosk/direct", cookies)).status).toBe(200);
    expect(middleware(request("/api/questionnaire-kiosk/check-in", cookies)).status).toBe(200);
    expect(middleware(request("/q/token", cookies)).status).toBe(200);
    expect(middleware(request("/api/q/token", cookies)).status).toBe(200);
    expect(middleware(request("/api/questionnaire/session-id", cookies)).status).toBe(403);
    expect(middleware(request("/api/questionnaire/session-id/pdf", cookies)).status).toBe(403);
    expect(middleware(request("/api/questionnaires", cookies)).status).toBe(403);
    expect(middleware(request("/questionnaires", cookies)).headers.get("location"))
      .toBe("http://localhost/questionnaire-kiosk/direct");
  });

  it("verändert normale Browser ohne Kiosk-Cookie nicht", () => {
    expect(middleware(request("/dashboard", "pp_session=valid-account")).status).toBe(200);
  });
});