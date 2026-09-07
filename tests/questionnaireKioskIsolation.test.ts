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
  ])("leitet die normale Seite %s trotz zusätzlichem Account-Cookie zum Lock um", (path) => {
    const response = middleware(request(path, "pp_session=valid-account; pp_questionnaire_kiosk_device=device"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/questionnaire-kiosk/lock");
  });

  it.each([
    "/api/auth/me",
    "/api/questionnaire/one/pdf",
    "/api/questionnaire/one/restore",
    "/api/inquiries/one",
    "/api/practice/members",
    "/api/admin/accounts",
  ])("blockiert die normale API %s trotz zusätzlichem Account-Cookie", (path) => {
    const response = middleware(request(path, "pp_session=valid-account; pp_questionnaire_kiosk_device=device"));
    expect(response.status).toBe(403);
  });

  it.each(["/questionnaire-kiosk/lock", "/questionnaire-kiosk/direct", "/api/questionnaire-kiosk/direct", "/q/token", "/api/q/token"])("lässt den erforderlichen Kiosk-Pfad %s zu", (path) => {
    expect(middleware(request(path, "pp_questionnaire_kiosk_device=device")).status).toBe(200);
  });

  it("lässt ausschließlich den dedizierten Recovery-Pfad aus den normalen APIs passieren", () => {
    expect(middleware(request("/api/questionnaire-kiosk-recovery", "pp_questionnaire_kiosk_device=device")).status).toBe(200);
    expect(middleware(request("/api/auth/login", "pp_questionnaire_kiosk_device=device")).status).toBe(403);
    expect(middleware(request("/api/practice/questionnaire-kiosk-devices", "pp_questionnaire_kiosk_device=device")).status).toBe(403);
  });

  it("verändert normale Browser ohne Kiosk-Cookie nicht", () => {
    expect(middleware(request("/dashboard", "pp_session=valid-account")).status).toBe(200);
  });
});