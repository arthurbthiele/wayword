import {
  bfsDistancesLegitimate,
  bfsLegitimateWithPredecessors,
  getSortedLegitimate,
  isTrivialPlural,
  isViableStart,
} from "./legitimateGraph";
import { getUtcDateString, hashStringWithSalt } from "./dailyTarget";

// "Daily Triple" mode: connect 3 specific words with the minimum number of
// added words. This is the graph-theoretic Steiner Tree problem with the
// terminal set fixed at 3 nodes. Steiner Tree is NP-hard in general, but
// for a *fixed* number of terminals it's polynomial; for 3 terminals the
// solution is the minimum over candidate "joint" vertices v of
//   d(v, T1) + d(v, T2) + d(v, T3)
// where d is shortest-path distance in the graph (legitimate words only
// here, so the optimal we calculate uses only common everyday words —
// the same "fair comparison" framing as daily's common-word optimal).

export type SteinerTree = {
  /** Total number of words to add — equivalently, edges in the tree. */
  edges: number;
  /**
   * The optimal "joint" vertex where the three branches meet. May be one
   * of the terminals themselves, in which case the tree degenerates to a
   * single chain (e.g. start → ... → T1 → ... → T2).
   */
  joint: string;
  /** Path joint → ... → start (joint first, start last). */
  branchToStart: string[];
  /** Path joint → ... → T1. */
  branchToT1: string[];
  /** Path joint → ... → T2. */
  branchToT2: string[];
};

/**
 * Walks a predecessor map back from `joint` to `terminal`, returning the
 * sequence as [joint, ..., terminal]. Predecessors come from a BFS rooted
 * at the terminal, so following pred[x] takes one step *toward* terminal.
 */
const walkBranch = (
  joint: string,
  terminal: string,
  predecessors: Map<string, string>
): string[] => {
  const path: string[] = [joint];
  let current = joint;
  let safety = 1000;
  while (current !== terminal && safety-- > 0) {
    const next = predecessors.get(current);
    if (next === undefined) break;
    path.push(next);
    current = next;
  }
  return path;
};

/**
 * Find the minimum Steiner tree connecting `start`, `t1`, and `t2` through
 * the legitimate-word adjacency. Returns the edge count, the joint vertex,
 * and the three branches.
 *
 * Returns null if any terminal is unreachable from the others.
 */
export const findSteinerTree = (
  start: string,
  t1: string,
  t2: string
): SteinerTree | null => {
  const fromStart = bfsLegitimateWithPredecessors(start);
  const fromT1 = bfsLegitimateWithPredecessors(t1);
  const fromT2 = bfsLegitimateWithPredecessors(t2);

  let best: { sum: number; joint: string } | null = null;
  // Iterate over fromStart.distances — any v reachable from start is a
  // candidate; if it's not also reachable from T1 or T2 we just skip it.
  for (const [v, dStart] of fromStart.distances) {
    const dT1 = fromT1.distances.get(v);
    if (dT1 === undefined) continue;
    const dT2 = fromT2.distances.get(v);
    if (dT2 === undefined) continue;
    const sum = dStart + dT1 + dT2;
    if (best === null || sum < best.sum) {
      best = { sum, joint: v };
    }
  }

  if (!best) return null;

  return {
    edges: best.sum,
    joint: best.joint,
    branchToStart: walkBranch(best.joint, start, fromStart.predecessors),
    branchToT1: walkBranch(best.joint, t1, fromT1.predecessors),
    branchToT2: walkBranch(best.joint, t2, fromT2.predecessors),
  };
};

/**
 * Steiner tree of three terminals through an arbitrary undirected graph
 * (the player's own additions, in practice). Returns null if any terminal
 * is missing from the graph or unreachable from another.
 */
