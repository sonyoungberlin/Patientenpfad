/**
 * @jest-environment jsdom
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DigitalRequestIntakeFields } from "@/components/DigitalRequestIntakeFields";

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