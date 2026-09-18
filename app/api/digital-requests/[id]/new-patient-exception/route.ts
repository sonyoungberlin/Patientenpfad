import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDigitalRequestWorkAccess } from "@/lib/authz";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireDigitalRequestWorkAccess(req);
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  if (typeof body.confirmed !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "confirmed muss ein Boolean sein." },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const existing = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOwnershipFilter(account),
      request_type: "patient",
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Anfrage nicht gefunden." },
      { status: 404 },
    );
  }

  await prisma.digitalRequest.update({
    where: { id: existing.id },
    data: {
      new_patient_exception_confirmed_at: body.confirmed ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, confirmed: body.confirmed });
}