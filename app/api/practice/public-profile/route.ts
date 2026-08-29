import { NextRequest, NextResponse } from "next/server";
import { PracticeRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";
import {
  generateAvailablePublicSlug,
  validatePublicPracticeName,
} from "@/lib/practice/publicProfile";

const WRITE_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
];

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
  if (!body || typeof body !== "object" || "public_slug" in body) {
    return NextResponse.json(
      { ok: false, error: "Ungültiger Body." },
      { status: 400 },
    );
  }

  const validation = validatePublicPracticeName(
    (body as { public_name?: unknown }).public_name,
  );
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 },
    );
  }

  const existing = await prisma.practice.findUnique({
    where: { id: practice.id },
    select: { public_slug: true },
  });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Praxis nicht gefunden." },
      { status: 404 },
    );
  }

  if (existing.public_slug) {
    await prisma.practice.update({
      where: { id: practice.id },
      data: { public_name: validation.publicName },
    });
    return NextResponse.json({
      ok: true,
      public_name: validation.publicName,
      public_slug: existing.public_slug,
    });
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicSlug = await generateAvailablePublicSlug(
      validation.publicName,
      async (candidate) => {
        const collision = await prisma.practice.findFirst({
          where: {
            OR: [{ public_slug: candidate }, { slug: candidate }],
          },
          select: { id: true },
        });
        return collision !== null;
      },
    );

    try {
      await prisma.practice.update({
        where: { id: practice.id },
        data: {
          public_name: validation.publicName,
          public_slug: publicSlug,
        },
      });
      return NextResponse.json({
        ok: true,
        public_name: validation.publicName,
        public_slug: publicSlug,
      });
    } catch (error) {
      const isSlugCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isSlugCollision || attempt === 2) throw error;
    }
  }

  return NextResponse.json(
    { ok: false, error: "Öffentliche Praxiskennung konnte nicht gespeichert werden." },
    { status: 409 },
  );
}