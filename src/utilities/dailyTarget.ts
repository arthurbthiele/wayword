import {
  bfsDistancesLegitimate,
  getSortedLegitimate,
  isTrivialPlural,
  isViableStart,
} from "./legitimateGraph";
import { dailyOverrides } from "./puzzleOverrides";

/**
 * Today's date in the player's LOCAL timezone, formatted YYYY-MM-DD.
 * Local (not UTC) so the daily puzzle rolls over at local midnight —
 * matches user intuition that "a new day starts at midnight" on their
 * clock. Trade-off: two players in different timezones can see different
 * puzzles when comparing scores at the timezone boundary. Per-date
 * overrides (see `dailyOverrides.ts`) let us pin specific puzzles for
 * specific dates if a particular calendar day matters.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


// Day 1 of daily-challenge mode. The day number is computed as days elapsed
// from this date in UTC, +1 (so launch day == #1).
export const LAUNCH_DATE = "2026-05-17";

const MS_PER_DAY = 86400000;

export const getDayNumber = (
  dateString: string = getLocalDateString()
): number => {
  const launch = Date.parse(`${LAUNCH_DATE}T00:00:00Z`);
  const date = Date.parse(`${dateString}T00:00:00Z`);
  if (Number.isNaN(launch) || Number.isNaN(date)) return 1;
  return Math.max(1, Math.floor((date - launch) / MS_PER_DAY) + 1);
};

// FNV-1a 32-bit with an optional salt so the same date string can produce
// independent picks for different "slots" (e.g. start vs target). Exported
// because the Triple generator uses the same deterministic-from-date pattern.
export const hashStringWithSalt = (input: string, salt: number): number => {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0);
};

// --- Daily pair (start + target) -------------------------------------------

const MIN_LEGITIMATE_DISTANCE = 4;
const MAX_LEGITIMATE_DISTANCE = 7;

/**
 * Deterministic (start, target) pair for the daily puzzle. Both are in the
 * legitimate set, with a 4-7 BFS distance between them through legitimate-
 * only edges. The picker rotates start words on failure (start with no
 * targets in range) and rerolls until it finds a viable pair.
 */
export const getDailyPair = (
  dateString: string = getLocalDateString()
): { start: string; target: string } => {
  // Manual override takes precedence over the deterministic picker.
  const override = dailyOverrides[dateString];
  if (override) return { start: override.start, target: override.target };

  const sortedLegitimate = getSortedLegitimate();
  const viableStarts = sortedLegitimate.filter(isViableStart);

  for (let attempt = 0; attempt < 64; attempt++) {
    const startIndex =
      hashStringWithSalt(dateString, attempt * 2 + 1) % viableStarts.length;
    const start = viableStarts[startIndex];
    const distances = bfsDistancesLegitimate(start);

    const candidates: string[] = [];
    for (const [word, distance] of distances) {
      if (
        distance >= MIN_LEGITIMATE_DISTANCE &&
        distance <= MAX_LEGITIMATE_DISTANCE &&
        word.length >= 3 &&
        !isTrivialPlural(word)
      ) {
        candidates.push(word);
      }
    }
    if (candidates.length === 0) continue;
    candidates.sort();

    const targetIndex =
      hashStringWithSalt(dateString, attempt * 2 + 2) % candidates.length;
    return { start, target: candidates[targetIndex] };
  }

  // Should not trigger in practice with ~3k+ viable starts — surfacing as
  // an error if it ever does is more useful than a silent fallback.
  throw new Error(
    `getDailyPair: no viable (start, target) pair after 64 attempts ` +
      `for dateString=${dateString}`
  );
};

/**
 * Random (start, target) pair — for dev/testing only. Not deterministic;
 * each call returns a different pair. If `optimalMoves` is provided, the
 * target's BFS distance from the start through legitimate-only edges will
 * be exactly that. Otherwise distance is in [4, 7].
 */
export const getRandomDailyPair = (
  optimalMoves?: number
): { start: string; target: string; optimalMoves: number } => {
  const sortedLegitimate = getSortedLegitimate();
  const viableStarts = sortedLegitimate.filter(isViableStart);
  const minD =
    optimalMoves !== undefined ? optimalMoves : MIN_LEGITIMATE_DISTANCE;
  const maxD =
    optimalMoves !== undefined ? optimalMoves : MAX_LEGITIMATE_DISTANCE;

  for (let attempt = 0; attempt < 200; attempt++) {
    const start =
      viableStarts[Math.floor(Math.random() * viableStarts.length)];
    const distances = bfsDistancesLegitimate(start);

    const candidates: { word: string; distance: number }[] = [];
    for (const [word, distance] of distances) {
      if (
        distance >= minD &&
        distance <= maxD &&
        word.length >= 3 &&
        !isTrivialPlural(word)
      ) {
        candidates.push({ word, distance });
      }
    }
    if (candidates.length === 0) continue;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { start, target: pick.word, optimalMoves: pick.distance };
  }

  throw new Error(
    `getRandomDailyPair: no viable pair after 200 attempts ` +
      `(optimalMoves=${optimalMoves})`
  );
};
