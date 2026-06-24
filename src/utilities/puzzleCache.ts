// Persisted "this is the puzzle you're playing for date D" cache.
//
// The picker is a deterministic function of (date, dictionary) — but the
// dictionary varies invisibly across bundle versions. Two browsers with
// different cached JS see different picker outputs for the same date.
// And for the same user, a dict change between deploys can make today's
// "live" picker disagree with the puzzle they were mid-solving.
//
// Strategy: on first encounter with a date, snapshot what the picker
// returned and treat that snapshot as canonical for this user-date.
// Subsequent renders (and bundle changes) read the cached pair instead
// of re-asking the picker.
//
// Trade-off: cross-user puzzle agreement is lost — different first-load
// times can produce different cached pairs across browsers. This is the
// trade we explicitly accept: per-user coherence is absolute (stats,
// daily view, and share string all describe the same puzzle); cross-user
// agreement degrades when our dict changes between players' first loads.
//
// Force-invalidation: bump `PUZZLE_CACHE_VERSION` when we deliberately
// need every user to re-pick (e.g. rolling out a hot-fix pin for a bad
// pair). Old entries fail the version check and recompute via the live
// picker, which picks up any new manual `puzzleOverrides` entries.

import { getDailyPair } from "./dailyTarget";
import { getDailyTriple, type DailyTriple } from "./tripleTarget";

const PUZZLE_CACHE_VERSION = 1;

const STORAGE_PREFIX = "wordJourney:";
const dailyKey = (date: string) => `${STORAGE_PREFIX}daily:v2:${date}:puzzle`;
const tripleKey = (date: string) => `${STORAGE_PREFIX}triple:v1:${date}:puzzle`;

type CachedDaily = {
  start: string;
  target: string;
  version: number;
};

type CachedTriple = {
  start: string;
  t1: string;
  t2: string;
  optimalEdges: number;
  version: number;
};

const readJSON = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
};

const writeJSON = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota — degrade silently. Cache miss next time is
    // strictly recoverable (re-pick + re-cache).
  }
};

export const loadOrPickDaily = (
  date: string
): { start: string; target: string } => {
  const cached = readJSON<CachedDaily>(dailyKey(date));
  if (cached && cached.version === PUZZLE_CACHE_VERSION) {
    return { start: cached.start, target: cached.target };
  }
  const fresh = getDailyPair(date);
  writeJSON(dailyKey(date), {
    ...fresh,
    version: PUZZLE_CACHE_VERSION,
  } satisfies CachedDaily);
  return fresh;
};

export const loadOrPickTriple = (date: string): DailyTriple => {
  const cached = readJSON<CachedTriple>(tripleKey(date));
  if (cached && cached.version === PUZZLE_CACHE_VERSION) {
    return {
      start: cached.start,
      t1: cached.t1,
      t2: cached.t2,
      optimalEdges: cached.optimalEdges,
    };
  }
  const fresh = getDailyTriple(date);
  writeJSON(tripleKey(date), {
    ...fresh,
    version: PUZZLE_CACHE_VERSION,
  } satisfies CachedTriple);
  return fresh;
};

// Used by `migrateStaleGraphState` when it detects that a cached
// puzzle's start word is no longer in the playable dictionary. Drops the
// cache entry so the next visit re-picks against the current dict.
export const clearCachedDaily = (date: string): void => {
  try {
    window.localStorage.removeItem(dailyKey(date));
  } catch {
    // Best effort.
  }
};

export const clearCachedTriple = (date: string): void => {
  try {
    window.localStorage.removeItem(tripleKey(date));
  } catch {
    // Best effort.
  }
};
