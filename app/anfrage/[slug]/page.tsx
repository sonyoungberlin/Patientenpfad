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
    <main style={{ maxWidth: "38rem", margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h1>Digitales Anliegen</h1>
      <p style={{ marginBottom: "0.5rem", color: "#555" }}>
        Bitte wählen Sie aus, wofür Sie einen Fragebogenlink anfordern möchten.
        Die Praxis prüft Ihre Angaben und sendet Ihnen anschließend den passenden Link.
      </p>
      <p style={{ marginBottom: "2rem", color: "#777" }}>
        Wenn Ihr Anliegen nicht zu diesen Punkten passt, schreiben Sie uns bitte
        wie gewohnt eine Nachricht.
      </p>

      <form method="POST" action={`/api/anfrage/${validation.slug}`}>
        {/* Name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="submitter_name" style={{ display: "block", marginBottom: "0.25rem" }}>
            Ihr Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="submitter_name"
            name="submitter_name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
          />
        </div>

        {/* E-Mail */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: "0.25rem" }}>
            E-Mail-Adresse <span aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>

        {/* Geburtsdatum (Pflichtfeld) */}
        <div style={{ marginBottom: "1.75rem" }}>
          <label htmlFor="birth_date" style={{ display: "block", marginBottom: "0.25rem" }}>
            Geburtsdatum <span aria-hidden="true">*</span>
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            required
            autoComplete="bday"
            style={{
              display: "block",
              width: "100%",
              maxWidth: "16rem",
              fontFamily: "inherit",
              fontSize: "1rem",
              lineHeight: "1.5",
              padding: "0.5rem 0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--input-background)",
            }}
          />
        </div>

        {/* Anliegen-Auswahl (Pflichtfeld, Mehrfachauswahl) */}
        <div style={{ marginBottom: "2rem" }} role="group" aria-labelledby="topics-label">
          <p id="topics-label" style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
            Anliegen <span aria-hidden="true">*</span>
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
            data-testid="topic-checkboxes"
          >
            {(Object.entries(DIGITAL_REQUEST_TOPICS) as [string, string][]).map(
              ([value, label]) => (
                <label
                  key={value}
                  style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontWeight: 400 }}
                >
                  <input
                    type="checkbox"
                    name="requested_topic"
                    value={value}
                    style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
                  />
                  <span>{label}</span>
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
          style={{ marginTop: "2rem" }}
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
