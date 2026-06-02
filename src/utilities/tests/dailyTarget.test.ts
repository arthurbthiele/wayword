import { getLocalDateString } from "../dailyTarget";

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
