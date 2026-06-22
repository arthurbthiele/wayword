// Indirection layer over the disconnected-valid Bloom filter. Same
// pattern as `wordGraphRef.ts` — the data is shipped as a separate
// chunk loaded by App on boot, then accessed via the getter.
//
// "Disconnected valid" = words that are real English (per our broader
// source list) but aren't reachable in the playable wordGraph. The
// connected-component build guarantees these words are NEVER L1-adjacent
// to any wordGraph word, so a "disconnected valid" yes from the filter is
// definitionally a "real word, just not in our dictionary" — used only
// for friendlier rejection messages, never to admit a word to play.
//
// Encoded as a Bloom filter rather than a Set<string>: the data shipped
// is ~290 KB instead of ~1.4 MB, the in-memory footprint is ~215 KB of
// bits instead of 3-5 MB of string allocations. False positive rate ~0.1%,
// and a false positive degrades to "we showed the friendlier rejection
// when we shouldn't have" — strictly nicer than the no-filter fallback.

import { BloomFilter, EMPTY_BLOOM } from "./bloomFilter";

let cached: BloomFilter = EMPTY_BLOOM;

export const setDisconnectedValidWords = (filter: BloomFilter): void => {
  cached = filter;
};

/**
 * Returns the filter, or an empty filter that answers "no" to everything
 * if not yet loaded. Callers can treat absence as "we don't know yet" —
 * the rejection message just falls back to "X is not a word" until the
 * lazy chunk arrives.
 */
export const getDisconnectedValidWords = (): BloomFilter => cached;
