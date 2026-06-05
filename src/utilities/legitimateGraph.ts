import { legitimateWords } from "../dictionaryData/legitimate";
import { getWordGraph } from "../dictionaryData/wordGraphRef";

// Shared helpers for puzzle generation: cached adjacency restricted to the
// "legitimate" word set (dict A), BFS, and small predicates. Daily mode and
// the Triple mode both build on these.

let cachedLegitimateAdjacency: Map<string, string[]> | null = null;
let cachedSortedLegitimate: string[] | null = null;

export const buildLegitimateAdjacency = (): Map<string, string[]> => {
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

export const getSortedLegitimate = (): string[] => {
  if (cachedSortedLegitimate) return cachedSortedLegitimate;
  cachedSortedLegitimate = [...legitimateWords].sort();
  return cachedSortedLegitimate;
};

export const bfsDistancesLegitimate = (
  start: string
): Map<string, number> => {
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

/**
 * BFS through the legitimate-word adjacency, returning both distances and
 * predecessors. The predecessor map lets callers reconstruct the shortest
 * path from any reached word back to `source`.
 */
export const bfsLegitimateWithPredecessors = (
  source: string
): { distances: Map<string, number>; predecessors: Map<string, string> } => {
  const adjacency = buildLegitimateAdjacency();
  const distances = new Map<string, number>([[source, 0]]);
  const predecessors = new Map<string, string>();
  const queue: string[] = [source];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word) ?? 0;
    for (const neighbour of adjacency.get(word) ?? []) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, distance + 1);
        predecessors.set(neighbour, word);
        queue.push(neighbour);
      }
    }
  }
  return { distances, predecessors };
};

/**
 * BFS distances through the *full* Dict B word graph (no legitimate-only
 * restriction). Used wherever a constraint needs to look at the player's
 * playable graph rather than just the common-word subset — e.g. the
 * weekend strict daily check, and the Triple mode's Dict-B linear
 * detection.
 */
export const bfsDistancesInWordGraph = (
  source: string
): Map<string, number> => {
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

/**
 * BFS that *also* tracks, per node, whether ANY shortest path from
 * `source` to that node passes through a "short" word (length below
 * `shortLengthThreshold`). Returns `dipsBelowShort` as a flag per node so
 * dip-checks become a constant-time map lookup, rather than requiring a
 * precomputed all-pairs short-word distance table (which is fine on
 * desktop but blows mobile memory budgets).
 *
 * Note on endpoints: `source` counts as "on the path"; if `source.length
 * < shortLengthThreshold`, every reachable node is flagged dipping.
 * Likewise, a reached node `n` with `n.length < shortLengthThreshold` is
 * flagged regardless of how it was reached. Matches the semantics of the
 * old `anyOptimalPathDipsBelow4`.
 */
export type BfsWithDipResult = {
  distances: Map<string, number>;
  dipsBelowShort: Map<string, boolean>;
};

const bfsWithDipFlag = (
  source: string,
  neighboursOf: (word: string) => readonly string[],
  shortLengthThreshold: number
): BfsWithDipResult => {
  const sourceIsShort = source.length < shortLengthThreshold;
  const distances = new Map<string, number>([[source, 0]]);
  const dipsBelowShort = new Map<string, boolean>([[source, sourceIsShort]]);
  const queue: string[] = [source];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word)!;
    const wordDips = dipsBelowShort.get(word)!;
    for (const neighbour of neighboursOf(word)) {
      if (!distances.has(neighbour)) {
        // First time reaching this neighbour — establish its dip flag
        // from the predecessor we arrived via, plus whether the
        // neighbour itself is short.
        distances.set(neighbour, distance + 1);
        dipsBelowShort.set(
          neighbour,
          wordDips || neighbour.length < shortLengthThreshold
        );
        queue.push(neighbour);
      } else if (distances.get(neighbour) === distance + 1) {
        // Another shortest path to neighbour via word — if THAT path
        // dipped, mark the neighbour as dipping too.
        if (wordDips && !dipsBelowShort.get(neighbour)) {
          dipsBelowShort.set(neighbour, true);
        }
      }
    }
  }
  return { distances, dipsBelowShort };
};

/** As `bfsWithDipFlag` but restricted to Dict A (legitimate-only edges). */
export const bfsLegitimateWithDipFlag = (
  source: string,
  shortLengthThreshold: number
): BfsWithDipResult => {
  const adjacency = buildLegitimateAdjacency();
  return bfsWithDipFlag(
    source,
    (word) => adjacency.get(word) ?? [],
    shortLengthThreshold
  );
};

/** As `bfsWithDipFlag` but through the full Dict B word graph. */
export const bfsInWordGraphWithDipFlag = (
  source: string,
  shortLengthThreshold: number
): BfsWithDipResult => {
  const wordGraph = getWordGraph();
  return bfsWithDipFlag(
    source,
    (word) => wordGraph[word] ?? [],
    shortLengthThreshold
  );
};

export const isTrivialPlural = (word: string): boolean =>
  word.endsWith("s") && legitimateWords.has(word.slice(0, -1));

export const isViableStart = (word: string): boolean =>
  word.length >= 3 && !isTrivialPlural(word);
