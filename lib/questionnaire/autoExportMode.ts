import { QuestionnaireAutoExportMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AutoExportSettings = {
  mode: QuestionnaireAutoExportMode;
  browserDeviceHash: string | null;
  browserEnabledAt: Date | null;
};

type AutoExportModeResult =
  | { settings: AutoExportSettings; error: null }
  | { settings: null; error: Response };

export async function requireQuestionnaireAutoExportMode(
  practiceId: string,
  expectedMode: QuestionnaireAutoExportMode,
): Promise<AutoExportModeResult> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: {
      questionnaire_auto_export_mode: true,
      questionnaire_auto_pdf_device_hash: true,
      questionnaire_auto_pdf_enabled_at: true,
    },
  });

  if (!practice || practice.questionnaire_auto_export_mode !== expectedMode) {
    return {
      settings: null,
      error: Response.json(
        { ok: false, error: "export_mode_mismatch" },
        { status: 409 },
      ),
    };
  }

  return {
    settings: {
      mode: practice.questionnaire_auto_export_mode,
      browserDeviceHash: practice.questionnaire_auto_pdf_device_hash,
      browserEnabledAt: practice.questionnaire_auto_pdf_enabled_at,
    },
    error: null,
  };
}