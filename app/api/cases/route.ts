import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessions = await prisma.caseSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        mode: true,
        patient_reference: true,
        active_checkpoints: true,
      },
    });

    const cases = sessions.map((s) => {
      const checkpoints = Array.isArray(s.active_checkpoints)
        ? s.active_checkpoints
        : [];
      return {
        id: s.id,
        createdAt: s.createdAt,
        mode: s.mode ?? "guest",
        patient_reference: s.patient_reference ?? null,
        checkpoint_count: checkpoints.length,
      };
    });

    return NextResponse.json({ ok: true, cases });
  } catch (err) {
    console.error("[GET /api/cases]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to list cases" },
      { status: 500 },
    );
  }
}
