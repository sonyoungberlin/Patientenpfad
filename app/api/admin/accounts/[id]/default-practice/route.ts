/**
 * Plattform-Admin: POST /api/admin/accounts/[id]/default-practice
 *
 * Setzt oder löscht `Account.default_practice_id` (Option C, minimal). Das
 * Feld ist eine reine Auswahlhilfe für `current_practice` in
 * `lib/auth.ts`. Es ändert keine Memberships und keine Rollen.
 *
 * Aktionen:
 *   - `action=set`   + `practice_id=<id>`  → setzt Default. Voraussetzung:
 *                                            der Account ist Mitglied dieser
 *                                            Practice. Sonst 409.
 *   - `action=clear`                       → setzt Default auf NULL.
 *
 * Berechtigung: nur Plattform-Admin (`requireAdmin`). Bewusst **kein**
 * Admin-Bypass auf Praxis-Ebene.
 *
 * Sicherheitsgarantien:
 *   - Account-ID kommt **immer** aus dem URL-Segment; Body-Werte werden
 *     ignoriert.
 *   - Bei Validierungs-/Lookup-/Membership-Fehlern wird **keine** Prisma-
 *     Schreiboperation ausgeführt.
 *
 * Antwortmodi (analog zu `/api/admin/practices/[id]/members`):
 *   - `application/json`                  → JSON-Antwort.
 *   - `application/x-www-form-urlencoded` → 303-Redirect auf
 *     `/admin/practices/<redirect_practice_id>` mit `?defaultSet=<email>` /
 *     `?defaultCleared=<email>` / `?error=<msg>`. Fällt auf
 *     `practice_id` (bei action=set) bzw. `/admin/accounts` zurück, falls
 *     kein `redirect_practice_id` mitgegeben wurde.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import {
  firstDefaultPracticeFieldError,
  validateDefaultPracticeInput,
  type RawDefaultPracticeInput,
} from "@/lib/accountDefaultPractice/validateInput";

const IS_DEV = process.env.NODE_ENV === "development";

const ERR_ACCOUNT_NOT_FOUND = "Account nicht gefunden.";
const ERR_NOT_MEMBER = "Account ist kein Mitglied dieser Praxis.";

function isFormSubmit(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

type ParsedInput = {
  raw: RawDefaultPracticeInput;
  redirectPracticeId: string | null;
};

async function readRawInput(req: NextRequest): Promise<ParsedInput | null> {
  if (isFormSubmit(req)) {
    const fd = await req.formData();
    const get = (k: string) =>
      typeof fd.get(k) === "string" ? (fd.get(k) as string) : undefined;
    const redirectPracticeId =
      get("redirect_practice_id") ?? get("practice_id") ?? null;
    return {
      raw: {
        action: get("action"),
        practice_id: get("practice_id"),
      },
      redirectPracticeId: redirectPracticeId ? redirectPracticeId.trim() : null,
    };
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return {
      raw: body as RawDefaultPracticeInput,
      redirectPracticeId: null,
    };
  } catch {
    return null;
  }
}

function redirectAfter(
  req: NextRequest,
  redirectPracticeId: string | null,
  query: { error?: string; defaultSet?: string; defaultCleared?: string },
): NextResponse {
  const target = redirectPracticeId
    ? `/admin/practices/${redirectPracticeId}`
    : `/admin/accounts`;
  const url = new URL(target, req.url);
  if (query.error !== undefined) url.searchParams.set("error", query.error);
  if (query.defaultSet !== undefined)
    url.searchParams.set("defaultSet", query.defaultSet);
  if (query.defaultCleared !== undefined)
    url.searchParams.set("defaultCleared", query.defaultCleared);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1) Auth: nur Plattform-Admin.
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { id: accountId } = await ctx.params;
  const formMode = isFormSubmit(req);

  // 2) Body lesen + validieren.
  const parsed = await readRawInput(req);
  if (parsed === null) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  const result = validateDefaultPracticeInput(parsed.raw);
  if (!result.ok) {
    const msg = firstDefaultPracticeFieldError(result.fieldErrors);
    if (formMode) {
      return redirectAfter(req, parsed.redirectPracticeId, { error: msg });
    }
    return NextResponse.json(
      { ok: false, error: msg, fieldErrors: result.fieldErrors },
      { status: 400 },
    );
  }

  // 3) Account-Existenz prüfen.
  const target = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, email: true },
  });
  if (!target) {
    if (formMode) {
      return redirectAfter(req, parsed.redirectPracticeId, {
        error: ERR_ACCOUNT_NOT_FOUND,
      });
    }
    return NextResponse.json(
      { ok: false, error: ERR_ACCOUNT_NOT_FOUND },
      { status: 404 },
    );
  }

  // 4) Aktion ausführen.
  try {
    if (result.value.action === "set") {
      // Membership-Pflicht: nur Practices, in denen der Account Mitglied ist.
      const membership = await prisma.practiceMembership.findUnique({
        where: {
          account_id_practice_id: {
            account_id: target.id,
            practice_id: result.value.practice_id,
          },
        },
        select: { id: true },
      });
      if (!membership) {
        if (formMode) {
          return redirectAfter(req, parsed.redirectPracticeId, {
            error: ERR_NOT_MEMBER,
          });
        }
        return NextResponse.json(
          { ok: false, error: ERR_NOT_MEMBER },
          { status: 409 },
        );
      }

      await prisma.account.update({
        where: { id: target.id },
        data: { default_practice_id: result.value.practice_id },
      });

      if (formMode) {
        return redirectAfter(req, parsed.redirectPracticeId, {
          defaultSet: target.email,
        });
      }
      return NextResponse.json(
        {
          ok: true,
          account_id: target.id,
          email: target.email,
          default_practice_id: result.value.practice_id,
        },
        { status: 200 },
      );
    }

    // action === "clear"
    await prisma.account.update({
      where: { id: target.id },
      data: { default_practice_id: null },
    });

    if (formMode) {
      return redirectAfter(req, parsed.redirectPracticeId, {
        defaultCleared: target.email,
      });
    }
    return NextResponse.json(
      {
        ok: true,
        account_id: target.id,
        email: target.email,
        default_practice_id: null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("admin set/clear default_practice_id failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          IS_DEV && err instanceof Error
            ? err.message
            : "Standard-Praxis konnte nicht aktualisiert werden.",
      },
      { status: 500 },
    );
  }
}
