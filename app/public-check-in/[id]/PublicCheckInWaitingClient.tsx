"use client";

import { useEffect, useState } from "react";

type State = "waiting" | "closed" | "questionnaire_ready" | "unavailable";

export function PublicCheckInWaitingClient({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>("waiting");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (!active) return;
      try {
        const response = await fetch(`/public-check-in/${sessionId}/status`, { cache: "no-store" });
        const data = await response.json().catch(() => null) as { state?: State } | null;
        const nextState = response.ok && data?.state ? data.state : "unavailable";
        if (!active) return;
        setState(nextState);
        if (nextState === "questionnaire_ready") {
          window.location.replace(`/public-check-in/${sessionId}/continue`);
          return;
        }
        if (nextState === "waiting") timer = setTimeout(poll, 2000);
      } catch {
        if (active) timer = setTimeout(poll, 4000);
      }
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [sessionId]);

  if (state === "closed") return <p data-public-check-in-closed>Ihr Check-in ist abgeschlossen.</p>;
  if (state === "unavailable") return <p data-public-check-in-unavailable>Dieser Check-in ist nicht mehr verfügbar.</p>;
  return <p data-public-check-in-waiting>Bitte lassen Sie diese Seite geöffnet.</p>;
}