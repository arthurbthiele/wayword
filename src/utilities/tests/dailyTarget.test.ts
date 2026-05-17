import { getTargetForDate, getUtcDateString } from "../dailyTarget";
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

describe("getUtcDateString", () => {
  it("formats a date as YYYY-MM-DD using UTC components", () => {
    const date = new Date(Date.UTC(2026, 4, 7)); // May 7 UTC
    expect(getUtcDateString(date)).toBe("2026-05-07");
  });

  it("uses UTC, not local time, near midnight", () => {
    // 2026-05-07 23:30:00 UTC — would be 2026-05-08 in any timezone east of UTC.
    const date = new Date(Date.UTC(2026, 4, 7, 23, 30, 0));
    expect(getUtcDateString(date)).toBe("2026-05-07");
  });
});
