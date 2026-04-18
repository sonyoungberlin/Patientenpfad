"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";

export function M2LinkGeneratorClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/cases/${caseId}/m2-link`, {
        method: "POST",
      });
      const data = (await response.json()) as { link?: string };

      const link = typeof data.link === "string" ? data.link : "";

      if (!response.ok || !link) {
        setLink(null);
        setError("Link konnte nicht erzeugt werden.");
        return;
      }

      setLink(link);
    } catch {
      setLink(null);
      setError("Link konnte nicht erzeugt werden.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  return (
    <section
      data-m2-link-generator
      style={{
        marginBottom: "2rem",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "1.5rem",
      }}
    >
      <h2>Patient einbinden</h2>
      <button
        type="button"
        data-generate-m2-link
        onClick={() => void generateLink()}
        disabled={loading}
      >
        {loading ? "Wird erzeugt…" : "M2-Link für Patient erzeugen"}
      </button>
      {error ? (
        <p className="text-error" role="alert" aria-live="polite" style={{ marginTop: "0.5rem" }}>
          {error}
        </p>
      ) : null}
      {link ? (
        <div style={{ marginTop: "0.75rem" }}>
          <code
            data-m2-generated-link
            style={{
              display: "block",
              wordBreak: "break-all",
              background: "var(--input-background)",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            {link}
          </code>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" data-copy-m2-link onClick={() => void copyLink()}>
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            <button
              type="button"
              className="btn-primary"
              data-goto-m3
              onClick={() => router.push(buildCaseM3Path(caseId))}
            >
              Weiter zur ärztlichen Checkliste →
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
