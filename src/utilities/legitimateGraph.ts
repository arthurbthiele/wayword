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

export const isTrivialPlural = (word: string): boolean =>
  word.endsWith("s") && legitimateWords.has(word.slice(0, -1));

export const isViableStart = (word: string): boolean =>
  word.length >= 3 && !isTrivialPlural(word);
