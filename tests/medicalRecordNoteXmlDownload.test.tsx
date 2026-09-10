/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import MedicalRecordNoteCopyButton from "@/components/questionnaire/MedicalRecordNoteCopyButton";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob, "UTF-8");
  });
}

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:xml-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

it("erzeugt den XML-Blob und lädt ihn mit dem gelieferten Dateinamen herunter", async () => {
  let downloadedFilename = "";
  let downloadedHref = "";
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloadedFilename = this.download;
    downloadedHref = this.href;
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <MedicalRecordNoteCopyButton
      sessionId="session-1"
      noteText={'Zeile 1\n\nGröße & <Befund> "gut"'}
      xmlFilename="20260910_12345_Gesundheitsuntersuchung.xml"
    />,
  ));

  const button = container.querySelector<HTMLButtonElement>("[data-q-download-xml]")!;
  await act(async () => button.click());

  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
  expect(blob.type).toBe("application/xml;charset=utf-8");
  await expect(readBlob(blob)).resolves.toBe(
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<appExport version=\"1.0\"><section id=\"APP_TEXT\">" +
    "Zeile 1\n\nGröße &amp; &lt;Befund&gt; &quot;gut&quot;" +
    "</section></appExport>",
  );
  expect(downloadedFilename).toBe("20260910_12345_Gesundheitsuntersuchung.xml");
  expect(downloadedHref).toBe("blob:xml-export");
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:xml-export");
  expect(document.querySelector('a[download="20260910_12345_Gesundheitsuntersuchung.xml"]'))
    .toBeNull();

  await act(async () => root.unmount());
});

it("zeigt ohne XML-Dateinamen nur die bestehende Copy-Funktion", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <MedicalRecordNoteCopyButton sessionId="session-2" noteText="Text" />,
  ));

  expect(container.querySelector("[data-q-copy-note]")).not.toBeNull();
  expect(container.querySelector("[data-q-download-xml]")).toBeNull();

  await act(async () => root.unmount());
});