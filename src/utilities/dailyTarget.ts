import {
  bfsDistancesLegitimate,
  getSortedLegitimate,
  isTrivialPlural,
  isViableStart,
} from "./legitimateGraph";
import { dailyOverrides } from "./puzzleOverrides";
import { legitimateWords } from "../dictionaryData/legitimate";
import { getWordGraph } from "../dictionaryData/wordGraphRef";

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
// Saturday and Sunday lock to a single, harder distance — matches the
// crossword convention of weekends being the hardest puzzles of the week.
// Sunday at 9 is the hardest, Saturday at 8 is the step before. Both have
// hundreds of thousands of viable (start, target) pairs in the current
// dictionary, so there's no repetition risk from the narrow band.
const SATURDAY_LEGITIMATE_DISTANCE = 8;
const SUNDAY_LEGITIMATE_DISTANCE = 9;
// On weekends, also require the optimal path's shortest word to be at
// least this many letters — applied to both Dict A and Dict B. Without
// the floor, ~64% of d=8/9 pairs have *some* shortest path that dips
// through 2-3 letter "hub" words (a known speedrun trick). With the
// floor, optimal paths look more like word-transformation chains.
const WEEKEND_PATH_MIN_WORD_LENGTH = 4;
// Cap on (Dict A optimal − Dict B optimal). Without this, a "hard" d=9
// puzzle could be solved in 4-5 moves via rare Dict B words, making the
// difficulty advertisement misleading. Cap of 3 trims the egregious
// shortcuts while keeping ~80% of the strict-floor pool.
const WEEKEND_MAX_DICTB_GAP = 3;

export type DailyConstraints = {
  /** Inclusive lower bound on the legit-only optimal distance. */
  minDistance: number;
  /** Inclusive upper bound on the legit-only optimal distance. */
  maxDistance: number;
  /**
   * Inclusive lower bound on the shortest word along the optimal path
   * (applied to ANY shortest path, in both Dict A and Dict B). 1 means
   * no real constraint; ≥ 4 forbids the "dip to 2/3-letter hub" shortcut.
   */
  pathMinWordLength: number;
  /**
   * Maximum allowed (Dict A optimal − Dict B optimal). null means no cap.
   * Stops puzzles that look hard in Dict A but have a trivial Dict B
   * shortcut making them feel "secretly easy".
   */
  maxDictBGap: number | null;
};

/**
 * Daily picker constraints for a given calendar date. Mon-Fri is the
 * long-standing 4-7 distance band with no path-shape constraint; Sat and
 * Sun lock to a single harder distance AND require the optimal path to
 * stay at ≥ 4-letter words throughout (no short-word dips). Weekday is
 * computed from the player's *local* timezone, matching the date-rollover
 * semantics elsewhere.
 */
export const getDailyConstraints = (
  dateString: string = getLocalDateString()
): DailyConstraints => {
  // Construct in local time by parsing as YYYY-MM-DD without a TZ suffix —
  // `new Date("2026-06-07")` is parsed as UTC midnight, which can roll to
  // the previous day in negative-offset zones. Construct from components.
  const [year, month, day] = dateString.split("-").map((n) => parseInt(n, 10));
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 6) {
    return {
      minDistance: SATURDAY_LEGITIMATE_DISTANCE,
      maxDistance: SATURDAY_LEGITIMATE_DISTANCE,
      pathMinWordLength: WEEKEND_PATH_MIN_WORD_LENGTH,
      maxDictBGap: WEEKEND_MAX_DICTB_GAP,
    };
  }
  if (weekday === 0) {
    return {
      minDistance: SUNDAY_LEGITIMATE_DISTANCE,
      maxDistance: SUNDAY_LEGITIMATE_DISTANCE,
      pathMinWordLength: WEEKEND_PATH_MIN_WORD_LENGTH,
      maxDictBGap: WEEKEND_MAX_DICTB_GAP,
    };
  }
  return {
    minDistance: MIN_LEGITIMATE_DISTANCE,
    maxDistance: MAX_LEGITIMATE_DISTANCE,
    pathMinWordLength: 1,
    maxDictBGap: null,
  };
};

