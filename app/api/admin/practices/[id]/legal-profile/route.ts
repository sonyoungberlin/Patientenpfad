import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  changedLegalProfileFields,
  validateLegalProfileInput,
} from "@/lib/practice/legalProfile";

async function readInput(req: NextRequest): Promise<Record<string, unknown> | null> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return req.json().catch(() => null) as Promise<Record<string, unknown> | null>;
  }
  try {
    return Object.fromEntries((await req.formData()).entries());
  } catch {
    return null;
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  const input = await readInput(req);
  if (!input || "practice_id" in input) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }
  const validation = validateLegalProfileInput(input);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const practice = await prisma.practice.findUnique({
    where: { id },
    select: { id: true, legal_profile: true },
  });
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Praxis nicht gefunden." }, { status: 404 });
  }
  const changedFields = changedLegalProfileFields(practice.legal_profile, validation.value);
  if (changedFields.length === 0) return NextResponse.json({ ok: true, changedFields: [] });

  await prisma.$transaction([
    prisma.practiceLegalProfile.upsert({
      where: { practice_id: id },
      create: { practice_id: id, ...validation.value },
      update: validation.value,
    }),
    prisma.practiceLegalProfileAudit.create({
      data: {
        practice_id: id,
        changed_by_admin_account_id: auth.account.id,
        changed_fields: changedFields,
      },
    }),
  ]);

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: true, changedFields });
  }
  return NextResponse.redirect(
    new URL(`/admin/practices/${id}?legalSaved=true`, req.url),
    303,
  );
}

export const POST = PUT;