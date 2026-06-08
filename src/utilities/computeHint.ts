import { findShortestPathInDictionary } from "./findPath";
import { legitimateWords } from "../dictionaryData/legitimate";

export type Hint = {
  /**
   * Either the next-step word to add (letter-hint), or the node the
   * player should navigate to first (navigation-hint). The consumer
   * only uses this to dedupe consecutive same-hint clicks; the message
   * is what's actually shown.
   */
  word: string;
  message: string;
};

/**
 * Compute a hint for the player's next move in a daily.
 *
 * Two-tier strategy. First, find the Dict A node in the player's current
 * graph that's *closest* to the target (BFS through Dict A). If that
 * node isn't where they're currently selected, the hint is a navigation
 * cue: "Try starting from 'X'." Once they're at X, the next hint
 * describes the actual edit needed — "Try adding a 'Y' to 'X'" — without
 * naming the destination word.
 *
 * The split is deliberately softer than revealing the full target word:
 * one hint to find the foothold, another to take the step. The player
 * still figures out *where* to put a letter (or which letter to remove
 * for a deletion).
 *
 * Returns null if `selected === target` (already solved) or no Dict A
 * path exists (extremely rare — Dict A's main component covers
 * everything).
 */
export const computeHint = (
  start: string,
  target: string,
  selected: string,
  graphNodeIds: readonly string[]
): Hint | null => {
  if (selected === target) return null;

  // Pick the graph node with the shortest Dict A path to target. Ties go
  // to the currently-selected word — we don't tell the player to "go to
  // where you already are."
  let bestNode: string | null = null;
  let bestPath: string[] | null = null;
  for (const node of graphNodeIds) {
    if (!legitimateWords.has(node)) continue;
    const path = findShortestPathInDictionary(node, target, legitimateWords);
    if (!path) continue;
    if (
      !bestPath ||
      path.length < bestPath.length ||
      (path.length === bestPath.length && node === selected)
    ) {
      bestNode = node;
      bestPath = path;
    }
  }

  // Fallback: no Dict A node in graph (shouldn't happen — 'a' is always
  // there for daily — but be defensive). Use start.
  if (!bestPath || !bestNode) {
    bestPath = findShortestPathInDictionary(start, target, legitimateWords);
    bestNode = start;
  }
  if (!bestPath || bestPath.length < 2 || !bestNode) return null;

  if (bestNode !== selected) {
    return {
      word: bestNode,
      message: `Try starting from '${bestNode}'`,
    };
  }

  const next = bestPath[1];
  return { word: next, message: phraseHint(selected, next) };
};

/**
 * Compose a softened hint message describing the edit from `from` to
 * `next` without naming `next` outright. The player gets the operation
 * (add / remove / change) and, for add/substitute, the *letter* — but
 * has to figure out where to apply it.
 */
const phraseHint = (from: string, next: string): string => {
  if (next.length > from.length) {
    const inserted = findInsertedLetter(from, next);
    return inserted
      ? `Try adding a${vowelArticle(inserted)} '${inserted}' to '${from}'`
      : `Try adding a letter to '${from}'`;
  }
  if (next.length < from.length) {
    return `Try removing a letter from '${from}'`;
  }
  const substitution = findSubstitution(from, next);
  return substitution
    ? `Try changing a letter in '${from}' to a${vowelArticle(substitution.to)} '${substitution.to}'`
    : `Try changing a letter in '${from}'`;
};

const findInsertedLetter = (shorter: string, longer: string): string | null => {
  for (let i = 0; i < longer.length; i++) {
    if (shorter.slice(0, i) + longer[i] + shorter.slice(i) === longer) {
      return longer[i];
    }
  }
  return null;
};

const findSubstitution = (
  a: string,
  b: string
): { from: string; to: string } | null => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return { from: a[i], to: b[i] };
  }
  return null;
};

/** "n" for vowels, "" for consonants. So "an 'e'" vs "a 'c'". */
const vowelArticle = (letter: string): string =>
  "aeiou".includes(letter) ? "n" : "";
