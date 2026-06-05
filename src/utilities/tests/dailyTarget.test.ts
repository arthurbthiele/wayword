import {
  getLocalDateString,
  getDailyDistanceBand,
  getDailyPair,
} from "../dailyTarget";
import { bfsDistancesLegitimate } from "../legitimateGraph";

describe("getLocalDateString", () => {
  it("formats a date as YYYY-MM-DD using local components", () => {
    // new Date(year, month, day) uses local time. May 7 local.
    const date = new Date(2026, 4, 7);
    expect(getLocalDateString(date)).toBe("2026-05-07");
  });

  it("uses local time at 23:30 (stays same day)", () => {
    // 2026-05-07 23:30:00 local — same local date regardless of timezone.
    const date = new Date(2026, 4, 7, 23, 30, 0);
    expect(getLocalDateString(date)).toBe("2026-05-07");
  });
});

describe("getDailyDistanceBand", () => {
  // 2026-06-05 = Friday; -06 = Sat; -07 = Sun; -08 = Mon.
  it("returns the standard 4-7 band on weekdays", () => {
    expect(getDailyDistanceBand("2026-06-05")).toEqual({ min: 4, max: 7 });
    expect(getDailyDistanceBand("2026-06-08")).toEqual({ min: 4, max: 7 });
  });
  it("locks Saturday to 8", () => {
    expect(getDailyDistanceBand("2026-06-06")).toEqual({ min: 8, max: 8 });
  });
  it("locks Sunday to 9", () => {
    expect(getDailyDistanceBand("2026-06-07")).toEqual({ min: 9, max: 9 });
  });
});

describe("getDailyPair — weekday difficulty", () => {
  const optimalMoves = (start: string, target: string): number =>
    bfsDistancesLegitimate(start).get(target) ?? -1;

  it("Saturday's puzzle has optimal exactly 8", () => {
    // Multiple Saturdays to catch any edge case.
    for (const date of ["2026-06-13", "2026-06-20", "2026-07-04"]) {
      const { start, target } = getDailyPair(date);
      expect(optimalMoves(start, target)).toBe(8);
    }
  });
  it("Sunday's puzzle has optimal exactly 9", () => {
    for (const date of ["2026-06-14", "2026-06-21", "2026-07-05"]) {
      const { start, target } = getDailyPair(date);
      expect(optimalMoves(start, target)).toBe(9);
    }
  });
  it("weekday puzzles fall in [4, 7]", () => {
    for (const date of ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"]) {
      const { start, target } = getDailyPair(date);
      const moves = optimalMoves(start, target);
      expect(moves).toBeGreaterThanOrEqual(4);
      expect(moves).toBeLessThanOrEqual(7);
    }
  });
});
