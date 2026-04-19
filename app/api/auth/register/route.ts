import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = (body as Record<string, unknown>).email;
    const rawName: unknown = (body as Record<string, unknown>).name;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
    const name =
      typeof rawName === "string" ? rawName.trim() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ungültige E-Mail-Adresse." },
        { status: 400 },
      );
    }

    if (!name || name.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Bitte geben Sie Ihren Namen ein." },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 },
      );
    }

    await prisma.account.create({
      data: { email, name, is_approved: false },
    });

    return NextResponse.json({
      ok: true,
      message: "Registrierung erfolgreich. Ihr Zugang wird manuell freigeschaltet.",
    });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json(
      { ok: false, error: "Registrierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
