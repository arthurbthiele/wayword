// Indirection layer over the `disconnectedValidWords` data file. Same
// pattern as `wordGraphRef.ts` — the file is shipped in a separate chunk
// loaded by App on boot, then accessed via `getDisconnectedValidWords()`.
//
// "Disconnected valid" = words that are real English (per our broader
// source list) but aren't reachable in the playable wordGraph. The
// connected-component build guarantees these words are NEVER L1-adjacent
// to any wordGraph word — so when the user types one from a dict-B
// selection, it is by construction "a word, but not one edit from
// [selected]". Used only for friendlier rejection messages; never admits
// the word to play.

export type DisconnectedValidWords = ReadonlySet<string>;

let cached: DisconnectedValidWords | null = null;

export const setDisconnectedValidWords = (
  words: DisconnectedValidWords
): void => {
  cached = words;
};

/**
 * Returns the set, or an empty set if not yet loaded — callers should
 * treat absence as "we don't know yet" rather than "definitively not a
 * word", but in practice this is only checked after dictReady has fired.
 */
export const getDisconnectedValidWords = (): DisconnectedValidWords => {
  return cached ?? EMPTY;
};

const EMPTY: ReadonlySet<string> = new Set();
