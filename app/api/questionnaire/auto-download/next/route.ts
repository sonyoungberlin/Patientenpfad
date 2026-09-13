import { NextRequest } from "next/server";
import { QuestionnaireAutoExportMode } from "@prisma/client";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { requireQuestionnaireAutoExportMode } from "@/lib/questionnaire/autoExportMode";
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

  const mode = await requireQuestionnaireAutoExportMode(
    practice.id,
    QuestionnaireAutoExportMode.BROWSER,
  );
  if (mode.error) return mode.error;
  const enabledAt = mode.settings.browserEnabledAt;
  if (
    !enabledAt ||
    mode.settings.browserDeviceHash !== deviceHash
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