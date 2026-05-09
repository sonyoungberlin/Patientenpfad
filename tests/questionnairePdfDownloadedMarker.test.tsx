/**
 * Tests für den "PDF heruntergeladen"-Marker.
 *
 * Prüft:
 * 1. Die PDF-Route setzt `pdf_downloaded_at` beim ersten erfolgreichen
 *    Download und genau diese Spalte (kein silent write auf andere Felder).
 * 2. Bereits markierte Sessions werden nicht erneut beschrieben.
 * 3. Soft-Deleted Sessions liefern weiterhin 404 und schreiben nichts.
 * 4. `QuestionnaireCard` zeigt je nach Marker den richtigen Button-Text und
 *    den dezenten Status-Hinweis.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock(
  "@/components/questionnaire/MedicalRecordNoteCopyButton",
  () =>
    function MockCopyButton() {
      return null;
    },
);

jest.mock(
  "@/components/questionnaire/QuestionnaireDeleteButton",
  () =>
    function MockDeleteButton() {
      return null;
    },
);

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { GET as PdfRoute } from "@/app/api/questionnaire/[id]/pdf/route";
import QuestionnaireCard from "@/components/questionnaire/QuestionnaireCard";

type PrismaMock = {
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getAcc = getSessionAccount as jest.Mock;

const PRACTICE_A = {
  id: "p-A",
  name: "Praxis A",
  slug: "praxis-a",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

const ACCOUNT_OWNER = {
  id: "acc-A1",
  email: "owner@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  current_practice: PRACTICE_A,
};

function pdfReq(id = "sess-1") {
  return new NextRequest(`http://localhost/api/questionnaire/${id}/pdf`, {
    method: "GET",
  });
}

const baseSession = {
  id: "sess-1",
  owner_account_id: "acc-A1",
  owner_practice_id: "p-A",
  status: "completed",
  patient_reference: null,
  submitted_at: new Date("2026-05-04T10:00:00Z"),
  submitted_by: "patient",
  selected_block_ids: ["KONTAKT"],
  deduplicated_questions: [],
  answers: {},
  identity_gate_completed_at: new Date("2026-05-04T10:00:00Z"),
  identity_gate_method: "dob",
  deleted_at: null,
};

beforeEach(() => {
  getAcc.mockReset();
  pm.patientQuestionnaireSession.findUnique.mockReset();
  pm.patientQuestionnaireSession.update.mockReset();
});

describe("GET /api/questionnaire/[id]/pdf — pdf_downloaded_at Marker", () => {
  it("setzt pdf_downloaded_at beim ersten Download und schreibt nur diese Spalte", async () => {
    getAcc.mockResolvedValue(ACCOUNT_OWNER);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      ...baseSession,
      pdf_downloaded_at: null,
    });
    pm.patientQuestionnaireSession.update.mockResolvedValue({});

    const res = await PdfRoute(pdfReq(), { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledTimes(1);
    const call = pm.patientQuestionnaireSession.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "sess-1" });
    expect(call.data.pdf_downloaded_at).toBeInstanceOf(Date);
    // Es darf keine andere Spalte mitgeschrieben werden (insbesondere nicht
    // answers, status, deleted_at).
    expect(Object.keys(call.data)).toEqual(["pdf_downloaded_at"]);
  });

  it("schreibt nicht erneut, wenn pdf_downloaded_at bereits gesetzt ist", async () => {
    getAcc.mockResolvedValue(ACCOUNT_OWNER);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      ...baseSession,
      pdf_downloaded_at: new Date("2026-05-01T08:00:00Z"),
    });

    const res = await PdfRoute(pdfReq(), { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(200);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Soft-Deleted Session → 404 und schreibt pdf_downloaded_at NICHT", async () => {
    getAcc.mockResolvedValue(ACCOUNT_OWNER);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      ...baseSession,
      pdf_downloaded_at: null,
      deleted_at: new Date("2026-05-04T09:00:00Z"),
    });

    const res = await PdfRoute(pdfReq(), { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("Antwort wird auch zurückgegeben, wenn der Marker-Update fehlschlägt", async () => {
    getAcc.mockResolvedValue(ACCOUNT_OWNER);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      ...baseSession,
      pdf_downloaded_at: null,
    });
    pm.patientQuestionnaireSession.update.mockRejectedValue(new Error("DB hiccup"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await PdfRoute(pdfReq(), { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});

describe("QuestionnaireCard — PDF-Status-Anzeige", () => {
  const baseProps = {
    id: "sess-1",
    displayedAt: new Date("2026-05-04T10:00:00Z"),
    patientReference: "Max Mustermann",
    blockLabels: "Kontakt",
    displayStatus: "completed",
    statusLabel: "Abgeschlossen",
    submittedBy: "patient",
    identityGateCompletedAt: null,
    questions: [],
    answers: null,
    noteText: "",
  };

  it('zeigt "PDF herunterladen" und keinen Status-Hinweis, wenn pdfDownloadedAt null', () => {
    const html = renderToStaticMarkup(
      QuestionnaireCard({ ...baseProps, pdfDownloadedAt: null }),
    );
    expect(html).toContain(">PDF herunterladen<");
    expect(html).not.toContain("PDF erneut herunterladen");
    expect(html).not.toContain("PDF heruntergeladen");
    expect(html).toContain('data-q-pdf-downloaded="false"');
  });

  it('zeigt "PDF erneut herunterladen" + Häkchen-Hinweis, wenn pdfDownloadedAt gesetzt', () => {
    const html = renderToStaticMarkup(
      QuestionnaireCard({
        ...baseProps,
        pdfDownloadedAt: new Date("2026-05-04T10:00:00Z"),
      }),
    );
    expect(html).toContain("PDF erneut herunterladen");
    expect(html).toContain("✓ PDF heruntergeladen");
    expect(html).toContain('data-q-pdf-downloaded="true"');
  });

  it("zeigt PDF-Block gar nicht, wenn nicht completed (auch mit gesetztem Marker)", () => {
    const html = renderToStaticMarkup(
      QuestionnaireCard({
        ...baseProps,
        displayStatus: "pending",
        pdfDownloadedAt: new Date("2026-05-04T10:00:00Z"),
      }),
    );
    expect(html).not.toContain("PDF herunterladen");
    expect(html).not.toContain("PDF erneut herunterladen");
    expect(html).not.toContain("PDF heruntergeladen");
  });
});
