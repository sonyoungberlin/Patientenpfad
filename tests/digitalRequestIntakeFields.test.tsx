/**
 * @jest-environment jsdom
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DigitalRequestIntakeFields } from "@/components/DigitalRequestIntakeFields";

async function renderDigitalRequestForm() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <form>
        <DigitalRequestIntakeFields />
      </form>,
    );
  });
  await act(async () => {
    container.querySelector<HTMLInputElement>('input[name="patient_relationship"][value="existing_patient"]')!.click();
  });
  await act(async () => {
    container.querySelector<HTMLInputElement>('input[name="request_intent"][value="digital_request"]')!.click();
  });

  return {
    container,
    root,
    form: container.querySelector("form")!,
  };
}

describe("DigitalRequestIntakeFields — sichtbares Anliegen-Wording", () => {
  it("zeigt die neuen Anliegen-Texte und die Termin-Folgefrage", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DigitalRequestIntakeFields />);
    });

    await act(async () => {
      container.querySelector<HTMLInputElement>('input[name="patient_relationship"][value="existing_patient"]')!.click();
    });

    expect(container.textContent).toContain("Was ist Ihr Anliegen?");
    expect(container.textContent).toContain(
      "Ich habe bereits einen Termin und möchte den Grund für meinen Besuch angeben.",
    );
    expect(container.textContent).toContain("Ich möchte eine digitale Anfrage stellen.");

    await act(async () => {
      container.querySelector<HTMLInputElement>('input[name="request_intent"][value="existing_appointment"]')!.click();
    });

    expect(container.textContent).toContain("Worum geht es bei Ihrem Termin?");

    await act(async () => root.unmount());
    container.remove();
  });
});

describe("DigitalRequestIntakeFields — Anliegen-Pflichtvalidierung", () => {
  it("ist ohne Auswahl ungültig", async () => {
    const { container, root, form } = await renderDigitalRequestForm();
    const firstCheckbox = container.querySelector<HTMLInputElement>('input[name="requested_topic"][value="AU"]')!;

    expect(firstCheckbox.required).toBe(true);
    expect(form.checkValidity()).toBe(false);

    await act(async () => root.unmount());
    container.remove();
  });

  it.each([
    ["Arbeitsunfähigkeitsbescheinigung", "AU"],
    ["Rezept", "PRESCRIPTION"],
    ["Überweisung", "REFERRAL"],
  ])("ist mit ausschließlich %s gültig", async (_label, value) => {
    const { container, root, form } = await renderDigitalRequestForm();
    const selectedCheckbox = container.querySelector<HTMLInputElement>(`input[name="requested_topic"][value="${value}"]`)!;
    const firstCheckbox = container.querySelector<HTMLInputElement>('input[name="requested_topic"][value="AU"]')!;

    await act(async () => selectedCheckbox.click());

    expect(firstCheckbox.required).toBe(false);
    expect(form.checkValidity()).toBe(true);

    await act(async () => root.unmount());
    container.remove();
  });

  it("ist mit mehreren Anliegen gültig", async () => {
    const { container, root, form } = await renderDigitalRequestForm();

    await act(async () => {
      container.querySelector<HTMLInputElement>('input[name="requested_topic"][value="PRESCRIPTION"]')!.click();
      container.querySelector<HTMLInputElement>('input[name="requested_topic"][value="REFERRAL"]')!.click();
    });

    expect(form.checkValidity()).toBe(true);

    await act(async () => root.unmount());
    container.remove();
  });

  it("aktiviert die Pflichtvalidierung nach Abwahl der letzten Auswahl erneut", async () => {
    const { container, root, form } = await renderDigitalRequestForm();
    const selectedCheckbox = container.querySelector<HTMLInputElement>('input[name="requested_topic"][value="REFERRAL"]')!;
    const firstCheckbox = container.querySelector<HTMLInputElement>('input[name="requested_topic"][value="AU"]')!;

    await act(async () => selectedCheckbox.click());
    expect(form.checkValidity()).toBe(true);

    await act(async () => selectedCheckbox.click());

    expect(firstCheckbox.required).toBe(true);
    expect(form.checkValidity()).toBe(false);

    await act(async () => root.unmount());
    container.remove();
  });
});