"use client";

/**
 * Client-Island für `/p/[slug]`-Formulare.
 *
 * Aufgabe:
 *   Ergänzt die HTML-native Pattern-Validierung um eine Submit-Zeit-Prüfung,
 *   die auch `<textarea>`-Felder einbezieht (Browser werten `pattern` auf
 *   Textareas nicht aus). Bei verbotenen Zeichen wird der Submit gestoppt
 *   und unterhalb des Formulars eine lokalisierte Fehlermeldung angezeigt.
 *
 * Server-Validierung in `app/api/p/[slug]/submit/route.ts` ist die
 * autoritative Instanz; dieses Island liefert nur die unmittelbare
 * Patientenrückmeldung. Das Formular selbst bleibt eine reine HTML-Form.
 */

import { useEffect, useRef, useState } from "react";
import { ALLOWED_ANSWER_CHARACTERS_REGEX } from "@/lib/questionnaire/validateAnswerCharacters";

export function PublicFormCharactersValidator({
  errorMessage,
}: {
  errorMessage: string;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const form = wrapper.closest("form");
    if (!form) return;

    function clearFieldErrors(): void {
      // `form` ist im umgebenden Scope durch die Early-Return-Guard
      // bereits als HTMLFormElement bestätigt; TS verliert das beim
      // Closure, daher hier eine knappe Re-Assertion.
      const f = form as HTMLFormElement;
      const previouslyMarked = f.querySelectorAll<HTMLElement>(
        "[data-q-freetext][aria-invalid='true']",
      );
      previouslyMarked.forEach((el) => el.removeAttribute("aria-invalid"));
    }

    function handleSubmit(e: Event): void {
      const f = form as HTMLFormElement;
      const fields = f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "[data-q-freetext]",
      );
      const invalid: Array<HTMLInputElement | HTMLTextAreaElement> = [];
      fields.forEach((field) => {
        const v = field.value ?? "";
        if (v.length > 0 && !ALLOWED_ANSWER_CHARACTERS_REGEX.test(v)) {
          invalid.push(field);
        }
      });
      if (invalid.length > 0) {
        e.preventDefault();
        clearFieldErrors();
        invalid.forEach((field) => field.setAttribute("aria-invalid", "true"));
        setError(errorMessage);
        // Scroll first invalid field into view for direct feedback.
        invalid[0].focus();
      } else {
        setError(null);
        clearFieldErrors();
      }
    }

    form.addEventListener("submit", handleSubmit);
    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, [errorMessage]);

  return (
    <span ref={wrapperRef}>
      {error ? (
        <p
          className="text-error"
          role="alert"
          aria-live="polite"
          data-public-form-charerror
          style={{ marginTop: "0.5rem" }}
        >
          {error}
        </p>
      ) : null}
    </span>
  );
}
