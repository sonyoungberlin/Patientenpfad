import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import {
  AutoDownloadArtifactBuildError,
  selectNextAutoDownloadArtifact,
  type AutoDownloadArtifact,
} from "@/lib/questionnaire/autoDownloadArtifactSelector";
import {
  hashQuestionnaireAutoDeviceId,
  isValidQuestionnaireAutoDeviceId,
  QUESTIONNAIRE_AUTO_DEVICE_HEADER,
} from "@/lib/questionnaire/autoDownloadDevice";

function artifactResponse(artifact: AutoDownloadArtifact): Response {
  return new Response(Buffer.from(artifact.bytes), {
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Disposition": `attachment; filename="${artifact.filename}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const { account, error } = await requireQuestionnaireInboxAccess(req);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice) {
    return Response.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const deviceId = req.headers.get(QUESTIONNAIRE_AUTO_DEVICE_HEADER);
  if (!isValidQuestionnaireAutoDeviceId(deviceId)) {
    return Response.json(
      { ok: false, error: "Ungültige Gerätekennung." },
      { status: 400 },
    );
  }
  const deviceHash = hashQuestionnaireAutoDeviceId(deviceId);

  const settings = await prisma.practice.findUnique({
    where: { id: practice.id },
    select: {
      questionnaire_auto_pdf_device_hash: true,
      questionnaire_auto_pdf_enabled_at: true,
    },
  });
  const enabledAt = settings?.questionnaire_auto_pdf_enabled_at ?? null;
  if (
    !enabledAt ||
    settings?.questionnaire_auto_pdf_device_hash !== deviceHash
  ) {
    return Response.json(
      { ok: false, error: "Gerät nicht für Auto-Download freigegeben." },
      { status: 403 },
    );
  }

  try {
    const artifact = await selectNextAutoDownloadArtifact({
      practiceId: practice.id,
      deviceHash,
      enabledAt,
    });
    return artifact
      ? artifactResponse(artifact)
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