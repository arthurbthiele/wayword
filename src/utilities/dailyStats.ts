import { getLocalDateString } from "./dailyTarget";

export type DailyHistoryEntry = {
  start: string;
  target: string;
  userMoves: number;
  optimalMoves: number | null;
};

export type DailyHistory = Record<string, DailyHistoryEntry>;

/**
 * Current consecutive-day streak. If today's puzzle isn't in history yet,
 * we don't break the streak — we just start counting from yesterday.
 */
export const computeStreak = (history: DailyHistory): number => {
  const now = new Date();
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

export const computeStats = (history: DailyHistory): DailyStats => {
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
