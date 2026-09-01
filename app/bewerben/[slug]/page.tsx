/**
 * Öffentliches Bewerbungsformular `/bewerben/[slug]`.
 *
 * Gate: practice.is_approved && practice.office_cases_enabled.
 * Alle negativen Fälle → notFound() (404), damit Slug-Existenz nicht
 * enumerierbar ist.
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { HONEYPOT_FIELD_NAME } from "@/lib/websiteForms/submitValidation";
import { OFFICE_APPLICATION_ROLES } from "@/lib/digitalRequests/applicationRoles";
import { resolvePracticeByPublicOrLegacySlug } from "@/lib/practice/publicProfile";
import {
  getPublicPracticeIdentityById,
  publicPracticeName,
} from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";
import { PRACTICE_SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/practice/lifecycle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BewerbenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const validation = validateSlug(slug);
  if (!validation.ok) {
    notFound();
  }

  const practice = await resolvePracticeByPublicOrLegacySlug(
    validation.slug,
    (where) =>
      prisma.practice.findUnique({
        where,
        select: {
            is_approved: true,
            disabled_at: true,
          id: true,
          office_cases_enabled: true,
          name: true,
        },
      }),
  );

  if (practice?.disabled_at != null) {
    return <main><p>{PRACTICE_SERVICE_UNAVAILABLE_MESSAGE}</p></main>;
  }
  if (!practice || !practice.is_approved || !practice.office_cases_enabled) {
    notFound();
  }
  const publicPractice = await getPublicPracticeIdentityById(practice.id);

  const roleEntries = Object.entries(OFFICE_APPLICATION_ROLES) as [
    string,
    string,
  ][];

  return (
    <main style={{ maxWidth: "38rem", margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h1>Bewerben bei {publicPractice ? publicPracticeName(publicPractice) : practice.name}</h1>
      <p style={{ marginBottom: "2rem", color: "#555" }}>
        Füllen Sie das Formular aus. Die Praxis meldet sich nach Prüfung Ihrer
        Angaben bei Ihnen.
      </p>

      <form method="POST" action={`/api/bewerben/${validation.slug}`}>
        {/* Name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            htmlFor="submitter_name"
            style={{ display: "block", marginBottom: "0.25rem" }}
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
            style={{ display: "block", width: "100%" }}
          />
        </div>

        {/* E-Mail */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            htmlFor="email"
            style={{ display: "block", marginBottom: "0.25rem" }}
          >
            E-Mail-Adresse <span aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{ display: "block", width: "100%" }}
          />
        </div>

        {/* Rollen-Auswahl */}
        <fieldset style={{ marginBottom: "1.75rem", border: "none", padding: 0 }}>
          <legend style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Ich möchte mich bewerben als: <span aria-hidden="true">*</span>
          </legend>
          {roleEntries.map(([key, label]) => (
            <label
              key={key}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}
            >
              <input type="checkbox" name="requested_role" value={key} />
              {label}
            </label>
          ))}
        </fieldset>

        {/* Freitext (optional) */}
        <div style={{ marginBottom: "1.75rem" }}>
          <label
            htmlFor="concern_text"
            style={{ display: "block", marginBottom: "0.25rem" }}
          >
            Nachricht (optional)
          </label>
          <textarea
            id="concern_text"
            name="concern_text"
            maxLength={500}
            rows={4}
            style={{ display: "block", width: "100%" }}
          />
        </div>

        {/* Honeypot – verstecktes Feld, von echten Nutzern nicht ausgefüllt */}
        <input
          type="text"
          name={HONEYPOT_FIELD_NAME}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ display: "none" }}
        />

        <button type="submit">Bewerbung absenden</button>
      </form>
      {publicPractice && <PublicPracticeFooter practice={publicPractice} />}
    </main>
  );
}
