import { describe, expect, it } from "vitest";
import {
  resetStubState,
  stubInsertAccount,
  stubInsertProfile,
  stubSignUp,
} from "@/lib/auth/stub-store";
import { stubExportBriefPdf, stubGenerateBrief } from "./generate-stub";

describe("stub brief generators", () => {
  it("creates morning, instrument, and portfolio briefs and a PDF data URL", async () => {
    resetStubState();
    const user = stubSignUp("brief@example.com", "password12");
    stubInsertProfile(user.id);
    stubInsertAccount(user.id);
    const morning = await stubGenerateBrief({ userId: user.id, kind: "morning" });
    expect(morning.brief.kind).toBe("morning");
    const health = await stubGenerateBrief({ userId: user.id, kind: "portfolio" });
    expect(health.brief.content_md).toContain("Portfolio Health");
    const inst = await stubGenerateBrief({
      userId: user.id,
      kind: "instrument",
      subject: "AAPL",
    });
    expect(inst.brief.subject).toBe("AAPL");
    const pdf = stubExportBriefPdf(user.id, morning.brief.id);
    expect(pdf?.download_url.startsWith("data:application/pdf")).toBe(true);
  });
});
