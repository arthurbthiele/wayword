import { getUtcDateString } from "./dailyTarget";

export type DailyHistoryEntry = {
  start: string;
  target: string;
  userMoves: number;
  optimalMoves: number | null;
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
 */
export const computeStreak = (
  history: Record<string, unknown>
): number => {
  const now = new Date();
  const todayStr = getUtcDateString(now);
  const cursor = new Date(now);
  if (!history[todayStr]) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  for (let i = 0; i < 1000; i++) {
    const dateStr = getUtcDateString(cursor);
    if (!history[dateStr]) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
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
