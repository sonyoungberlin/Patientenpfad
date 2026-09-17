import { createHash } from "crypto";
import { QuestionnaireArtifactType } from "@prisma/client";
import {
  acknowledgeAutoDownloadDelivery,
  acquireAutoDownloadArtifactLease,
  AUTO_DOWNLOAD_LEASE_DURATION_MS,
} from "@/lib/autoDownloadDevices/delivery";
import {
  createAutoDownloadDeviceSecret,
  hashAutoDownloadDeviceSecret,
} from "@/lib/autoDownloadDevices/credentials";
import { QUESTIONNAIRE_EXPORT_FINALITY_FILTER } from "@/lib/questionnaire/exportFinality";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    questionnaireArtifactDelivery: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const deliveryDb = prisma.questionnaireArtifactDelivery as unknown as {
  upsert: jest.Mock;
  updateMany: jest.Mock;
};
const transaction = prisma.$transaction as jest.Mock;
const device = {
  deviceId: "device-1",
  practiceId: "practice-1",
  deviceName: "Praxisserver",
};
const candidate = {
  sessionId: "session-1",
  artifactType: "PDF" as const,
  artifact: {
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: "fragebogen.pdf",
    mimeType: "application/pdf",
  },
};

beforeEach(() => {
  deliveryDb.upsert.mockReset().mockResolvedValue({ id: "delivery-1" });
  deliveryDb.updateMany.mockReset().mockResolvedValue({ count: 1 });
  transaction.mockReset();
});

describe("Auto-Download-Leases", () => {
  it("setzt bei nativem FETCH ohne ACK nur den Lease und keinen finalen Session-Claim", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    const leased = await acquireAutoDownloadArtifactLease(candidate, device, now);

    expect(leased).toEqual(expect.objectContaining({
      deliveryId: "delivery-1",
      leaseToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      contentSha256: createHash("sha256").update(candidate.artifact.bytes).digest("hex"),
      leaseExpiresAt: new Date(now.getTime() + AUTO_DOWNLOAD_LEASE_DURATION_MS),
    }));
    const update = deliveryDb.updateMany.mock.calls[0][0];
    expect(update.where).toEqual(expect.objectContaining({
      acknowledged_at: null,
      OR: [{ lease_expires_at: null }, { lease_expires_at: { lte: now } }],
      session: { is: expect.objectContaining({ owner_practice_id: "practice-1" }) },
    }));
    expect(update.data).toEqual(expect.objectContaining({
      device_id: "device-1",
      lease_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      attempt_count: { increment: 1 },
      content_sha256: leased!.contentSha256,
    }));
    expect(JSON.stringify(update.data)).not.toContain(leased!.leaseToken);
    expect(transaction).not.toHaveBeenCalled();
    expect(update.where.session.is.AND).toEqual([
      QUESTIONNAIRE_EXPORT_FINALITY_FILTER,
    ]);
  });

  it("lässt bei parallelen Lease-Versuchen höchstens einen Gewinner zu", async () => {
    deliveryDb.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      acquireAutoDownloadArtifactLease(candidate, device),
      acquireAutoDownloadArtifactLease(candidate, device),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("erlaubt die Übernahme einer abgelaufenen Lease und erhöht attempt_count", async () => {
    const now = new Date("2026-09-13T13:00:00.000Z");

    await expect(acquireAutoDownloadArtifactLease(candidate, device, now))
      .resolves.not.toBeNull();
    expect(deliveryDb.updateMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ lease_expires_at: null }, { lease_expires_at: { lte: now } }],
      }),
      data: expect.objectContaining({ attempt_count: { increment: 1 } }),
    }));
  });
});

