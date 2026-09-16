"use client";

import { useEffect, useState } from "react";

type HandoffResponse = {
  ok: boolean;
  status?: "waiting" | "closed" | "questionnaire_ready";
  link?: string;
};

export function KioskCheckInWaitingClient({ sessionId }: { sessionId: string }) {
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(
          `/api/questionnaire-kiosk/check-in/${sessionId}/handoff`,
          { cache: "no-store" },
        );
        const data = await response.json().catch(() => null) as HandoffResponse | null;
        if (!active) return;
        if (response.status === 401) {
          window.location.replace("/questionnaire-kiosk/lock");
          return;
        }
        if (!response.ok || !data?.ok) throw new Error("poll failed");
        setConnectionError(false);
        if (data.status === "closed") {
          window.location.replace("/questionnaire-kiosk/direct");
          return;
        }
        if (data.status === "questionnaire_ready" && data.link) {
          window.location.replace(data.link);
          return;
        }
      } catch {
        if (active) setConnectionError(true);
      }
      if (active) timeout = setTimeout(poll, 2000);
    }

    void poll();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [sessionId]);

  return (
    <section aria-live="polite">
      <p>Bitte warten Sie. Die Praxis prüft Ihre Angaben.</p>
      {connectionError ? <p role="status">Verbindung wird erneut hergestellt …</p> : null}
    </section>
  );
}