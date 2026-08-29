"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_NAME_LENGTH = 120;

export default function PublicPracticeProfileForm({
  initialPublicName,
  initialPublicSlug,
}: {
  initialPublicName: string;
  initialPublicSlug: string | null;
}) {
  const router = useRouter();
  const [publicName, setPublicName] = useState(initialPublicName);
  const [savedName, setSavedName] = useState(initialPublicName);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setPublicName(initialPublicName);
    setSavedName(initialPublicName);
    setPublicSlug(initialPublicSlug);
  }, [initialPublicName, initialPublicSlug]);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/practice/public-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_name: publicName }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        public_name?: string;
        public_slug?: string;
      };
      if (!data.ok) {
        setFeedback(data.error ?? "Fehler beim Speichern.");
        return;
      }

      const nextName = data.public_name ?? publicName.trim();
      setPublicName(nextName);
      setSavedName(nextName);
      setPublicSlug(data.public_slug ?? publicSlug);
      setFeedback("Gespeichert");
      router.refresh();
    } catch {
      setFeedback("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem" }} data-testid="public-practice-profile">
      <h2>Öffentlicher Praxisname</h2>
      <p className="text-muted" style={{ marginBottom: "0.75rem" }}>
        Dieser Name wird in Ihren öffentlichen Praxislinks verwendet.
      </p>
      <label style={{ display: "grid", gap: "0.25rem", maxWidth: "40rem" }}>
        <span>Öffentlicher Praxisname</span>
        <input
          type="text"
          value={publicName}
          minLength={3}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setPublicName(event.target.value)}
        />
      </label>
      {publicSlug && (
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Stabile URL-Kennung: <code>{publicSlug}</code>. Diese Kennung bleibt
          auch bei einer späteren Namensänderung unverändert.
        </p>
      )}
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || publicName === savedName}
        >
          {saving ? "Speichern …" : "Speichern"}
        </button>
        {feedback && <span role="status">{feedback}</span>}
      </div>
    </section>
  );
}