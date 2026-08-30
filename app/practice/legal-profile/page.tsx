import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PracticeLegalProfileDetails } from "@/components/practice/PracticeLegalProfileDetails";

export default async function PracticeLegalProfilePage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) redirect("/");
  const allowed = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!allowed || !account.current_practice) notFound();

  const profile = await prisma.practiceLegalProfile.findUnique({
    where: { practice_id: account.current_practice.id },
  });

  return (
    <main>
      <h1>Offizielle Praxisdaten</h1>
      <p className="text-muted">
        Diese zentralen Vertrags- und Impressumsdaten können nur durch den Plattformbetreiber geändert werden.
      </p>
      <p className="text-muted">
        Die offiziellen Praxisdaten werden für die eindeutige Zuordnung Ihrer Praxis auf öffentlichen Patientenformularen verwendet. Änderungen erfolgen durch den Plattformbetreiber.
      </p>
      {profile ? (
        <PracticeLegalProfileDetails profile={profile} />
      ) : (
        <p>Noch kein offizielles Praxisprofil hinterlegt.</p>
      )}
    </main>
  );
}