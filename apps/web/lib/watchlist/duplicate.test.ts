import { describe, expect, it } from "vitest";
import { duplicateWatchlistItemMessage } from "@meridian/schemas";
import { duplicateItemResult, findDuplicateInstrument } from "./duplicate";

const AAPL = "11111111-1111-4111-8111-111111111111";

describe("watchlist duplicate guard (AC-007-01)", () => {
  it("detects a second add of the same instrument", () => {
    expect(findDuplicateInstrument([{ instrument_id: AAPL }], AAPL)).toBe(true);
    expect(findDuplicateInstrument([], AAPL)).toBe(false);
    expect(duplicateItemResult("AAPL").message).toBe(duplicateWatchlistItemMessage("AAPL"));
  });
});
