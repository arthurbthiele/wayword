import { getLocalDateString } from "./dailyTarget";

export type DailyHistoryEntry = {
  start: string;
  target: string;
  userMoves: number;
  optimalMoves: number | null;
  /**
   * Hints the player used before solving this puzzle. Optional for
   * back-compat with entries recorded before the hint feature shipped.
   * Treat absent as 0.
   */
  hintsUsed?: number;
};

export type DailyHistory = Record<string, DailyHistoryEntry>;

export type TripleHistoryEntry = {
  start: string;
  t1: string;
  t2: string;
  // For Triple, `userMoves` = words the player added on the joining tree,
  // `optimalMoves` = edges in the optimal Steiner tree. Same shape as
  // daily so the stats helpers below work for both.
  userMoves: number;
  optimalMoves: number | null;
};

export type TripleHistory = Record<string, TripleHistoryEntry>;

/**
 * Current consecutive-day streak. If today's puzzle isn't in history yet,
 * we don't break the streak — we just start counting from yesterday.
 *
 * Accepts either DailyHistory or TripleHistory (anything keyed by
 * YYYY-MM-DD date strings).
 *
 * Must use *local* date arithmetic: history keys come from
 * `getLocalDateString`, so walking the cursor back must move one local
 * calendar day at a time. Using `setUTCDate` here was a latent bug — in
 * any non-UTC timezone it can land on the same local date twice (positive
 * UTC offset, near midnight) or skip one (negative offset), quietly
 * miscounting streaks.
 */
export const computeStreak = (
  history: Record<string, unknown>,
  now: Date = new Date()
): number => {
  const todayStr = getLocalDateString(now);
  const cursor = new Date(now);
  if (!history[todayStr]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  for (let i = 0; i < 1000; i++) {
    const dateStr = getLocalDateString(cursor);
    if (!history[dateStr]) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export type DailyStats = {
  totalSolved: number;
  /** Solves where the user matched OR beat common-word optimal (diff ≤ 0). */
  optimalOrBetter: number;
  averageOverOptimal: number | null;
};

export const computeStats = (
  history: Record<string, { userMoves: number; optimalMoves: number | null }>
): DailyStats => {
  const entries = Object.values(history);
  let optimalOrBetter = 0;
  let totalDiff = 0;
  let diffCount = 0;
  for (const entry of entries) {
    if (entry.optimalMoves === null) continue;
    const diff = entry.userMoves - entry.optimalMoves;
    if (diff <= 0) optimalOrBetter++;
    totalDiff += diff;
    diffCount++;
  }
  return {
    totalSolved: entries.length,
    optimalOrBetter,
    averageOverOptimal: diffCount > 0 ? totalDiff / diffCount : null,
  };
};