// Back-compat shim — older callers (tests) used getDailyDistanceBand.
export const getDailyDistanceBand = (
  dateString?: string
): { min: number; max: number } => {
  const c = getDailyConstraints(dateString);
  return { min: c.minDistance, max: c.maxDistance };
};

// ---------------------------------------------------------------------------
// Weekend-only helpers: distance lookups used to verify that no shortest
// path between start and target dips through short ("hub") words.

const bfsDictBDistances = (source: string): Map<string, number> => {
  const wordGraph = getWordGraph();
  const distances = new Map<string, number>([[source, 0]]);
  const queue: string[] = [source];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word) ?? 0;
    for (const neighbour of wordGraph[word] ?? []) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }
  }
  return distances;
};

// Lazy: only built the first time a weekend picker call needs them.
// Maps each "short" (length < 4) word to a distance map covering every
// reachable word. Used for the "no shortest path dips below 4" check —
// a word w lies on some shortest path s→t iff d(s,w) + d(w,t) = d(s,t),
// and we only care about w's with |w| < 4.
let shortWordDistancesA: Map<string, Map<string, number>> | null = null;
let shortWordDistancesB: Map<string, Map<string, number>> | null = null;

const ensureShortWordDistances = () => {
  if (shortWordDistancesA && shortWordDistancesB) return;
  const aMap = new Map<string, Map<string, number>>();
  for (const word of legitimateWords) {
    if (word.length < 4) aMap.set(word, bfsDistancesLegitimate(word));
  }
  shortWordDistancesA = aMap;
  const bMap = new Map<string, Map<string, number>>();
  for (const word of Object.keys(getWordGraph())) {
    if (word.length < 4) bMap.set(word, bfsDictBDistances(word));
  }
  shortWordDistancesB = bMap;
};

const anyOptimalPathDipsBelow4 = (
  start: string,
  target: string,
  distance: number,
  distFromShort: Map<string, Map<string, number>>
): boolean => {
  for (const [shortWord, dists] of distFromShort) {
    const dStartToShort = dists.get(start);
    if (dStartToShort === undefined) continue;
    const dShortToTarget = dists.get(target);
    if (dShortToTarget === undefined) continue;
    if (dStartToShort + dShortToTarget === distance) return true;
  }
  return false;
};

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

  const constraints = getDailyConstraints(dateString);
  const { minDistance, maxDistance, pathMinWordLength, maxDictBGap } =
    constraints;
  const isWeekend = pathMinWordLength > 1 || maxDictBGap !== null;
  if (isWeekend) ensureShortWordDistances();
  const sortedLegitimate = getSortedLegitimate();
  const viableStarts = sortedLegitimate.filter(isViableStart);

  for (let attempt = 0; attempt < 64; attempt++) {
    const startIndex =
      hashStringWithSalt(dateString, attempt * 2 + 1) % viableStarts.length;
    const start = viableStarts[startIndex];
    const distances = bfsDistancesLegitimate(start);
    const distancesB = isWeekend ? bfsDictBDistances(start) : null;

    const candidates: string[] = [];
    for (const [word, distance] of distances) {
      if (
        distance < minDistance ||
        distance > maxDistance ||
        word.length < 3 ||
        isTrivialPlural(word)
      ) {
        continue;
      }
      if (isWeekend) {
        // Reject if any shortest A-path between start and word dips below
        // the required floor.
        if (
          pathMinWordLength > 1 &&
          anyOptimalPathDipsBelow4(
            start,
            word,
            distance,
            shortWordDistancesA!
          )
        ) {
          continue;
        }
        // Same check for Dict B's shortest paths.
        const distanceB = distancesB!.get(word);
        if (distanceB === undefined) continue;
        if (
          pathMinWordLength > 1 &&
          anyOptimalPathDipsBelow4(
            start,
            word,
            distanceB,
            shortWordDistancesB!
          )
        ) {
          continue;
        }
        // Reject if Dict B route is too much shorter than the Dict A
        // benchmark — keeps the puzzle hard regardless of how the player
        // routes.
        if (maxDictBGap !== null && distance - distanceB > maxDictBGap) {
          continue;
        }
      }
      candidates.push(word);
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
