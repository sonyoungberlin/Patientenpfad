/**
 * @deprecated Umgezogen nach /api/practice/inquiry-settings.
 * GET und PUT liefern 308 Permanent Redirect.
 */

import { NextRequest, NextResponse } from "next/server";

const NEW_URL = "/api/practice/inquiry-settings";

export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL(NEW_URL, req.url), 308);
}

export function PUT(req: NextRequest) {
  return NextResponse.redirect(new URL(NEW_URL, req.url), 308);
}
