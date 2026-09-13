import { NextRequest, NextResponse } from "next/server";
import { enrollAutoDownloadDevice } from "@/lib/autoDownloadDevices/enrollment";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const enrollment = await enrollAutoDownloadDevice(code);
  if (!enrollment) {
    return NextResponse.json(
      { ok: false, error: "Enrollment-Code ungültig oder abgelaufen." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, ...enrollment },
    { headers: { "Cache-Control": "no-store" } },
  );
}
