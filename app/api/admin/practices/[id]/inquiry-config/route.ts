/**
 * Plattform-Admin: POST /api/admin/practices/[id]/inquiry-config
 *
 * Speichert die 15 inq_*-Felder einer Praxis.
 *
 * Berechtigung: nur Plattform-Admin (requireAdmin).
 * Nur Form-Submit → 303 Redirect zurück zur Practice-Detail-Seite.
 *
 * Semantik:
 *  - Leere Felder → null  (Fallback auf PILOT_PRACTICE_INQUIRY_CONFIG)
 *  - inq_open_consultation_cap_limited: Checkbox = true/false, niemals null
 *  - inq_digital_req_time_unit: ungültiger Wert = Validierungsfehler
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { validatePracticeInquiryConfigInput } from "@/lib/admin/validatePracticeInquiryConfig";

function redirectToDetail(
  req: NextRequest,
  id: string,
  query: { inqConfigError?: string; inqConfigSaved?: string }
): NextResponse {
  const url = new URL(`/admin/practices/${id}`, req.url);
  if (query.inqConfigError !== undefined)
    url.searchParams.set("inqConfigError", query.inqConfigError);
  if (query.inqConfigSaved !== undefined)
    url.searchParams.set("inqConfigSaved", query.inqConfigSaved);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await ctx.params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return redirectToDetail(req, id, {
      inqConfigError: "Ungültige Formulardaten.",
    });
  }

  const { data, error: validationError } =
    validatePracticeInquiryConfigInput(formData);

  if (validationError || !data) {
    return redirectToDetail(req, id, {
      inqConfigError: validationError ?? "Unbekannter Validierungsfehler.",
    });
  }

  try {
    await prisma.practice.update({
      where: { id },
      data,
    });
  } catch {
    return redirectToDetail(req, id, {
      inqConfigError: "Datenbankfehler beim Speichern der Konfiguration.",
    });
  }

  return redirectToDetail(req, id, { inqConfigSaved: "1" });
}
