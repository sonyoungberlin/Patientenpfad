import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";

export async function requireApprovedAdmin(req: NextRequest) {
  const result = await requireAdmin(req);
  if (result.error) return result;
  if (!result.account.is_approved) {
    return {
      account: null,
      error: NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 }),
    };
  }
  return result;
}