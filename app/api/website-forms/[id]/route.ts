/**
 * Phase 3b: POST /api/website-forms/[id]
 *
 * Aktualisiert ein bestehendes `PracticeQuestionnaireForm` des eingeloggten
 * Praxis-Accounts. Doppeltes Feature-Gate via
 * `requireWebsiteFormsManagementAccess`. Eigentum wird strikt durchgesetzt:
 * fremde IDs liefern `404` (nicht `403`), damit IDs nicht enumeriert werden
 * können.
 *
 * Zwei Aktionen:
 *   - `action: "toggle_active"` — flippt `is_active`, ignoriert alle anderen
 *     Felder. Praktisch für ein kleines „Aktiv/Inaktiv"-Mini-Form.
 *   - sonst: vollständige Aktualisierung (Titel/Slug/Intro/Blöcke/is_active)
 *     mit denselben Validierungsregeln wie beim Anlegen.
 *
 * In Phase 3b gibt es bewusst **kein DELETE**, um FK-/Restrict-Themen zu
 * vermeiden (siehe `PatientQuestionnaireSession.practice_form_id`
 * `onDelete: Restrict`).
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma, PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requirePracticeRole,
  requireWebsiteFormsManagementAccess,
} from "@/lib/authz";
import {
  firstFieldError,
  validateWebsiteFormInput,
  type RawWebsiteFormInput,
} from "@/lib/websiteForms/validateForm";
import { ownsForm } from "@/lib/websiteForms/practiceScope";

const IS_DEV = process.env.NODE_ENV === "development";

function isFormSubmit(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data");
}

type ParsedInput = {
  action?: string;
  raw: RawWebsiteFormInput;
};

async function readInput(req: NextRequest): Promise<ParsedInput | null> {
  if (isFormSubmit(req)) {
    const fd = await req.formData();
    const rawAction = fd.get("action");
    return {
      action: typeof rawAction === "string" ? rawAction : undefined,
      raw: {
        title: typeof fd.get("title") === "string" ? (fd.get("title") as string) : undefined,
        slug: typeof fd.get("slug") === "string" ? (fd.get("slug") as string) : undefined,
        intro_text:
          typeof fd.get("intro_text") === "string"
            ? (fd.get("intro_text") as string)
            : undefined,
        selected_block_ids: fd.getAll("selected_block_ids").filter(
          (v): v is string => typeof v === "string",
        ),
        is_active:
          typeof fd.get("is_active") === "string"
            ? (fd.get("is_active") as string)
            : undefined,
      },
    };
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : undefined;
    return { action, raw: body as RawWebsiteFormInput };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireWebsiteFormsManagementAccess(req);
  if (error) return error;

  // P4a: Zusätzlich zur Feature-Flag-Prüfung wird die Praxis-Rolle gegated.
  // Nur OWNER/ADMIN dürfen Website-Formulare verwalten; USER bekommt 403.
  // Kein Plattform-Admin-Bypass.
  const role = await requirePracticeRole(req, [
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (role.error) return role.error;

  const { id } = await ctx.params;
  const formMode = isFormSubmit(req);

  // Eigentum prüfen — bei fremder/unbekannter ID 404.
  const existing = await prisma.practiceQuestionnaireForm.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      is_active: true,
    },
  });
  if (!existing || !ownsForm(account, existing)) {
    return NextResponse.json(
      { ok: false, error: "Website-Formular nicht gefunden." },
      { status: 404 },
    );
  }

  const parsed = await readInput(req);
  if (parsed === null) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  // ---- Toggle-Pfad ----
  if (parsed.action === "toggle_active") {
    await prisma.practiceQuestionnaireForm.update({
      where: { id },
      data: { is_active: !existing.is_active },
    });
    if (formMode) {
      return NextResponse.redirect(
        new URL(`/website-forms/${id}`, req.url),
        303,
      );
    }
    return NextResponse.json({ ok: true, is_active: !existing.is_active });
  }

  // ---- Voll-Update ----
  const result = validateWebsiteFormInput(parsed.raw);
  if (!result.ok) {
    if (formMode) {
      const msg = encodeURIComponent(firstFieldError(result.fieldErrors));
      return NextResponse.redirect(
        new URL(`/website-forms/${id}?error=${msg}`, req.url),
        303,
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: firstFieldError(result.fieldErrors),
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await prisma.practiceQuestionnaireForm.update({
      where: { id },
      data: {
        title: result.value.title,
        slug: result.value.slug,
        intro_text: result.value.intro_text,
        selected_block_ids: result.value.selected_block_ids as Prisma.InputJsonValue,
        is_active: result.value.is_active,
      },
    });

    if (formMode) {
      return NextResponse.redirect(
        new URL(`/website-forms/${id}`, req.url),
        303,
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const message = "Slug bereits vergeben.";
      if (formMode) {
        return NextResponse.redirect(
          new URL(
            `/website-forms/${id}?error=${encodeURIComponent(message)}`,
            req.url,
          ),
          303,
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: message,
          fieldErrors: { slug: message },
        },
        { status: 409 },
      );
    }
    console.error("website-forms update failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: IS_DEV && err instanceof Error
          ? err.message
          : "Website-Formular konnte nicht aktualisiert werden.",
      },
      { status: 500 },
    );
  }
}
