import { targetWords } from "../dictionaryData/targets";
import { legitimateWords } from "../dictionaryData/legitimate";
import { getWordGraph } from "../dictionaryData/wordGraphRef";

/**
 * Today's date in UTC, formatted YYYY-MM-DD. UTC (not local) so the daily
 * puzzle rolls over at the same instant for everyone — otherwise two players
 * in different timezones could see different puzzles when comparing scores.
 */
export const getUtcDateString = (date: Date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Day 1 of daily-challenge mode. The day number is computed as days elapsed
// from this date in UTC, +1 (so launch day == #1).
export const LAUNCH_DATE = "2026-05-17";

const MS_PER_DAY = 86400000;

export const getDayNumber = (
  dateString: string = getUtcDateString()
): number => {
  const launch = Date.parse(`${LAUNCH_DATE}T00:00:00Z`);
  const date = Date.parse(`${dateString}T00:00:00Z`);
  if (Number.isNaN(launch) || Number.isNaN(date)) return 1;
  return Math.max(1, Math.floor((date - launch) / MS_PER_DAY) + 1);
};

// FNV-1a 32-bit with an optional salt so the same date string can produce
// independent picks for different "slots" (e.g. start vs target).
const hashStringWithSalt = (input: string, salt: number): number => {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0);
};

const hashString = (input: string): number => hashStringWithSalt(input, 0);

/**
 * Deterministic target word for a given date. Picks from the curated daily
 * target list (length, plural, optimal-path-4-7 filtered).
 */
export const getTargetForDate = (
  dateString: string = getUtcDateString()
): string => {
  const index = hashString(dateString) % targetWords.length;
  return targetWords[index];
};

// --- Daily pair (start + target) -------------------------------------------

const MIN_LEGITIMATE_DISTANCE = 4;
const MAX_LEGITIMATE_DISTANCE = 7;

let cachedLegitimateAdjacency: Map<string, string[]> | null = null;
let cachedSortedLegitimate: string[] | null = null;

const buildLegitimateAdjacency = (): Map<string, string[]> => {
  if (cachedLegitimateAdjacency) return cachedLegitimateAdjacency;
  const wordGraph = getWordGraph();
  const adjacency = new Map<string, string[]>();
  for (const word of legitimateWords) {
    const neighbours = (wordGraph[word] ?? []).filter((n) =>
      legitimateWords.has(n)
    );
    adjacency.set(word, neighbours);
  }
  cachedLegitimateAdjacency = adjacency;
  return adjacency;
};

const getSortedLegitimate = (): string[] => {
  if (cachedSortedLegitimate) return cachedSortedLegitimate;
  cachedSortedLegitimate = [...legitimateWords].sort();
  return cachedSortedLegitimate;
};

const bfsDistancesLegitimate = (start: string): Map<string, number> => {
  const adjacency = buildLegitimateAdjacency();
  const distances = new Map<string, number>([[start, 0]]);
  const queue: string[] = [start];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word) ?? 0;
    for (const neighbour of adjacency.get(word) ?? []) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }
  }
  return distances;
};

const isTrivialPlural = (word: string): boolean =>
  word.endsWith("s") && legitimateWords.has(word.slice(0, -1));

const isViableStart = (word: string): boolean =>
  word.length >= 3 && !isTrivialPlural(word);

/**
 * Deterministic (start, target) pair for the daily puzzle. Both are in the
 * legitimate set, with a 4-7 BFS distance between them through legitimate-
 * only edges. The picker rotates start words on failure (start with no
 * targets in range) and rerolls until it finds a viable pair.
 */
export const getDailyPair = (
  dateString: string = getUtcDateString()
): { start: string; target: string } => {
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

  // Fallback that should never trigger in practice — degenerate to the
  // single-target picker so callers always get something usable.
  return { start: "a", target: getTargetForDate(dateString) };
};
