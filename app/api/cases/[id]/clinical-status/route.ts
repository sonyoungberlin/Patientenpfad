import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

const ALLOWED_STATUSES = ["prepared", "confirmed"] as const;
type ClinicalStatus = (typeof ALLOWED_STATUSES)[number];

function isClinicalStatus(value: unknown): value is ClinicalStatus {
  return typeof value === "string" && (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    }
    if (!account.is_approved) {
      return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
    }

    const { id } = await params;

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const status = (body as { status?: unknown } | null)?.status;
    if (!isClinicalStatus(status)) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger clinical_status." },
        { status: 400 },
      );
    }

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
    }

    await prisma.caseSession.update({
      where: { id },
      data: { clinical_status: status },
    });

    return NextResponse.json({ ok: true, clinical_status: status });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/clinical-status]", { name: err.name, message: err.message });
    } else {
      console.error("[cases/[id]/clinical-status]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Failed to update clinical_status" },
      { status: 500 },
    );
  }
}
