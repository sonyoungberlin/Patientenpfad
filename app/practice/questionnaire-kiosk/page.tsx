import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import QuestionnaireKioskDeviceSettings from "@/components/practice/QuestionnaireKioskDeviceSettings";

export default async function QuestionnaireKioskSettingsPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  const owner = await requirePracticeRoleFromCookies([PracticeRole.OWNER]);
  if (!owner?.current_practice) notFound();
  const devices = await prisma.questionnaireKioskDevice.findMany({ where: { practice_id: owner.current_practice.id }, select: { id: true, name: true, is_active: true, revoked_at: true, created_at: true, last_seen_at: true }, orderBy: { created_at: "desc" } });
  return <main><h1>Kiosk-Geräte</h1><QuestionnaireKioskDeviceSettings initialDevices={devices} /></main>;
}