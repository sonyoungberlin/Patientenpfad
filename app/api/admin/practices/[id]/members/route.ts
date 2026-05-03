/**
 * Plattform-Admin: POST /api/admin/practices/[id]/members
 *
 * Fügt einen **bestehenden** Account per E-Mail zu einer beliebigen Practice
 * hinzu. Berechtigung: nur Plattform-Admin (`requireAdmin`). Es gibt keinen
 * Praxis-Membership-Check — das ist Teil des Werkzeugs.
 *
 * Im Unterschied zum Praxis-eigenen Pfad (`/api/practice/members`) darf
 * hier auch die Rolle `OWNER` vergeben werden, da das Admin-Werkzeug der
 * Korrektur/Zuordnung dient.
 *
 * Scope:
 *   - Nur bestehende Accounts. Kein Account-Anlegen, keine Einladungs-Mail,
 *     kein SMTP, keine Schemaänderung.
 *   - Keine Rollenänderung bestehender Mitglieder, kein Entfernen.
 *
 * Sicherheitsgarantien:
 *   - `practice_id` wird **immer** aus dem URL-Segment genommen; Body-Werte
 *     werden ignoriert.
 *   - Bei Validierungs-/Lookup-Fehlern wird **keine** Prisma-Schreib-
 *     Operation ausgeführt.
 *   - Eindeutigkeitskonflikte (`@@unique([account_id, practice_id])`) →
 *     409.
 *
 * Unterstützt zwei Content-Types — analog zu `/api/practice/members`:
 *   - `application/json`                  → JSON-Antwort (`201` bei Erfolg)
 *   - `application/x-www-form-urlencoded` → 303-Redirect auf
 *                                           `/admin/practices/[id]?added=<email>`
 *                                           bzw. `?error=<msg>`
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import {
  firstAdminAddMemberFieldError,
  validateAdminAddMemberInput,
  type RawAdminAddMemberInput,
} from "@/lib/practiceMembers/validateAdminAddInput";

const IS_DEV = process.env.NODE_ENV === "development";

const ERR_PRACTICE_NOT_FOUND = "Practice nicht gefunden.";
const ERR_ACCOUNT_NOT_FOUND = "Kein Account mit dieser E-Mail vorhanden.";
const ERR_ALREADY_MEMBER = "Account ist bereits Mitglied dieser Praxis.";

function isFormSubmit(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

async function readRawInput(
  req: NextRequest,
): Promise<RawAdminAddMemberInput | null> {
  if (isFormSubmit(req)) {
    const fd = await req.formData();
    return {
      email:
        typeof fd.get("email") === "string"
          ? (fd.get("email") as string)
          : undefined,
      role:
        typeof fd.get("role") === "string"
          ? (fd.get("role") as string)
          : undefined,
    };
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return body as RawAdminAddMemberInput;
  } catch {
    return null;
  }
}

function redirectToDetail(
  req: NextRequest,
  id: string,
  query: { error?: string; added?: string },
): NextResponse {
  const url = new URL(`/admin/practices/${id}`, req.url);
  if (query.error !== undefined) url.searchParams.set("error", query.error);
  if (query.added !== undefined) url.searchParams.set("added", query.added);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1) Auth: nur Plattform-Admin.
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { id: practiceId } = await ctx.params;
  const formMode = isFormSubmit(req);

  // 2) Body lesen + validieren.
  const raw = await readRawInput(req);
  if (raw === null) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  const result = validateAdminAddMemberInput(raw);
  if (!result.ok) {
    if (formMode) {
      return redirectToDetail(req, practiceId, {
        error: firstAdminAddMemberFieldError(result.fieldErrors),
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: firstAdminAddMemberFieldError(result.fieldErrors),
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  // 3) Practice-Existenz prüfen.
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { id: true },
  });
  if (!practice) {
    if (formMode) {
      return redirectToDetail(req, practiceId, {
        error: ERR_PRACTICE_NOT_FOUND,
      });
    }
    return NextResponse.json(
      { ok: false, error: ERR_PRACTICE_NOT_FOUND },
      { status: 404 },
    );
  }

  // 4) Account-Existenz prüfen — kein Account-Create, keine Einladung.
  const target = await prisma.account.findUnique({
    where: { email: result.value.email },
    select: { id: true, email: true },
  });
  if (!target) {
    if (formMode) {
      return redirectToDetail(req, practiceId, {
        error: ERR_ACCOUNT_NOT_FOUND,
      });
    }
    return NextResponse.json(
      { ok: false, error: ERR_ACCOUNT_NOT_FOUND },
      { status: 404 },
    );
  }

  // 5) Schreiben.
  try {
    const created = await prisma.practiceMembership.create({
      data: {
        account_id: target.id,
        practice_id: practiceId,
        role: result.value.role,
      },
      select: { id: true, account_id: true, role: true },
    });

    if (formMode) {
      return redirectToDetail(req, practiceId, { added: target.email });
    }
    return NextResponse.json(
      {
        ok: true,
        membership: {
          id: created.id,
          account_id: created.account_id,
          email: target.email,
          role: created.role,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      if (formMode) {
        return redirectToDetail(req, practiceId, {
          error: ERR_ALREADY_MEMBER,
        });
      }
      return NextResponse.json(
        { ok: false, error: ERR_ALREADY_MEMBER },
        { status: 409 },
      );
    }
    console.error("admin practice members add failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          IS_DEV && err instanceof Error
            ? err.message
            : "Mitglied konnte nicht hinzugefügt werden.",
      },
      { status: 500 },
    );
  }
}
