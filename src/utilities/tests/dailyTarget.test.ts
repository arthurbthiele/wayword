import { getTargetForDate, getLocalDateString } from "../dailyTarget";
import { targetWords } from "../../dictionaryData/targets";

describe("getTargetForDate", () => {
  it("is deterministic for a given date string", () => {
    expect(getTargetForDate("2026-05-17")).toBe(getTargetForDate("2026-05-17"));
  });

  it("returns a word from the target list", () => {
    const target = getTargetForDate("2026-05-17");
    expect(targetWords).toContain(target);
  });

  it("returns different words for at least some date pairs", () => {
    const today = getTargetForDate("2026-05-17");
    const distinct = new Set<string>([today]);
    for (let i = 0; i < 30; i++) {
      distinct.add(getTargetForDate(`2026-06-${String(i + 1).padStart(2, "0")}`));
    }
    expect(distinct.size).toBeGreaterThan(5);
  });
});

describe("getLocalDateString", () => {
  it("formats a date as YYYY-MM-DD using local components", () => {
    const date = new Date(2026, 4, 7); // May 7 (month is 0-indexed)
    expect(getLocalDateString(date)).toBe("2026-05-07");
  });
});