export const findSteinerTreeInGraph = (
  nodeIds: string[],
  edges: { from: string; to: string }[],
  start: string,
  t1: string,
  t2: string
): SteinerTree | null => {
  const nodeSet = new Set(nodeIds);
  if (!nodeSet.has(start) || !nodeSet.has(t1) || !nodeSet.has(t2)) return null;

  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) adjacency.set(id, new Set());
  for (const edge of edges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const bfs = (
    source: string
  ): { distances: Map<string, number>; predecessors: Map<string, string> } => {
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

  const fromStart = bfs(start);
  const fromT1 = bfs(t1);
  const fromT2 = bfs(t2);

  let best: { sum: number; joint: string } | null = null;
  for (const [v, dStart] of fromStart.distances) {
    const dT1 = fromT1.distances.get(v);
    if (dT1 === undefined) continue;
    const dT2 = fromT2.distances.get(v);
    if (dT2 === undefined) continue;
    const sum = dStart + dT1 + dT2;
    if (best === null || sum < best.sum) best = { sum, joint: v };
  }
  if (!best) return null;

  return {
    edges: best.sum,
    joint: best.joint,
    branchToStart: walkBranch(best.joint, start, fromStart.predecessors),
    branchToT1: walkBranch(best.joint, t1, fromT1.predecessors),
    branchToT2: walkBranch(best.joint, t2, fromT2.predecessors),
  };
};

// --- Daily Triple generation -----------------------------------------------

const MIN_TREE_EDGES = 5;
const MAX_TREE_EDGES = 10;
// Each target must be within this many legitimate-edges of the start.
// Constrains the candidate set so the Steiner check has a high hit rate.
const MIN_TERM_DIST = 2;
const MAX_TERM_DIST = 7;

export type DailyTriple = {
  start: string;
  t1: string;
  t2: string;
  /** Optimal Steiner-tree size (words to add) for this triple. */
  optimalEdges: number;
};

/**
 * Deterministic Daily Triple for a given date. Picks a start word, then
 * two distinct legitimate targets such that the Steiner tree connecting
 * all three has between MIN_TREE_EDGES and MAX_TREE_EDGES edges (i.e. the
 * player needs to add 5-10 words to optimally join them all).
 *
 * Uses the same FNV-1a hash-with-salt pattern as daily for determinism.
 */
export const getDailyTriple = (
  dateString: string = getUtcDateString()
): DailyTriple => {
  const sortedLegitimate = getSortedLegitimate();
  const viableStarts = sortedLegitimate.filter(isViableStart);

  for (let attempt = 0; attempt < 256; attempt++) {
    const startIndex =
      hashStringWithSalt(dateString, attempt * 4 + 101) % viableStarts.length;
    const start = viableStarts[startIndex];
    const distancesFromStart = bfsDistancesLegitimate(start);

    const candidates: string[] = [];
    for (const [word, distance] of distancesFromStart) {
      if (
        word !== start &&
        distance >= MIN_TERM_DIST &&
        distance <= MAX_TERM_DIST &&
        word.length >= 3 &&
        !isTrivialPlural(word)
      ) {
        candidates.push(word);
      }
    }
    if (candidates.length < 2) continue;
    candidates.sort();

    const t1Index =
      hashStringWithSalt(dateString, attempt * 4 + 102) % candidates.length;
    const t1 = candidates[t1Index];
    let t2Index =
      hashStringWithSalt(dateString, attempt * 4 + 103) % candidates.length;
    if (candidates[t2Index] === t1) {
      t2Index = (t2Index + 1) % candidates.length;
    }
    const t2 = candidates[t2Index];

    const steiner = findSteinerTree(start, t1, t2);
    if (!steiner) continue;
    if (steiner.edges < MIN_TREE_EDGES || steiner.edges > MAX_TREE_EDGES) {
      continue;
    }

    return { start, t1, t2, optimalEdges: steiner.edges };
  }

  // Fallback: should never trigger in practice. If it does, we still need
  // *something* renderable. Use the daily pair's start and a couple of
  // close neighbours; the player will see a degenerate puzzle but the app
  // won't crash.
  return { start: "a", t1: "at", t2: "in", optimalEdges: 3 };
};
