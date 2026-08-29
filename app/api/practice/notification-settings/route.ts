/**
 * Notification-Settings der Praxis (Benachrichtigungs-E-Mail).
 *
 * Felder:
 *  - `digital_request_notification_email`    – bei neuer Patientenanfrage
 *  - `office_application_notification_email` – bei neuer Bewerbungsanfrage
 *
 * Berechtigung:
 *  - GET: alle Rollen (OWNER, ADMIN, USER, INBOX_ONLY)
 *  - PUT: nur OWNER und ADMIN
 *
 * Auth-Pattern analog `app/api/practice/signature/route.ts`.
 */

import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";
import { validateNotificationSettings } from "@/lib/practice/validateNotificationSettings";

const ALL_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
  PracticeRole.USER,
  PracticeRole.INBOX_ONLY,
];

const WRITE_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
];

/**
 * GET /api/practice/notification-settings – aktuelle Notification-E-Mails laden.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePracticeRole(req, ALL_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  try {
    const data = await prisma.practice.findUnique({
      where: { id: practice.id },
      select: {
        digital_request_notification_email: true,
        office_application_notification_email: true,
      },
    });
    return NextResponse.json({
      ok: true,
      digitalRequestNotificationEmail:
        data?.digital_request_notification_email ?? null,
      officeApplicationNotificationEmail:
        data?.office_application_notification_email ?? null,
    });
  } catch (err) {
    console.error("[GET /api/practice/notification-settings] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Fehler beim Laden der Einstellungen." },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/practice/notification-settings – Notification-E-Mails speichern.
 */
export async function PUT(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Ungültiger JSON-Body." },
      { status: 400 },
    );
  }

  const { data, error } = validateNotificationSettings(
    body as Record<string, unknown>,
  );
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 422 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Kein bekanntes Feld im Body." },
      { status: 400 },
    );
  }

  try {
    await prisma.practice.update({
      where: { id: practice.id },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/practice/notification-settings] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Einstellungen konnten nicht gespeichert werden." },
      { status: 503 },
    );
  }
}
