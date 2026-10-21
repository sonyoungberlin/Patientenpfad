import { redirect } from "next/navigation";
import { KioskAccountLogout } from "@/components/questionnaireKiosk/KioskAccountLogout";
import {
  getQuestionnaireKioskAccessFromCookies,
  hasQuestionnaireKioskCapability,
} from "@/lib/questionnaireKiosk/auth";
import InternalDocumentationStartClient from "./InternalDocumentationStartClient";

export default async function InternalDocumentationStartPage() {
  const access = await getQuestionnaireKioskAccessFromCookies(true);
  if (!access || !hasQuestionnaireKioskCapability(access, "internal_documentation")) {
    redirect("/questionnaire-kiosk/lock");
  }
  return (
    <main>
      {access.kind === "account" ? <KioskAccountLogout /> : null}
      <h1>Interne Dokumentation</h1>
      <InternalDocumentationStartClient />
    </main>
  );
}
