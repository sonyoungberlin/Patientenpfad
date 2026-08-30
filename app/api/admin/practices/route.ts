import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  generateAvailablePublicSlug,
  validatePublicPracticeName,
} from "@/lib/practice/publicProfile";
import { validateLegalProfileInput } from "@/lib/practice/legalProfile";

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

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const input = await readInput(req);
  if (!input || "practice_id" in input) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }

  const displayName = typeof input.display_name === "string" ? input.display_name.trim() : "";
  const nameResult = validatePublicPracticeName(displayName);
  const legalResult = validateLegalProfileInput(input);
  if (!nameResult.ok) {
    return NextResponse.json(
      { ok: false, error: nameResult.error },
      { status: 400 },
    );
  }
  if (!legalResult.ok) {
    return NextResponse.json(
      { ok: false, error: legalResult.error },
      { status: 400 },
    );
  }

  const ownerEmail = typeof input.owner_email === "string"
    ? input.owner_email.trim().toLowerCase()
    : "";
  const owner = ownerEmail
    ? await prisma.account.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    : null;
  if (ownerEmail && !owner) {
    return NextResponse.json(
      { ok: false, error: "Der zuzuordnende Account existiert nicht." },
      { status: 404 },
    );
  }

  const publicSlug = await generateAvailablePublicSlug(
    displayName,
    async (candidate) =>
      (await prisma.practice.findFirst({
        where: { OR: [{ slug: candidate }, { public_slug: candidate }] },
        select: { id: true },
      })) !== null,
  );

  const practice = await prisma.$transaction(async (tx) => {
    const created = await tx.practice.create({
      data: {
        name: displayName,
        slug: publicSlug,
        public_name: displayName,
        public_slug: publicSlug,
        is_approved: false,
        legal_profile: { create: legalResult.value },
        ...(owner
          ? {
              memberships: {
                create: { account_id: owner.id, role: PracticeRole.OWNER },
              },
            }
          : {}),
      },
      select: { id: true, name: true, public_slug: true },
    });
    await tx.practiceLegalProfileAudit.create({
      data: {
        practice_id: created.id,
        changed_by_admin_account_id: auth.account.id,
        changed_fields: Object.keys(legalResult.value),
      },
    });
    return created;
  });

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: true, practice }, { status: 201 });
  }
  return NextResponse.redirect(new URL(`/admin/practices/${practice.id}`, req.url), 303);
}