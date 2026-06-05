import { computeStreak } from "../dailyStats";

const dummyEntry = { start: "a", target: "at", userMoves: 1, optimalMoves: 1 };

describe("computeStreak", () => {
  it("returns 0 with empty history", () => {
    expect(computeStreak({})).toBe(0);
  });

  it("counts a single solve on today as a streak of 1", () => {
    // Mid-day local on a fixed date so timezone offset doesn't flip the
    // calendar day.
    const now = new Date(2026, 5, 5, 12, 0, 0);
    expect(computeStreak({ "2026-06-05": dummyEntry }, now)).toBe(1);
  });

  it("counts back consecutively from today", () => {
    const now = new Date(2026, 5, 5, 12, 0, 0);
    const history = {
      "2026-06-05": dummyEntry,
      "2026-06-04": dummyEntry,
      "2026-06-03": dummyEntry,
    };
    expect(computeStreak(history, now)).toBe(3);
  });

  it("breaks at the first missing day", () => {
    const now = new Date(2026, 5, 5, 12, 0, 0);
    const history = {
      "2026-06-05": dummyEntry,
      "2026-06-04": dummyEntry,
      // 2026-06-03 missing — streak should be 2.
      "2026-06-02": dummyEntry,
    };
    expect(computeStreak(history, now)).toBe(2);
  });

  it("doesn't break if today isn't yet solved (counts back from yesterday)", () => {
    const now = new Date(2026, 5, 5, 12, 0, 0);
    const history = {
      // No 2026-06-05 entry, but yesterday + day before in.
      "2026-06-04": dummyEntry,
      "2026-06-03": dummyEntry,
    };
    expect(computeStreak(history, now)).toBe(2);
  });

  it("walks back through a calendar month boundary", () => {
    const now = new Date(2026, 6, 1, 12, 0, 0); // July 1
    const history = {
      "2026-07-01": dummyEntry,
      "2026-06-30": dummyEntry,
      "2026-06-29": dummyEntry,
    };
    expect(computeStreak(history, now)).toBe(3);
  });

  // Regression: under the old `setUTCDate` walk, calling computeStreak
  // late at night in a positive-UTC-offset zone (e.g. AEST = UTC+10)
  // would read the same local date twice and break the streak early.
  // With local-date arithmetic, the cursor always moves one local
  // calendar day, regardless of clock time or timezone.
  it("returns a correct streak when called late at night (local-date arithmetic)", () => {
    // 23:30 local on June 5 — under the old UTC-based walk this would
    // misbehave; with local-date math, the cursor steps June 5 → June 4
    // → June 3 cleanly.
    const lateAtNight = new Date(2026, 5, 5, 23, 30, 0);
    const history = {
      "2026-06-05": dummyEntry,
      "2026-06-04": dummyEntry,
      "2026-06-03": dummyEntry,
    };
    expect(computeStreak(history, lateAtNight)).toBe(3);
  });

  it("returns a correct streak when called early in the morning", () => {
    // 00:30 local on June 5 — mirror of the late-night case from the
    // other timezone direction.
    const earlyMorning = new Date(2026, 5, 5, 0, 30, 0);
    const history = {
      "2026-06-05": dummyEntry,
      "2026-06-04": dummyEntry,
    };
    expect(computeStreak(history, earlyMorning)).toBe(2);
  });
});
