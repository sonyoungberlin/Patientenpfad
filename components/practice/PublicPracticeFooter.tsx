import Link from "next/link";
import {
  publicPracticeName,
  publicPracticeSlug,
  type PublicPracticeIdentity,
} from "@/lib/practice/publicIdentity";

export function PublicPracticeFooter({ practice }: { practice: PublicPracticeIdentity }) {
  const profile = practice.legal_profile;
  const slug = publicPracticeSlug(practice);
  const address = profile
    ? `${profile.street} ${profile.house_number} · ${profile.postal_code} ${profile.city}`
    : null;

  return (
    <footer
      data-public-practice-footer={practice.id}
      style={{ marginTop: "2.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", fontSize: "0.85rem", color: "var(--muted-foreground)" }}
    >
      <p style={{ margin: 0 }}>
        {publicPracticeName(practice)}{address ? ` · ${address}` : ""}
      </p>
      {profile && (
        <p style={{ margin: "0.25rem 0 0" }}>
          {profile.phone} · {profile.official_email}
        </p>
      )}
      <nav style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem" }}>
        <Link href={`/praxis/${slug}/impressum`}>Impressum</Link>
        <Link href={`/praxis/${slug}/datenschutz`}>Datenschutz</Link>
      </nav>
    </footer>
  );
}