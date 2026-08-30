"use client";

import { useState } from "react";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";

const STRINGS = {
  de: {
    heading: "Persönlicher Fragebogenlink",
    paragraphs: [
      "Dieser Fragebogen wurde Ihnen von Ihrer Praxis über einen persönlichen Link bereitgestellt.",
      "Öffnen und beantworten Sie ihn nur, wenn Sie diesen Link von Ihrer Praxis erhalten haben.",
      "Der Link ist zeitlich begrenzt und kann nach erfolgreicher Übermittlung nicht erneut verwendet werden.",
    ],
    open: "Fragebogen öffnen",
  },
  en: {
    heading: "Personal questionnaire link",
    paragraphs: [
      "This questionnaire was provided to you by your practice through a personal link.",
      "Only open and answer it if you received this link from your practice.",
      "The link is time-limited and cannot be used again after successful submission.",
    ],
    open: "Open questionnaire",
  },
} as const;

export function PersonalLinkNotice({
  children,
  language = "de",
}: {
  children: React.ReactNode;
  language?: QuestionnaireLanguage;
}) {
  const [opened, setOpened] = useState(false);
  const text = STRINGS[language];

  if (opened) return <>{children}</>;

  return (
    <section data-personal-link-notice className="card">
      <h2>{text.heading}</h2>
      {text.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <button
        type="button"
        className="btn-primary"
        data-open-questionnaire
        onClick={() => setOpened(true)}
      >
        {text.open}
      </button>
    </section>
  );
}