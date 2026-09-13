import { NextRequest, NextResponse } from "next/server";
import { requireAutoDownloadDevice } from "@/lib/autoDownloadDevices/auth";
import { acknowledgeAutoDownloadDelivery } from "@/lib/autoDownloadDevices/delivery";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { device, error } = await requireAutoDownloadDevice(req);
  if (error) return error;

  const leaseToken = req.headers.get("X-Auto-Download-Lease-Token") ?? "";
  const { id } = await params;
  const result = await acknowledgeAutoDownloadDelivery(
    id,
    leaseToken,
    device,
  );
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return NextResponse.json(
      { ok: false, error: "Delivery oder Lease ist nicht gültig." },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyAcknowledged: result.alreadyAcknowledged,
  });
}
