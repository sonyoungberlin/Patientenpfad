import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import {
  buildPracticeConfirmationSlots,
  type PracticeConfirmationSlot,
} from "@/lib/questionnaire/confirmation";
import { QuestionnaireRequestSection } from "../[id]/m3/InquiryM3Client";

export default async function DirectQuestionnairePage() {
  const account = await requireInquiriesAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  let practiceConfirmationSlots: PracticeConfirmationSlot[] = [];
  const currentPracticeId = account.current_practice?.id;
  if (currentPracticeId) {
    const practice = await prisma.practice.findUnique({
      where: { id: currentPracticeId },
      select: {
        questionnaire_confirmation_text_1: true,
        questionnaire_confirmation_text_2: true,
        questionnaire_confirmation_text_3: true,
      },
    });
    if (practice) {
      practiceConfirmationSlots = buildPracticeConfirmationSlots(practice);
    }
  }

  return (
    <main>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/inquiries">← Zur Anfrageübersicht</Link>
      </p>
      <h1>Fragebogen starten</h1>
      <p className="text-muted" style={{ marginBottom: "1rem" }}>
        Fragebogen für die strukturierte Erfassung vor Ort zusammenstellen.
      </p>
      <QuestionnaireRequestSection
        practiceConfirmationSlots={practiceConfirmationSlots}
        initialOpen
        mode="direct"
      />
    </main>
  );
}