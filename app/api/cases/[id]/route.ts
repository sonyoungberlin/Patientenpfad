import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.caseSession.findUnique({ where: { id } });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, case: session });
  } catch (err) {
    console.error("[cases/[id]]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load case session" },
      { status: 500 }
    );
  }
}
