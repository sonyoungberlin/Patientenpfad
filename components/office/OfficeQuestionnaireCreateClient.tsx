"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BlockDef = {
  id: string;
  label: string;
};

type Props = {
  blocks: BlockDef[];
};

export default function OfficeQuestionnaireCreateClient({ blocks }: Props) {
  const router = useRouter();

  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    // Alle Blöcke standardmäßig ausgewählt
    () => new Set(blocks.map((b) => b.id)),
  );
  const [recipientReference, setRecipientReference] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleBlock(id: string) {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ids = Array.from(selectedBlockIds);
    if (ids.length === 0) {
      setError("Bitte mindestens einen Abschnitt auswählen.");
      return;
    }
    if (!recipientReference.trim()) {
      setError("Bitte eine Referenz angeben.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/office-cases/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_block_ids: ids,
          recipient_reference: recipientReference.trim(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; link?: string; error?: string };
      if (data.ok && data.link) {
        setGeneratedLink(data.link);
      } else {
        setError(data.error ?? "Fragebogen konnte nicht erstellt werden.");
      }
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: Link manuell markieren
    }
  }

  if (generatedLink) {
    return (
      <div style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
        <p>
          Fragebogen-Link erstellt. Diesen Link an den Bewerber weitergeben:
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <code
            style={{
              background: "var(--muted, #f1f5f9)",
              padding: "0.4rem 0.6rem",
              borderRadius: "var(--radius)",
              wordBreak: "break-all",
              flex: 1,
              minWidth: "200px",
            }}
            data-office-q-link
          >
            {generatedLink}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="btn text-small"
            data-office-q-copy
          >
            {copied ? "Kopiert!" : "Link kopieren"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push("/office-cases/questionnaire")}
          className="btn"
        >
          Zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: "1.25rem", maxWidth: "500px" }}
    >
      <div>
        <label
          htmlFor="office-q-recipient"
          style={{
            display: "block",
            marginBottom: "0.25rem",
            fontWeight: 500,
          }}
        >
          Referenz (z.B. Bewerbername oder Stelle)
        </label>
        <input
          id="office-q-recipient"
          type="text"
          value={recipientReference}
          onChange={(e) => setRecipientReference(e.target.value)}
          placeholder="z.B. Max Mustermann – MFA"
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            boxSizing: "border-box",
          }}
          required
        />
      </div>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          style={{
            fontWeight: 500,
            marginBottom: "0.5rem",
            paddingBottom: "0.25rem",
            display: "block",
          }}
        >
          Abschnitte auswählen
        </legend>
        <div style={{ display: "grid", gap: "0.375rem" }}>
          {blocks.map((block) => (
            <label
              key={block.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedBlockIds.has(block.id)}
                onChange={() => toggleBlock(block.id)}
                data-office-q-block={block.id}
              />
              {block.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p style={{ color: "var(--error, #ef4444)", margin: 0 }}>{error}</p>
      )}

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Wird erstellt…" : "Fragebogen-Link erstellen"}
      </button>
    </form>
  );
}
