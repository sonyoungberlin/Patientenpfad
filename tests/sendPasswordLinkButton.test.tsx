/**
 * Tests für app/admin/accounts/SendPasswordLinkButton.tsx
 *
 * Wir testen primär die pure Mapping-Funktion `interpretSetupLinkResponse`,
 * die aus der API-Antwort den UI-Status ableitet, plus eine Static-Render-
 * Sicherung für den manuellen Fallback (delivery="manual"). Damit ist Test 2
 * aus der Aufgabenstellung abgedeckt: Admin-Button zeigt Kopiermöglichkeit
 * bei `manual`.
 */

import { renderToStaticMarkup } from "react-dom/server";
import {
  SendPasswordLinkButton,
  SendPasswordLinkStatusView,
  interpretSetupLinkResponse,
} from "@/app/admin/accounts/SendPasswordLinkButton";

describe("interpretSetupLinkResponse", () => {
  it("delivery='email' → kind 'email'", () => {
    expect(interpretSetupLinkResponse({ ok: true, delivery: "email" })).toEqual(
      { kind: "email" },
    );
  });

  it("delivery='manual' mit setupUrl → kind 'manual' inkl. setupUrl", () => {
    const res = interpretSetupLinkResponse({
      ok: true,
      delivery: "manual",
      setupUrl: "https://app.example.com/account/set-password?token=abc",
    });
    expect(res).toEqual({
      kind: "manual",
      setupUrl: "https://app.example.com/account/set-password?token=abc",
      copied: false,
    });
  });

  it("delivery='manual' OHNE setupUrl → fällt auf neutrales 'ok' zurück (kein Leak)", () => {
    expect(
      interpretSetupLinkResponse({ ok: true, delivery: "manual" }),
    ).toEqual({ kind: "ok" });
  });

  it("delivery='none' → kind 'none'", () => {
    expect(interpretSetupLinkResponse({ ok: true, delivery: "none" })).toEqual({
      kind: "none",
    });
  });

  it("Generisches { ok: true } (Nicht-Admin-Antwort) → kind 'ok'", () => {
    expect(interpretSetupLinkResponse({ ok: true })).toEqual({ kind: "ok" });
  });

  it("Unbekannte / leere Antwort → kind 'ok' (defensiv)", () => {
    expect(interpretSetupLinkResponse(null)).toEqual({ kind: "ok" });
    expect(interpretSetupLinkResponse({})).toEqual({ kind: "ok" });
    expect(interpretSetupLinkResponse({ ok: false })).toEqual({ kind: "ok" });
  });
});

describe("<SendPasswordLinkButton /> – Static Render", () => {
  it("Initial-Render zeigt Aktions-Button", () => {
    const html = renderToStaticMarkup(
      <SendPasswordLinkButton email="user@example.com" />,
    );
    expect(html).toContain("Passwort-Link senden");
    expect(html).toContain('data-send-password-link="user@example.com"');
    // Im idle-Status werden weder Erfolg, noch manual-UI gerendert.
    expect(html).not.toContain("Mailversand nicht möglich");
    expect(html).not.toContain("Link kopieren");
  });
});

describe("<SendPasswordLinkStatusView /> – delivery branches", () => {
  const SETUP_URL =
    "https://app.example.com/account/set-password?token=deadbeef";

  it("delivery='manual' rendert Hinweis, Kopier-Button und readonly Link-Feld", () => {
    const html = renderToStaticMarkup(
      <SendPasswordLinkStatusView
        email="user@example.com"
        status={{ kind: "manual", setupUrl: SETUP_URL, copied: false }}
      />,
    );
    expect(html).toContain(
      "Mailversand nicht möglich. Link kopieren und sicher weitergeben.",
    );
    expect(html).toContain("Link kopieren");
    expect(html).toContain('data-send-password-link-copy="user@example.com"');
    expect(html).toContain('data-send-password-link-url="user@example.com"');
    expect(html).toContain('readOnly=""');
    expect(html).toContain(SETUP_URL);
  });

  it("delivery='manual' nach Kopie zeigt 'Kopiert'-Status", () => {
    const html = renderToStaticMarkup(
      <SendPasswordLinkStatusView
        email="user@example.com"
        status={{ kind: "manual", setupUrl: SETUP_URL, copied: true }}
      />,
    );
    expect(html).toContain("Kopiert");
  });

  it("delivery='email' zeigt Erfolgsmeldung, KEIN Kopier-UI", () => {
    const html = renderToStaticMarkup(
      <SendPasswordLinkStatusView
        email="user@example.com"
        status={{ kind: "email" }}
      />,
    );
    expect(html).toContain("Passwort-Link wurde versendet.");
    expect(html).not.toContain("Link kopieren");
    expect(html).not.toContain("Mailversand nicht möglich");
  });

  it("delivery='none' zeigt neutrale Meldung", () => {
    const html = renderToStaticMarkup(
      <SendPasswordLinkStatusView
        email="user@example.com"
        status={{ kind: "none" }}
      />,
    );
    expect(html).toContain("Anfrage verarbeitet.");
    expect(html).not.toContain("Link kopieren");
  });

  it("Generischer ok-Status (Nicht-Admin-Antwort) zeigt neutrale Meldung", () => {
    const html = renderToStaticMarkup(
      <SendPasswordLinkStatusView
        email="user@example.com"
        status={{ kind: "ok" }}
      />,
    );
    expect(html).toContain("Anfrage verarbeitet.");
    // Insbesondere KEIN Token / KEINE setupUrl rendern.
    expect(html).not.toContain("set-password?token=");
  });
});
