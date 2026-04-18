import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const account = await getSessionAccount(req);

  if (!account) {
    return NextResponse.json(
      { ok: false, error: "Nicht angemeldet." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, account });
}
