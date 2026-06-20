/**
 * Tests für app/workflow-cases/layout.tsx — Auth-Guard
 */

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/authz", () => ({
  requireWorkflowAccessFromCookies: jest.fn(),
}));

import WorkflowCasesLayout from "@/app/workflow-cases/layout";
import { requireWorkflowAccessFromCookies } from "@/lib/authz";

const requireMock = requireWorkflowAccessFromCookies as jest.Mock;

beforeEach(() => {
  redirectMock.mockClear();
  requireMock.mockReset();
});

describe("WorkflowCasesLayout — Auth-Guard", () => {
  it("leitet nach /dashboard um wenn kein Account (null)", async () => {
    requireMock.mockResolvedValue(null);
    await expect(
      WorkflowCasesLayout({ children: null }),
    ).rejects.toThrow("__REDIRECT__:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("rendert children ohne Redirect wenn Account vorhanden", async () => {
    requireMock.mockResolvedValue({
      id: "acc-1",
      email: "test@example.com",
      is_approved: true,
      arbeitsprozesse_enabled: true,
    });
    await WorkflowCasesLayout({ children: "TEST_KIND" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
