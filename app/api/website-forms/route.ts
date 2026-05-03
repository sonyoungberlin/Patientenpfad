/**
 * Phase 3b: POST /api/website-forms
 *
 * Legt einen neuen Eintrag `PracticeQuestionnaireForm` für den eingeloggten
 * Praxis-Account an. Doppeltes Feature-Gate via
 * `requireWebsiteFormsManagementAccess` (`patient_communication_enabled` +
 * `website_forms_enabled`, kein Admin-Bypass).
 *
 * Unterstützt zwei Content-Types — analog zu `/api/admin/accounts`:
 *   - `application/json`                   → JSON-Antwort `{ ok, id, slug }`
 *   - `application/x-www-form-urlencoded`  → `303`-Redirect auf
 *                                            `/website-forms/[id]`
 *
 * Wichtige Eigenschaften:
 *   - `owner_account_id` wird **immer** aus der Session gesetzt; Werte aus
 *     dem Body werden ignoriert.
 *   - Slug-Kollisionen (Prisma `P2002`) werden zu `409` mit klarer Meldung.
 *   - Es gibt **kein DELETE** in Phase 3b.
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
import { getCreateOwnershipData } from "@/lib/websiteForms/practiceScope";

const IS_DEV = process.env.NODE_ENV === "development";

function isFormSubmit(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") ?? "";
  return ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data");
}

async function readRawInput(req: NextRequest): Promise<RawWebsiteFormInput | null> {
  if (isFormSubmit(req)) {
    const fd = await req.formData();
    return {
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
    };
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return body as RawWebsiteFormInput;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
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

  const formMode = isFormSubmit(req);

  const raw = await readRawInput(req);
  if (raw === null) {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  const result = validateWebsiteFormInput(raw);
  if (!result.ok) {
    if (formMode) {
      // Im HTML-Form-Pfad zeigen wir den ersten Fehler als Query-Parameter
      // an, damit die Liste-Seite ihn rendern kann. (Page-seitig wird das
      // in Phase 3b absichtlich minimal behandelt.)
      const msg = encodeURIComponent(firstFieldError(result.fieldErrors));
      return NextResponse.redirect(
        new URL(`/website-forms?error=${msg}`, req.url),
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
    const created = await prisma.practiceQuestionnaireForm.create({
      data: {
        ...getCreateOwnershipData(account),
        title: result.value.title,
        slug: result.value.slug,
        intro_text: result.value.intro_text,
        selected_block_ids: result.value.selected_block_ids as Prisma.InputJsonValue,
        is_active: result.value.is_active,
      },
      select: { id: true, slug: true },
    });

    if (formMode) {
      return NextResponse.redirect(
        new URL(`/website-forms/${created.id}`, req.url),
        303,
      );
    }
    return NextResponse.json(
      { ok: true, id: created.id, slug: created.slug },
      { status: 201 },
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const message = "Slug bereits vergeben.";
      if (formMode) {
        return NextResponse.redirect(
          new URL(`/website-forms?error=${encodeURIComponent(message)}`, req.url),
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
    console.error("website-forms create failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: IS_DEV && err instanceof Error
          ? err.message
          : "Website-Formular konnte nicht erstellt werden.",
      },
      { status: 500 },
    );
  }
}
