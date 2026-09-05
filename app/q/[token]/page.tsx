import { prisma } from "@/lib/prisma";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  normalizeQuestionnaireLanguage,
  localizeQuestion,
  type QuestionnaireLanguage,
} from "@/lib/questionnaire/i18n";
import {
  parseConditionalRules,
  type ConditionalRule,
} from "@/lib/questionnaire/conditionalLogic";
import {
  parseFrozenBlocks,
  type FrozenBlock,
} from "@/lib/questionnaire/frozenBlocks";
import {
  PATIENT_QUESTIONNAIRE_INTRO_TEXT,
  PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN,
} from "@/lib/questionnaire/patientIntro";
import {
  OFFICE_QUESTIONNAIRE_INTRO_TEXT,
  BEWERBER_INTRO_DU,
  BEWERBER_INTRO_SIE,
} from "@/lib/questionnaire/officeIntro";
import { QuestionnaireFormClient } from "./QuestionnaireFormClient";
import {
  PUBLIC_IDENTITY_SELECT,
  publicPracticeName,
} from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";
import { isPracticeActive, PRACTICE_SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/practice/lifecycle";

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
      source: true,
      inquiry_session_id: true,
      deduplicated_questions: true,
      frozen_conditional_rules: true,
      frozen_blocks: true,
      patient_language: true,
      deleted_at: true,
      context: true,
      salutation: true,
      owner_practice: {
        select: PUBLIC_IDENTITY_SELECT,
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
  const publicPractice = session.owner_practice;

  if (publicPractice && typeof publicPractice.is_approved === "boolean" && !isPracticeActive(publicPractice)) {
    return <main><p data-q-unavailable>{PRACTICE_SERVICE_UNAVAILABLE_MESSAGE}</p></main>;
  }

  if (session.token_expires_at < new Date()) {
    return (
      <main>
        <p data-q-expired>{expiredMessage(language)}</p>
        {publicPractice && <PublicPracticeFooter practice={publicPractice} />}
      </main>
    );
  }

  if (session.status !== "pending") {
    return (
      <main>
        <p data-q-completed>{completedMessage(language)}</p>
        {publicPractice && <PublicPracticeFooter practice={publicPractice} />}
      </main>
    );
  }

  const rawQuestions = Array.isArray(session.deduplicated_questions)
    ? (session.deduplicated_questions as QuestionDefinition[])
    : [];

  const questions = rawQuestions.map((q) => localizeQuestion(q, language));

  const conditionalRules: ConditionalRule[] = parseConditionalRules(
    session.frozen_conditional_rules,
  );

  // Phase 4: Frozen Blocks laden und lokalisieren
  const rawFrozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const frozenBlocks: FrozenBlock[] | null = rawFrozenBlocks
    ? rawFrozenBlocks.map((block) => ({
        ...block,
        questions: block.questions.map((q) => localizeQuestion(q, language)),
      }))
    : null;

  const practiceSignature = session.owner_practice?.message_signature ?? null;
  const isOfficeContext = session.context === "office";
  let introText: string;
  let introTitle: string | undefined;
  if (isOfficeContext && session.salutation === "du") {
    introTitle = BEWERBER_INTRO_DU.title;
    introText = BEWERBER_INTRO_DU.text;
  } else if (isOfficeContext && session.salutation === "sie") {
    introTitle = BEWERBER_INTRO_SIE.title;
    introText = BEWERBER_INTRO_SIE.text;
  } else if (isOfficeContext) {
    introText = OFFICE_QUESTIONNAIRE_INTRO_TEXT;
  } else {
    introText = language === "en"
      ? PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN
      : PATIENT_QUESTIONNAIRE_INTRO_TEXT;
  }
  const pageTitle = isOfficeContext && publicPractice
    ? `Bewerben bei ${publicPracticeName(publicPractice)}`
    : language === "en" ? PAGE_TITLE_EN : PAGE_TITLE_DE;

  return (
    <main>
      <h1>{pageTitle}</h1>
      <QuestionnaireFormClient
        token={token}
        questions={questions}
        conditionalRules={conditionalRules}
        frozenBlocks={frozenBlocks}
        introText={introText}
        introTitle={introTitle}
        practiceSignature={practiceSignature}
        language={language}
        context={session.context}
        source={session.source}
        inquirySessionId={session.inquiry_session_id}
      />
      {publicPractice && <PublicPracticeFooter practice={publicPractice} />}
    </main>
  );
}
