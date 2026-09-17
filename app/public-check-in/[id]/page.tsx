import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { resolvePublicHandoff } from "@/lib/questionnaire/publicHandoffAuth";
import { PublicCheckInWaitingClient } from "./PublicCheckInWaitingClient";

export const dynamic = "force-dynamic";

export default async function PublicCheckInWaitingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const req = new NextRequest("http://localhost", { headers: requestHeaders });
  const handoff = await resolvePublicHandoff(req, id);
  if (!handoff) notFound();
  return <main><h1>Vielen Dank</h1><p>Ihre Anmeldung wurde übermittelt.</p><PublicCheckInWaitingClient sessionId={id} /></main>;
}