import { NextRequest } from "next/server";
import { requireAutoDownloadDevice } from "@/lib/autoDownloadDevices/auth";
import {
  acquireAutoDownloadArtifactLease,
  AUTO_DOWNLOAD_CONTENT_SHA256_HEADER,
  AUTO_DOWNLOAD_DELIVERY_ID_HEADER,
  AUTO_DOWNLOAD_LEASE_TOKEN_HEADER,
  type LeasedAutoDownloadArtifact,
} from "@/lib/autoDownloadDevices/delivery";
import {
  AutoDownloadArtifactBuildError,
  selectNextAutoDownloadArtifactForDelivery,
} from "@/lib/questionnaire/autoDownloadArtifactSelector";

function artifactResponse(leased: LeasedAutoDownloadArtifact): Response {
  return new Response(Buffer.from(leased.artifact.bytes), {
    headers: {
      "Content-Type": leased.artifact.mimeType,
      "Content-Disposition": `attachment; filename="${leased.artifact.filename}"`,
      [AUTO_DOWNLOAD_DELIVERY_ID_HEADER]: leased.deliveryId,
      [AUTO_DOWNLOAD_LEASE_TOKEN_HEADER]: leased.leaseToken,
      [AUTO_DOWNLOAD_CONTENT_SHA256_HEADER]: leased.contentSha256,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const { device, error } = await requireAutoDownloadDevice(req);
  if (error) return error;

  try {
    let leasedArtifact: LeasedAutoDownloadArtifact | null = null;
    // Der Selektor ruft accept erst nach erfolgreichem Build auf.
    await selectNextAutoDownloadArtifactForDelivery({
      practiceId: device.practiceId,
      accept: async (candidate) => {
        leasedArtifact = await acquireAutoDownloadArtifactLease(candidate, device);
        return leasedArtifact !== null;
      },
    });

    return leasedArtifact
      ? artifactResponse(leasedArtifact)
      : new Response(null, { status: 204 });
  } catch (selectionError) {
    if (selectionError instanceof AutoDownloadArtifactBuildError) {
      return Response.json(
        { ok: false, error: selectionError.responseMessage },
        { status: 500 },
      );
    }
    throw selectionError;
  }
}
