import { prisma } from "@/lib/prisma";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  normalizeQuestionnaireLanguage,
  localizeQuestion,
  type QuestionnaireLanguage,
} from "@/lib/questionnaire/i18n";
import {
  PATIENT_QUESTIONNAIRE_INTRO_TEXT,
  PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN,
} from "@/lib/questionnaire/patientIntro";
import { QuestionnaireFormClient } from "./QuestionnaireFormClient";

// Always render per-request so the page reads fresh token state from the DB
// and is never served from the Full Route Cache (would expose stale form HTML
// after a token has already been consumed or expired).
export const dynamic = "force-dynamic";

const EXPIRED_MESSAGE_DE =
  "Dieser Link ist nicht mehr gültig. Bitte wenden Sie sich an die Praxis.";
const EXPIRED_MESSAGE_EN =
  "This link is no longer valid. Please contact the practice.";

const COMPLETED_MESSAGE_DE =
  "Dieser Fragebogen wurde bereits ausgefüllt. Vielen Dank.";
const COMPLETED_MESSAGE_EN =
  "This questionnaire has already been completed. Thank you.";

const PAGE_TITLE_DE = "Fragebogen";
const PAGE_TITLE_EN = "Questionnaire";

function expiredMessage(language: QuestionnaireLanguage): string {
  return language === "en" ? EXPIRED_MESSAGE_EN : EXPIRED_MESSAGE_DE;
}
function completedMessage(language: QuestionnaireLanguage): string {
  return language === "en" ? COMPLETED_MESSAGE_EN : COMPLETED_MESSAGE_DE;
}

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
      deleted_at: true,
      owner_practice: {
        select: {
          message_signature: true,
        },
      },
    },
  });

  // Bei unbekanntem Token kennen wir die Sprache nicht und zeigen die
  // generische DE-Meldung — bewusst ohne EN-Variante, um keine
  // Existenz-/Sprachinformationen preiszugeben.
  if (!session || !session.token_expires_at || session.deleted_at != null) {
    return (
      <main>
        <p data-q-expired>{EXPIRED_MESSAGE_DE}</p>
      </main>
    );
  }

  const language = normalizeQuestionnaireLanguage(session.patient_language);

  if (session.token_expires_at < new Date()) {
    return (
      <main>
        <p data-q-expired>{expiredMessage(language)}</p>
      </main>
    );
  }

  if (session.status !== "pending") {
    return (
      <main>
        <p data-q-completed>{completedMessage(language)}</p>
      </main>
    );
  }

  const rawQuestions = Array.isArray(session.deduplicated_questions)
    ? (session.deduplicated_questions as QuestionDefinition[])
    : [];

  // Praxis-/interne Sichten ignorieren `patient_language` bewusst und bleiben
  // deutsch. Nur die Patient-Renderschicht hier lokalisiert die Fragen.
  const questions = rawQuestions.map((q) => localizeQuestion(q, language));

  const practiceSignature = session.owner_practice?.message_signature ?? null;
  const introText =
    language === "en"
      ? PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN
      : PATIENT_QUESTIONNAIRE_INTRO_TEXT;
  const pageTitle = language === "en" ? PAGE_TITLE_EN : PAGE_TITLE_DE;

  return (
    <main>
      <h1>{pageTitle}</h1>
      <QuestionnaireFormClient
        token={token}
        questions={questions}
        introText={introText}
        practiceSignature={practiceSignature}
        language={language}
      />
    </main>
  );
}
