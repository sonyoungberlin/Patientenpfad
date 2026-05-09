/**
 * Plattform-Admin: POST /api/admin/practices/[id]
 *
 * Schaltet ein einzelnes Feature-Flag einer `Practice` direkt um.
 *
 * Quelle der Wahrheit: dieser Pfad schreibt **ausschließlich** auf
 * `Practice.*`. Die historischen `Account.*`-Spalten werden bewusst nicht
 * mitgespiegelt — sie sind Übergangs-Legacy. Drift, die in
 * `/admin/accounts` sichtbar wird, wird nicht automatisch repariert.
 *
 * Berechtigung: nur Plattform-Admin (`requireAdmin`). Es gibt **keinen**
 * zusätzlichen Praxis-Membership-Check — das Werkzeug dient zur
 * Korrektur/Zuordnung.
 *
 * Whitelisted Flags:
 *   - `is_approved`
 *   - `inquiry_assistant_enabled`
 *   - `patient_communication_enabled`
 *   - `website_forms_enabled`
 *   - `office_cases_enabled`
 *
 * Unterstützt zwei Content-Types — analog zu `/api/admin/accounts`:
 *   - `application/json`                  → JSON-Antwort `{ ok, practice }`
 *   - `application/x-www-form-urlencoded` → 303-Redirect auf
 *                                           `/admin/practices/[id]?toggled=<flag>`
 *                                           bzw. `?error=<msg>`
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

const FLAG_WHITELIST = [
  "is_approved",
  "inquiry_assistant_enabled",
  "patient_communication_enabled",
  "website_forms_enabled",
  "office_cases_enabled",
] as const;
type Flag = (typeof FLAG_WHITELIST)[number];

function isFlag(v: unknown): v is Flag {
  return typeof v === "string" && (FLAG_WHITELIST as readonly string[]).includes(v);
}

function isFormSubmit(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

type Parsed = { flag?: unknown; value?: unknown };

async function readInput(req: NextRequest): Promise<Parsed | null> {
  if (isFormSubmit(req)) {
    const fd = await req.formData();
    return {
      flag: typeof fd.get("flag") === "string" ? (fd.get("flag") as string) : undefined,
      value:
        typeof fd.get("value") === "string"
          ? (fd.get("value") as string)
          : undefined,
    };
  }
  try {
    return (await req.json()) as Parsed;
  } catch {
    return null;
  }
}

function redirectToDetail(
  req: NextRequest,
  id: string,
  query: { error?: string; toggled?: string },
): NextResponse {
  const url = new URL(`/admin/practices/${id}`, req.url);
  if (query.error !== undefined) url.searchParams.set("error", query.error);
  if (query.toggled !== undefined) url.searchParams.set("toggled", query.toggled);
  return NextResponse.redirect(url, 303);
}

function parseBoolValue(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1) Auth: nur Plattform-Admin.
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const formMode = isFormSubmit(req);

  // 2) Eingabe lesen + validieren. Bei Fehlern keine Prisma-Operation.
  const raw = await readInput(req);
  if (raw === null) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  if (!isFlag(raw.flag)) {
    if (formMode) {
      return redirectToDetail(req, id, { error: "Ungültiges Flag." });
    }
    return NextResponse.json(
      { ok: false, error: "Ungültiges Flag." },
      { status: 400 },
    );
  }
  const flag: Flag = raw.flag;

  const value = parseBoolValue(raw.value);
  if (value === null) {
    if (formMode) {
      return redirectToDetail(req, id, { error: "Ungültiger Wert." });
    }
    return NextResponse.json(
      { ok: false, error: "Ungültiger Wert." },
      { status: 400 },
    );
  }

  // 3) Direkt auf Practice schreiben — keine Account-Spiegelung.
  try {
    const updated = await prisma.practice.update({
      where: { id },
      data: { [flag]: value },
      select: {
        id: true,
        is_approved: true,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: true,
        website_forms_enabled: true,
        office_cases_enabled: true,
      },
    });

    if (formMode) {
      return redirectToDetail(req, id, { toggled: flag });
    }
    return NextResponse.json({ ok: true, practice: updated });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      if (formMode) {
        return redirectToDetail(req, id, {
          error: "Practice nicht gefunden.",
        });
      }
      return NextResponse.json(
        { ok: false, error: "Practice nicht gefunden." },
        { status: 404 },
      );
    }
    console.error("admin practice toggle failed", err);
    return NextResponse.json(
      { ok: false, error: "Flag konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}
