import { prisma } from "@/lib/prisma";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  normalizeQuestionnaireLanguage,
  localizeQuestion,
} from "@/lib/questionnaire/i18n";
import { PATIENT_QUESTIONNAIRE_INTRO_TEXT } from "@/lib/questionnaire/patientIntro";
import { QuestionnaireFormClient } from "./QuestionnaireFormClient";

// Always render per-request so the page reads fresh token state from the DB
// and is never served from the Full Route Cache (would expose stale form HTML
// after a token has already been consumed or expired).
export const dynamic = "force-dynamic";

const EXPIRED_MESSAGE =
  "Dieser Link ist nicht mehr gültig. Bitte wenden Sie sich an die Praxis.";

const COMPLETED_MESSAGE =
  "Dieser Fragebogen wurde bereits ausgefüllt. Vielen Dank.";

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { token },
    select: {
      token_expires_at: true,
      status: true,
      deduplicated_questions: true,
      patient_language: true,
      owner_practice: {
        select: {
          message_signature: true,
        },
      },
    },
  });

  if (!session || !session.token_expires_at) {
    return (
      <main>
        <p data-q-expired>{EXPIRED_MESSAGE}</p>
      </main>
    );
  }

  if (session.token_expires_at < new Date()) {
    return (
      <main>
        <p data-q-expired>{EXPIRED_MESSAGE}</p>
      </main>
    );
  }

  if (session.status !== "pending") {
    return (
      <main>
        <p data-q-completed>{COMPLETED_MESSAGE}</p>
      </main>
    );
  }

  const rawQuestions = Array.isArray(session.deduplicated_questions)
    ? (session.deduplicated_questions as QuestionDefinition[])
    : [];

  // Praxis-/interne Sichten ignorieren `patient_language` bewusst und bleiben
  // deutsch. Nur die Patient-Renderschicht hier lokalisiert die Fragen.
  const language = normalizeQuestionnaireLanguage(session.patient_language);
  const questions = rawQuestions.map((q) => localizeQuestion(q, language));

  const practiceSignature = session.owner_practice?.message_signature ?? null;

  return (
    <main>
      <h1>Fragebogen</h1>
      <QuestionnaireFormClient
        token={token}
        questions={questions}
        introText={PATIENT_QUESTIONNAIRE_INTRO_TEXT}
        practiceSignature={practiceSignature}
        language={language}
      />
    </main>
  );
}
