// Per-date overrides for daily and triple puzzles.
//
// Adding an entry pins that calendar day's puzzle to specific words. Used
// for two reasons:
//
//   1. **Migration smoothness across dict changes.** When we re-build the
//      dictionary, the deterministic picker produces different start/target
//      pairs for past dates. Pinning ensures players mid-game don't see
//      their puzzle "change underneath them" on deploy day.
//
//   2. **Themed / hand-picked puzzles.** Future use — e.g. a holiday
//      puzzle, a milestone-day puzzle, a partner-collab puzzle.
//
// The picker checks the override map first; if no entry, falls back to
// the deterministic date-hash logic.

export type DailyOverride = { start: string; target: string };
export type TripleOverride = { start: string; t1: string; t2: string };

/**
 * Date-string → daily puzzle. Date strings use the same format as
 * `getLocalDateString()`: `YYYY-MM-DD`. The picker matches on the player's
 * local date.
 */
export const dailyOverrides: Record<string, DailyOverride> = {
  // 2026-06-01 / 2026-06-02 pinned to the prod (tier-10) values so the
  // dict-swap deploy doesn't disrupt users mid-game on these days.
  "2026-06-01": { start: "raised", target: "rover" },
  "2026-06-02": { start: "plain", target: "held" },
};

export const tripleOverrides: Record<string, TripleOverride> = {
  "2026-06-01": { start: "stop", t1: "few", t2: "heat" },
  "2026-06-02": { start: "slip", t1: "know", t2: "post" },
};
