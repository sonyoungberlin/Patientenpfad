import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { isQuestionnaireVisibleToPractice } from "@/lib/websiteForms/practiceVisibility";

/**
 * POST /api/questionnaire/[id]/restore
 *
 * Hebt einen Soft-Delete (`deleted_at`) wieder auf. Die Auth- und
 * Ownership-Prüfung ist identisch mit der DELETE-Route, damit ein Account
 * nur Fragebögen wiederherstellen kann, die er auch löschen dürfte.
 *
 * 404-Konvention (analog zur DELETE-Route): Sowohl fremde IDs als auch
 * nicht-archivierte oder gar nicht existierende IDs liefern 404 — ohne
 * Hinweis auf Existenz.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireQuestionnaireInboxAccess(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        source: true,
        status: true,
        confirmed_at: true,
        deleted_at: true,
      },
    });

    if (
      !session ||
      // Nur soft-gelöschte Sessions sind wiederherstellbar.
      session.deleted_at == null ||
      !ownsSession(account, session) ||
      // Spiegelt die DELETE-Sichtbarkeit: unbestätigte Website-Sessions sind
      // weder löschbar noch wiederherstellbar (404, kein 403).
      !isQuestionnaireVisibleToPractice(session)
    ) {
      return NextResponse.json(
        { ok: false, error: "Fragebogen nicht gefunden." },
        { status: 404 },
      );
    }

    // Restore: nur `deleted_at` zurücksetzen. Antworten und alle anderen
    // Felder bleiben unangetastet, damit die Wiederherstellung exakt den
    // Zustand vor dem Soft-Delete reproduziert.
    await prisma.patientQuestionnaireSession.update({
      where: { id },
      data: { deleted_at: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[POST questionnaire/[id]/restore]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[POST questionnaire/[id]/restore]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht wiederhergestellt werden." },
      { status: 500 },
    );
  }
}
