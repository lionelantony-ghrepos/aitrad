import { beforeEach, describe, expect, it } from "vitest";
import { compileAlertTemplate } from "@meridian/rules-engine";
import { stubEvaluateAlerts } from "./evaluate-stub";
import {
  resetStubState,
  stubCreateAlertRule,
  stubSignUp,
  STUB_AAPL_INSTRUMENT_ID,
} from "@/lib/auth/stub-store";

describe("stubEvaluateAlerts", () => {
  beforeEach(() => {
    resetStubState();
  });

  it("fires once then throttles a recross in the same minute", async () => {
    const user = stubSignUp("a@example.com", "pw");
    const now = "2026-09-09T14:00:00.000Z";
    stubCreateAlertRule({
      id: "44444444-4444-4444-8444-444444444444",
      user_id: user.id,
      instrument_id: STUB_AAPL_INSTRUMENT_ID,
      name: "AAPL above 200",
      kind: "price_cross_above",
      condition: compileAlertTemplate({ kind: "price_cross_above", threshold: 200 }),
      active: true,
      throttle_state: { last_eval_last: 189.6 },
      created_at: now,
      updated_at: now,
    });
    const first = await stubEvaluateAlerts({
      userId: user.id,
      clock: new Date(now),
      ticks: [
        {
          instrument_id: STUB_AAPL_INSTRUMENT_ID,
          symbol: "AAPL",
          bid: 200.9,
          ask: 201.1,
          last: 201,
          prev_close: 185,
          volume: 2,
          ts: now,
        },
      ],
    });
    expect(first).toHaveLength(1);
    await stubEvaluateAlerts({
      userId: user.id,
      clock: new Date(now),
      ticks: [
        {
          instrument_id: STUB_AAPL_INSTRUMENT_ID,
          symbol: "AAPL",
          bid: 198.9,
          ask: 199.1,
          last: 199,
          prev_close: 185,
          volume: 2,
          ts: now,
        },
      ],
    });
    const recross = await stubEvaluateAlerts({
      userId: user.id,
      clock: new Date(now),
      ticks: [
        {
          instrument_id: STUB_AAPL_INSTRUMENT_ID,
          symbol: "AAPL",
          bid: 209.9,
          ask: 210.1,
          last: 210,
          prev_close: 185,
          volume: 2,
          ts: now,
        },
      ],
    });
    expect(recross).toHaveLength(0);
  });
});
