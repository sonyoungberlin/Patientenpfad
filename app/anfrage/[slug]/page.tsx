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
      <p className="mb-6 text-sm text-gray-600">
        Ihre Praxis prüft Ihre Anfrage und meldet sich mit dem passenden
        nächsten Schritt.
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

        {/* Geburtsdatum (optional) */}
        <div className="mb-4">
          <label
            htmlFor="birth_date"
            className="mb-1 block text-sm font-medium"
          >
            Geburtsdatum{" "}
            <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            autoComplete="bday"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Anliegen (optional) */}
        <div className="mb-6">
          <label
            htmlFor="concern_text"
            className="mb-1 block text-sm font-medium"
          >
            Ihr Anliegen{" "}
            <span className="text-gray-400">(optional, max. 500 Zeichen)</span>
          </label>
          <textarea
            id="concern_text"
            name="concern_text"
            rows={4}
            maxLength={500}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
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
          className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Anfrage absenden
        </button>
      </form>
    </main>
  );
}
