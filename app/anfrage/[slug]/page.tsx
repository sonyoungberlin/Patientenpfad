/**
 * Phase A (aktualisiert): Öffentliche Formularseite `/anfrage/[slug]`.
 *
 * Slug-Quelle: `Practice.slug` (praxisweit, stabil).
 * Kein Bezug zu einem einzelnen `PracticeQuestionnaireForm` mehr —
 * Digitale Anfragen sind konzeptuell praxisweit und unabhängig von
 * öffentlichen Website-Fragebögen.
 *
 * Sichtbarkeits-Cascade — alle negativen Fälle ergeben einheitlich
 * `notFound()` (404), damit weder Slug-Existenz noch Praxis-Status
 * enumerierbar sind:
 *   1. Slug-Format ungültig
 *   2. Slug existiert nicht (keine Practice mit diesem Slug)
 *   3. Practice nicht freigegeben (`is_approved = false`)
 *   4. Patientenkommunikation deaktiviert (`patient_communication_enabled = false`)
 *
 * Hinweis: `website_forms_enabled` wird bewusst NICHT geprüft —
 * Digitale Anfragen erfordern nur `patient_communication_enabled`.
 *
 * `dynamic = "force-dynamic"` + `revalidate = 0`, damit Statusänderungen
 * nicht aus dem Full Route Cache ausgeliefert werden.
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { HONEYPOT_FIELD_NAME } from "@/lib/websiteForms/submitValidation";
import { DIGITAL_REQUEST_TOPICS } from "@/lib/digitalRequests/topics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnfragePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Slug-Format vor dem DB-Roundtrip prüfen.
  const validation = validateSlug(slug);
  if (!validation.ok) {
    notFound();
  }

  // 2./3./4. Practice laden und Sichtbarkeits-Cascade prüfen.
  const practice = await prisma.practice.findUnique({
    where: { slug: validation.slug },
    select: {
      is_approved: true,
      patient_communication_enabled: true,
      message_signature: true,
    },
  });

  if (!practice) {
    notFound();
  }

  if (!practice.is_approved || !practice.patient_communication_enabled) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Digitales Anliegen</h1>
      <p className="mb-2 text-sm text-gray-600">
        Bitte wählen Sie aus, wofür Sie einen Fragebogenlink anfordern möchten.
        Die Praxis prüft Ihre Angaben und sendet Ihnen anschließend den passenden Link.
      </p>
      <p className="mb-6 text-sm text-gray-500">
        Wenn Ihr Anliegen nicht zu diesen Punkten passt, schreiben Sie uns bitte
        wie gewohnt eine Nachricht.
      </p>

      <form method="POST" action={`/api/anfrage/${validation.slug}`}>
        {/* Name */}
        <div className="mb-4">
          <label
            htmlFor="submitter_name"
            className="mb-1 block text-sm font-medium"
          >
            Ihr Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="submitter_name"
            name="submitter_name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* E-Mail */}
        <div className="mb-4">
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium"
          >
            E-Mail-Adresse <span aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Geburtsdatum (Pflichtfeld) */}
        <div className="mb-6">
          <label
            htmlFor="birth_date"
            className="mb-1 block text-sm font-medium"
          >
            Geburtsdatum <span aria-hidden="true">*</span>
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            required
            autoComplete="bday"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Anliegen-Auswahl (Pflichtfeld, Mehrfachauswahl) */}
        <div className="mb-8" role="group" aria-labelledby="topics-label">
          <p id="topics-label" className="mb-3 text-sm font-medium">
            Anliegen <span aria-hidden="true">*</span>
          </p>
          <div className="flex flex-col gap-4" data-testid="topic-checkboxes">
            {(Object.entries(DIGITAL_REQUEST_TOPICS) as [string, string][]).map(
              ([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="requested_topic"
                    value={value}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
                  />
                  <span className="leading-relaxed">{label}</span>
                </label>
              ),
            )}
          </div>
        </div>

        {/* Honeypot — unsichtbar für echte Nutzer */}
        <div aria-hidden="true" style={{ display: "none" }}>
          <label htmlFor={HONEYPOT_FIELD_NAME}>Website</label>
          <input
            id={HONEYPOT_FIELD_NAME}
            name={HONEYPOT_FIELD_NAME}
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
        >
          Anfrage absenden
        </button>
      </form>

      {/* Praxis-Signatur */}
      {practice.message_signature && (
        <div
          className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500"
          data-testid="practice-signature"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {practice.message_signature}
        </div>
      )}
    </main>
  );
}
