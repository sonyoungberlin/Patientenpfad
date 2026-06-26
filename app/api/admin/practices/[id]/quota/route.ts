/**
 * Plattform-Admin: POST /api/admin/practices/[id]/quota
 *
 * Setzt das Patientenpfad-Fallkontingent (case_quota) einer Praxis.
 *
 * Berechtigung: nur Plattform-Admin (requireAdmin).
 * Nur Form-Submit → 303 Redirect zurück zur Practice-Detail-Seite.
 *
 * Semantik:
 *  - Leeres Feld → null (unbegrenzt)
 *  - Nicht-negative Ganzzahl → Kontingent
 *  - Negative Zahl oder kein Integer → Validierungsfehler
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

function redirectToDetail(
  req: NextRequest,
  id: string,
  query: { quotaError?: string; quotaSaved?: string },
): NextResponse {
  const url = new URL(`/admin/practices/${id}`, req.url);
  if (query.quotaError !== undefined)
    url.searchParams.set("quotaError", query.quotaError);
  if (query.quotaSaved !== undefined)
    url.searchParams.set("quotaSaved", query.quotaSaved);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error: authError } = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await ctx.params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return redirectToDetail(req, id, { quotaError: "Ungültige Formulardaten." });
  }

  const raw = formData.get("case_quota");
  let quota: number | null;

  if (raw === null || String(raw).trim() === "") {
    // Leer = unbegrenzt
    quota = null;
  } else {
    const trimmed = String(raw).trim();
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 0 || String(parsed) !== trimmed) {
      return redirectToDetail(req, id, {
        quotaError:
          "Ungültiger Wert. Bitte leer lassen (unbegrenzt) oder eine nicht-negative Ganzzahl eingeben.",
      });
    }
    quota = parsed;
  }

  try {
    await prisma.practice.update({
      where: { id },
      data: { case_quota: quota },
    });
  } catch {
    return redirectToDetail(req, id, {
      quotaError: "Datenbankfehler beim Speichern des Kontingents.",
    });
  }

  return redirectToDetail(req, id, { quotaSaved: "1" });
}