describe("Auto-Download-ACK", () => {
  const leaseToken = createAutoDownloadDeviceSecret();
  const now = new Date("2026-09-13T12:00:00.000Z");

  function transactionDb(overrides: Record<string, unknown> = {}) {
    const delivery = {
      id: "delivery-1",
      session_id: "session-1",
      artifact_type: QuestionnaireArtifactType.PDF,
      device_id: "device-1",
      lease_token_hash: hashAutoDownloadDeviceSecret(leaseToken),
      lease_expires_at: new Date(now.getTime() + 60_000),
      acknowledged_at: null,
      session: { owner_practice_id: "practice-1" },
      ...overrides,
    };
    const tx = {
      questionnaireArtifactDelivery: {
        findUnique: jest.fn().mockResolvedValue(delivery),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      patientQuestionnaireSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    transaction.mockImplementation((callback) => callback(tx));
    return tx;
  }

  it.each([
    [QuestionnaireArtifactType.PDF, "auto_pdf_download_claimed_at"],
    [QuestionnaireArtifactType.XML, "auto_xml_download_claimed_at"],
    [QuestionnaireArtifactType.GDT, "gdt_download_claimed_at"],
  ])("bestätigt %s, setzt den Browser-Sperrclaim und verhindert so ein Duplikat", async (artifactType, claimField) => {
    const tx = transactionDb({ artifact_type: artifactType });

    await expect(acknowledgeAutoDownloadDelivery(
      "delivery-1",
      leaseToken,
      device,
      now,
    )).resolves.toEqual({ ok: true, alreadyAcknowledged: false });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.questionnaireArtifactDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { acknowledged_at: now },
    }));
    expect(tx.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        owner_practice_id: "practice-1",
        AND: [QUESTIONNAIRE_EXPORT_FINALITY_FILTER],
        [claimField]: null,
      },
      data: { [claimField]: now },
    });
  });

  it("behandelt ein zweites identisches ACK idempotent", async () => {
    const tx = transactionDb({ acknowledged_at: new Date() });

    await expect(acknowledgeAutoDownloadDelivery(
      "delivery-1",
      leaseToken,
      device,
      now,
    )).resolves.toEqual({ ok: true, alreadyAcknowledged: true });
    expect(tx.questionnaireArtifactDelivery.updateMany).not.toHaveBeenCalled();
    expect(tx.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("weist falsches Gerät, falsches Token und abgelaufene Lease ab", async () => {
    transactionDb({ device_id: "other-device" });
    await expect(acknowledgeAutoDownloadDelivery("delivery-1", leaseToken, device, now))
      .resolves.toEqual({ ok: false, reason: "not_found" });

    transactionDb();
    await expect(acknowledgeAutoDownloadDelivery(
      "delivery-1",
      createAutoDownloadDeviceSecret(),
      device,
      now,
    )).resolves.toEqual({ ok: false, reason: "invalid_lease" });

    transactionDb({ lease_expires_at: now });
    await expect(acknowledgeAutoDownloadDelivery("delivery-1", leaseToken, device, now))
      .resolves.toEqual({ ok: false, reason: "expired_lease" });
  });

  it("wirft innerhalb derselben Transaktion, wenn der Session-Claim scheitert", async () => {
    const tx = transactionDb();
    tx.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(acknowledgeAutoDownloadDelivery(
      "delivery-1",
      leaseToken,
      device,
      now,
    )).rejects.toThrow("auto_download_delivery_session_claim_failed");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.questionnaireArtifactDelivery.updateMany).toHaveBeenCalled();
  });

  it("überschreibt einen zwischenzeitlich gesetzten Browserclaim nicht", async () => {
    const tx = transactionDb();
    tx.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 0 });
    tx.patientQuestionnaireSession.findFirst.mockResolvedValue({ id: "session-1" });

    await expect(acknowledgeAutoDownloadDelivery(
      "delivery-1",
      leaseToken,
      device,
      now,
    )).resolves.toEqual({ ok: true, alreadyAcknowledged: false });
    expect(tx.patientQuestionnaireSession.findFirst).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        owner_practice_id: "practice-1",
        AND: [QUESTIONNAIRE_EXPORT_FINALITY_FILTER],
        auto_pdf_download_claimed_at: { not: null },
      },
      select: { id: true },
    });
  });
});
