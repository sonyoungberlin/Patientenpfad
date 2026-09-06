import { NextRequest, NextResponse } from "next/server";

const KIOSK_DEVICE_COOKIE = "pp_questionnaire_kiosk_device";
const ALLOWED_PREFIXES = [
  "/questionnaire-kiosk",
  "/api/questionnaire-kiosk",
  "/q/",
  "/api/q/",
  "/_next/",
  "/icons/",
];
const ALLOWED_EXACT = new Set(["/manifest.webmanifest", "/favicon.ico"]);

export function middleware(req: NextRequest) {
  if (!req.cookies.has(KIOSK_DEVICE_COOKIE)) return NextResponse.next();
  const pathname = req.nextUrl.pathname;
  if (ALLOWED_EXACT.has(pathname) || ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const response = NextResponse.next();
    if (pathname.startsWith("/questionnaire-kiosk") || pathname.startsWith("/q/")) {
      response.headers.set("Cache-Control", "no-store");
    }
    return response;
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Kioskgerät darf auf diese API nicht zugreifen." }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/questionnaire-kiosk/lock", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};