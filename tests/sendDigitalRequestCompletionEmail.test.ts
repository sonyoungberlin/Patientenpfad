const sendViaSmtpMock = jest.fn();
const readSmtpConfigFromEnvMock = jest.fn();
const loadPracticeSmtpConfigMock = jest.fn();

jest.mock("@/lib/mail/smtpTransport", () => ({
  sendViaSmtp: (...args: unknown[]) => sendViaSmtpMock(...args),
  readSmtpConfigFromEnv: () => readSmtpConfigFromEnvMock(),
}));
jest.mock("@/lib/mail/practiceSmtp", () => ({
  loadPracticeSmtpConfig: (...args: unknown[]) => loadPracticeSmtpConfigMock(...args),
}));

import {
  buildDigitalRequestCompletionEmailBody,
  sendDigitalRequestCompletionEmail,
} from "@/lib/mail/sendDigitalRequestCompletionEmail";

describe("DigitalRequest-Abschlussmail", () => {
  beforeEach(() => {
    process.env.MAIL_TRANSPORT = "practice_only";
    sendViaSmtpMock.mockReset().mockResolvedValue(undefined);
    loadPracticeSmtpConfigMock.mockReset().mockResolvedValue({
      host: "smtp.example.com",
      port: 587,
      user: "user@example.com",
      pass: "secret",
      from: "noreply@example.com",
      secure: false,
    });
    readSmtpConfigFromEnvMock.mockReset();
  });

  it("enthält Nachricht und keine URL oder Questionnaire-Funktion", () => {
    const mail = buildDigitalRequestCompletionEmailBody({
      completionMessage: "Alles klar, danke.",
      practiceName: "Praxis Muster",
    });
    expect(mail.subject).toBe("Rückmeldung Ihrer Praxis");
    expect(mail.text).toContain("Alles klar, danke.");
    expect(mail.text).toContain("Guten Tag");
    expect(mail.text).toContain("Freundliche Grüße");
    expect(mail.text).not.toContain("/q/");
    expect(mail.text).not.toContain("Antwortbutton");
  });

  it("verwendet Practice-SMTP und den richtigen Empfänger", async () => {
    await sendDigitalRequestCompletionEmail({
      to: "patient@example.com",
      completionMessage: "Danke.",
      practiceName: "Praxis Muster",
      practiceId: "p-1",
    });
    expect(sendViaSmtpMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        to: "patient@example.com",
        text: expect.stringContaining("Danke."),
      }),
    );
  });
});
