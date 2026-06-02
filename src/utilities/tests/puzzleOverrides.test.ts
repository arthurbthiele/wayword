import { getDailyPair } from "../dailyTarget";
import { getDailyTriple } from "../tripleTarget";
import {
  dailyOverrides,
  tripleOverrides,
} from "../puzzleOverrides";

describe("puzzle overrides", () => {
  it("daily picker returns the pinned pair for an overridden date", () => {
    for (const [dateString, expected] of Object.entries(dailyOverrides)) {
      expect(getDailyPair(dateString)).toEqual({
        start: expected.start,
        target: expected.target,
      });
    }
  });

  it("triple picker returns the pinned triple for an overridden date", () => {
    for (const [dateString, expected] of Object.entries(tripleOverrides)) {
      const result = getDailyTriple(dateString);
      expect(result.start).toBe(expected.start);
      expect(result.t1).toBe(expected.t1);
      expect(result.t2).toBe(expected.t2);
      // optimalEdges should be a positive number; computed from Steiner tree.
      expect(result.optimalEdges).toBeGreaterThan(0);
    }
  });

  it("daily picker falls back to deterministic picker for non-overridden dates", () => {
    // A date far in the future that we haven't pinned.
    const result = getDailyPair("2099-01-01");
    expect(result.start).toBeTruthy();
    expect(result.target).toBeTruthy();
    expect(result.start).not.toBe(result.target);
  });
});
