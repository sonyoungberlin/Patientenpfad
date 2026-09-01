jest.mock("@/lib/mail/smtpTransport", () => ({
  readSmtpConfigFromEnv: jest.fn(),
  sendViaSmtp: jest.fn(),
}));

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";
import { sendPasswordSetupEmail } from "@/lib/mail/sendPasswordSetupEmail";

const readConfigMock = readSmtpConfigFromEnv as jest.Mock;
const sendMock = sendViaSmtp as jest.Mock;
const originalMailTransport = process.env.MAIL_TRANSPORT;

const platformConfig: SmtpConfig = {
  host: "smtp.example.com",
  port: 587,
  user: "platform-user",
  pass: "test-only-password",
  from: "Patientenpfad <noreply@example.com>",
  secure: false,
};

afterEach(() => {
  jest.clearAllMocks();
  if (originalMailTransport === undefined) delete process.env.MAIL_TRANSPORT;
  else process.env.MAIL_TRANSPORT = originalMailTransport;
});

it("versendet Passwortmails erfolgreich ueber den Plattform-SMTP", async () => {
  readConfigMock.mockReturnValue(platformConfig);
  sendMock.mockResolvedValue(undefined);

  await expect(
    sendPasswordSetupEmail({
      to: "account@example.com",
      setupUrl: "https://app.example.com/account/set-password?token=test-token",
    }),
  ).resolves.toBe("smtp_env");

  expect(sendMock).toHaveBeenCalledWith(
    platformConfig,
    expect.objectContaining({
      to: "account@example.com",
      subject: "Passwort für Ihr Konto setzen",
      text: expect.stringContaining("https://app.example.com/account/set-password?token=test-token"),
    }),
  );
});

it("ignoriert practice_only fuer Plattformmails", async () => {
  process.env.MAIL_TRANSPORT = "practice_only";
  readConfigMock.mockReturnValue(platformConfig);
  sendMock.mockResolvedValue(undefined);

  await expect(
    sendPasswordSetupEmail({
      to: "account@example.com",
      setupUrl: "https://app.example.com/account/set-password?token=test-token",
    }),
  ).resolves.toBe("smtp_env");
  expect(sendMock).toHaveBeenCalledTimes(1);
});

it("meldet fehlende Plattform-Konfiguration als Fehler statt als Zustellung", async () => {
  readConfigMock.mockImplementation(() => {
    throw new Error("SMTP misconfigured: missing=[SMTP_HOST]");
  });

  await expect(
    sendPasswordSetupEmail({
      to: "account@example.com",
      setupUrl: "https://app.example.com/account/set-password?token=test-token",
    }),
  ).rejects.toThrow("SMTP misconfigured");
  expect(sendMock).not.toHaveBeenCalled();
});

it("propagiert SMTP-Fehler statt delivery=email zu simulieren", async () => {
  readConfigMock.mockReturnValue(platformConfig);
  sendMock.mockRejectedValue(new Error("smtp send failed"));

  await expect(
    sendPasswordSetupEmail({
      to: "account@example.com",
      setupUrl: "https://app.example.com/account/set-password?token=test-token",
    }),
  ).rejects.toThrow("smtp send failed");
});