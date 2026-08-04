// Indirection layer over the below-bar Bloom filter. Same pattern as
// disconnectedValidWordsRef.ts — the data ships as a separate chunk loaded
// by App on boot, then accessed via the getter.
//
// "Below-bar" = words that are real English (per an-array-of-english-words)
// but rarer than our tier cutoff, so they're neither playable nor in the
// disconnected-valid set. A yes from this filter drives the descriptive
// "Wayword recognises this word, it's just not in the playable set" message.
// Unlike disconnectedValid, these words CAN be one edit from a playable word,
// so their message must never make an adjacency claim.
//
// Encoded as a Bloom filter (~150 KB of bits, FPR ≈ 3%): a false positive
// calls a non-word "a rare real word", strictly nicer than "not a word".

import { BloomFilter, EMPTY_BLOOM } from "./bloomFilter";

let cached: BloomFilter = EMPTY_BLOOM;

export const setBelowBarWords = (filter: BloomFilter): void => {
  cached = filter;
};

/**
 * Returns the filter, or an empty filter that answers "no" to everything
 * if not yet loaded. Callers treat absence as "we don't know yet" — the
 * rejection message falls back to "not a word" until the lazy chunk arrives.
 */
export const getBelowBarWords = (): BloomFilter => cached;
