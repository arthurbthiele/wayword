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

// Cache-miss reconciliation: when we're about to write a fresh cache
// entry for a date, check whether there's already an in-progress graph
// for that date whose start disagrees with the fresh pick. If so, wipe
// the date's stored state — the user's mid-game graph is for a puzzle
// that no longer matches what loadOrPick is about to return.
//
// Two scenarios fire this:
//   1. The deploy that introduced this cache file. Users with stored
//      graphs from before the cache existed have a graph but no
//      `:puzzle` entry; if the picker's output has shifted since they
//      started, their stored graph is stale.
//   2. A deliberate `PUZZLE_CACHE_VERSION` bump (e.g. to roll out a
//      hot-fix override for a bad pair). Old cache entries fail the
//      version check, the picker runs again, and the user's stored
//      graph may no longer match.
//
// Must be called from a parent render path that runs BEFORE the
// GraphProvider that owns the stored graph mounts — otherwise React's
// in-memory copy of the graph survives the localStorage wipe. App.tsx
// calls this via the dailyPair / tripleData useMemos, which run before
// the JSX containing GraphProvider is committed.
const wipeDatePrefix = (modeKey: string, date: string): void => {
  const prefix = `${STORAGE_PREFIX}${modeKey}:${date}:`;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Best effort.
  }
};

const reconcileGraphWithFreshStart = (
  modeKey: "daily:v2" | "triple:v1",
  date: string,
  freshStart: string
): void => {
  try {
    const graphKey = `${STORAGE_PREFIX}${modeKey}:${date}:graph`;
    const raw = window.localStorage.getItem(graphKey);
    if (raw === null) return;
    const parsed = JSON.parse(raw);
    const storedStart = parsed?.nodes?.[0]?.id;
    if (typeof storedStart === "string" && storedStart !== freshStart) {
      wipeDatePrefix(modeKey, date);
    }
  } catch {
    // Best effort — leave state alone on parse failure.
  }
};

export const loadOrPickDaily = (
  date: string
): { start: string; target: string } => {
  const cached = readJSON<CachedDaily>(dailyKey(date));
  if (
    cached &&
    cached.version === PUZZLE_CACHE_VERSION &&
    typeof cached.start === "string" &&
    typeof cached.target === "string"
  ) {
    return { start: cached.start, target: cached.target };
  }
  const fresh = getDailyPair(date);
  reconcileGraphWithFreshStart("daily:v2", date, fresh.start);
  writeJSON(dailyKey(date), {
    ...fresh,
    version: PUZZLE_CACHE_VERSION,
  } satisfies CachedDaily);
  return fresh;
};

export const loadOrPickTriple = (date: string): DailyTriple => {
  const cached = readJSON<CachedTriple>(tripleKey(date));
  if (
    cached &&
    cached.version === PUZZLE_CACHE_VERSION &&
    typeof cached.start === "string" &&
    typeof cached.t1 === "string" &&
    typeof cached.t2 === "string" &&
    typeof cached.optimalEdges === "number"
  ) {
    return {
      start: cached.start,
      t1: cached.t1,
      t2: cached.t2,
      optimalEdges: cached.optimalEdges,
    };
  }
  const fresh = getDailyTriple(date);
  reconcileGraphWithFreshStart("triple:v1", date, fresh.start);
  writeJSON(tripleKey(date), {
    ...fresh,
    version: PUZZLE_CACHE_VERSION,
  } satisfies CachedTriple);
  return fresh;
};
