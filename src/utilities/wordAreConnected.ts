import { getWordGraph } from "../dictionaryData/wordGraphRef";

/**
 * Is `word1` reachable from `word2` by a single add / remove / change
 * edit? (Levenshtein distance 1.)
 *
 * Primary path: the precomputed Dict B adjacency. O(neighbours) lookup.
 *
 * Fallback: if `word2` isn't in the current dictionary (i.e. it's an
 * "orphan" — a word the user typed under a previous dict that no longer
 * exists in Dict B), we'd otherwise refuse every edge from it, trapping
 * the user on that node. Compute the L1 check live so they can still
 * navigate AWAY from the orphan, as long as the destination IS in the
 * current Dict B. This lets long-running freeplay graphs heal toward the
 * current dict over time without us yanking words out from under players.
 *
 * Symmetric case: typing AN orphan from a current-dict word fails as
 * normal — the current-dict word's adjacency doesn't include the orphan,
 * so we don't re-admit removed words.
 */
export const wordsAreConnected = (
  word1: string,
  word2: string | null | undefined
): boolean => {
  if (!word1 || !word2 || typeof word2 !== "string") {
    return false;
  }
  const wordGraph = getWordGraph();
  const neighbours = wordGraph[word2];
  if (neighbours) return neighbours.includes(word1);
  // word2 is an orphan: fall back to live L1 + current-dict membership.
  if (!(word1 in wordGraph)) return false;
  return areOneEditApart(word1, word2);
};

const areOneEditApart = (a: string, b: string): boolean => {
  const diff = a.length - b.length;
  if (diff > 1 || diff < -1) return false;
  if (a.length === b.length) {
    // Substitution check.
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        mismatches++;
        if (mismatches > 1) return false;
      }
    }
    return mismatches === 1;
  }
  // Insertion / deletion: the shorter walks alongside the longer with at
  // most one skip.
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else if (!skipped) {
      skipped = true;
      j++;
    } else {
      return false;
    }
  }
  return true;
};
