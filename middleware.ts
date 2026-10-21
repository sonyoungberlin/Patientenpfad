import { NextRequest, NextResponse } from "next/server";

const KIOSK_DEVICE_COOKIE = "pp_questionnaire_kiosk_device";
const SESSION_COOKIE = "pp_session";
const KIOSK_ACCOUNT_COOKIE = "pp_kiosk_account";
const DEVICE_KIOSK_PREFIXES = [
  "/questionnaire-kiosk",
  "/api/questionnaire-kiosk",
  "/q/",
  "/api/q/",
  "/_next/",
  "/icons/",
];
const ALLOWED_EXACT = new Set([
  "/manifest.webmanifest",
  "/favicon.ico",
  "/api/questionnaire-kiosk-recovery",
]);
const ACCOUNT_KIOSK_COMMON_PREFIXES = ["/_next/", "/icons/"];
const ACCOUNT_KIOSK_COMMON_EXACT = new Set([
  "/manifest.webmanifest",
  "/favicon.ico",
  "/api/auth/logout",
]);

function matchesPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isAccountKioskPath(pathname: string, mode: string): boolean {
  if (
    ACCOUNT_KIOSK_COMMON_EXACT.has(pathname) ||
    ACCOUNT_KIOSK_COMMON_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return true;
  }
  if (pathname === "/questionnaire-kiosk/lock") return true;
  if (mode === "INTERNAL_DOCUMENTATION") {
    return (
      matchesPath(pathname, "/questionnaire-kiosk/internal") ||
      matchesPath(pathname, "/api/questionnaire-kiosk/internal")
    );
  }
  if (mode === "QUESTIONNAIRES") {
    return (
      matchesPath(pathname, "/questionnaire-kiosk/direct") ||
      matchesPath(pathname, "/questionnaire-kiosk/check-in") ||
      pathname.startsWith("/q/") ||
      pathname.startsWith("/api/q/") ||
      matchesPath(pathname, "/api/questionnaire-kiosk/direct") ||
      matchesPath(pathname, "/api/questionnaire-kiosk/check-in")
    );
  }
  return false;
}

function accountKioskStartPath(mode: string): string {
  return mode === "INTERNAL_DOCUMENTATION"
    ? "/questionnaire-kiosk/internal"
    : "/questionnaire-kiosk/direct";
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const accountKioskMode = req.cookies.get(KIOSK_ACCOUNT_COOKIE)?.value;
  if (accountKioskMode) {
    if (pathname === "/questionnaire-kiosk") {
      return NextResponse.redirect(
        new URL(accountKioskStartPath(accountKioskMode), req.url),
      );
    }
    if (isAccountKioskPath(pathname, accountKioskMode)) {
      const response = NextResponse.next();
      if (pathname.startsWith("/questionnaire-kiosk") || pathname.startsWith("/q/")) {
        response.headers.set("Cache-Control", "no-store");
      }
      return response;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Kiosk-Benutzer dürfen auf diese API nicht zugreifen." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(
      new URL(accountKioskStartPath(accountKioskMode), req.url),
    );
  }

  if (!req.cookies.has(KIOSK_DEVICE_COOKIE)) return NextResponse.next();

  // A normal account session takes precedence over a stale device cookie.
  // Logging out restores the independent device-kiosk path.
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (ALLOWED_EXACT.has(pathname) || DEVICE_KIOSK_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
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