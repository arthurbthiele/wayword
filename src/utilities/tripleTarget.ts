import {
  bfsDistancesLegitimate,
  bfsLegitimateWithPredecessors,
  getSortedLegitimate,
  isTrivialPlural,
  isViableStart,
} from "./legitimateGraph";
import { getLocalDateString, hashStringWithSalt } from "./dailyTarget";
import { tripleOverrides } from "./puzzleOverrides";
import { getWordGraph } from "../dictionaryData/wordGraphRef";

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
  /**
   * True iff there exists *any* optimal-cost solution that is a single
   * chain — i.e. one terminal sits on the shortest path between the other
   * two. The picker rejects puzzles where this holds: even if the tree we
   * returned isn't itself linear, a player who finds the linear path gets
   * an identical edge count and the puzzle loses its tree character.
   */
  hasLinearOptimal: boolean;
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
    hasLinearOptimal: detectLinearOptimal(
      best.sum,
      fromStart.distances.get(t1),
      fromStart.distances.get(t2),
      fromT1.distances.get(t2)
    ),
  };
};

/**
 * Given the optimal Steiner cost and the three pairwise terminal distances,
 * decide whether *any* linear arrangement (one terminal in the middle of
 * the other two) achieves the same cost. Linear arrangements always exist
 * as valid Steiner solutions, so optimal cost ≤ min linear cost; equality
 * means at least one linear arrangement ties the optimum.
 */
const detectLinearOptimal = (
  optimalEdges: number,
  dStartT1: number | undefined,
  dStartT2: number | undefined,
  dT1T2: number | undefined
): boolean => {
  if (
    dStartT1 === undefined ||
    dStartT2 === undefined ||
    dT1T2 === undefined
  ) {
    return false;
  }
  const startInMiddle = dStartT1 + dStartT2;
  const t1InMiddle = dStartT1 + dT1T2;
  const t2InMiddle = dStartT2 + dT1T2;
  const minLinear = Math.min(startInMiddle, t1InMiddle, t2InMiddle);
  return minLinear === optimalEdges;
};

/**
 * BFS distances from `source` through Dict B (the full word graph). Used
 * by the strict linear check below — we want to know whether even players
 * who route through uncommon words can solve the triple linearly.
 */
const bfsDictBDistances = (source: string): Map<string, number> => {
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
 * True iff the triple has any linear-optimal arrangement in Dict B's full
 * word graph — i.e. one terminal sits on a Dict B shortest path between
 * the other two with cost equal to the Dict B Steiner optimum. The picker
 * rejects this case: even though our displayed optimal is via Dict A,
 * players who route through rarer words could otherwise find a chain
 * solution that matches the most efficient B-space tree.
 */
export const hasLinearOptimalInDictB = (
  start: string,
  t1: string,
  t2: string
): boolean => {
  const fromStart = bfsDictBDistances(start);
  const fromT1 = bfsDictBDistances(t1);
  const fromT2 = bfsDictBDistances(t2);

  let steinerSum = Infinity;
  for (const [v, d1] of fromStart) {
    const d2 = fromT1.get(v);
    if (d2 === undefined) continue;
    const d3 = fromT2.get(v);
    if (d3 === undefined) continue;
    const sum = d1 + d2 + d3;
    if (sum < steinerSum) steinerSum = sum;
  }
  if (!isFinite(steinerSum)) return false;

  return detectLinearOptimal(
    steinerSum,
    fromStart.get(t1),
    fromStart.get(t2),
    fromT1.get(t2)
  );
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
    hasLinearOptimal: detectLinearOptimal(
      best.sum,
      fromStart.distances.get(t1),
      fromStart.distances.get(t2),
      fromT1.distances.get(t2)
    ),
  };
};

// --- Daily Triple generation -----------------------------------------------

const MIN_TREE_EDGES = 5;
const MAX_TREE_EDGES = 10;
// Each target must be within this many legitimate-edges of the start.
// Constrains the candidate set so the Steiner check has a high hit rate.
const MIN_TERM_DIST = 2;
const MAX_TERM_DIST = 7;
// The two targets must also be at least this many edges apart from each
// other. Without this, the picker can produce degenerate triples like
// `tribe + rid + grid` where rid → grid is a single letter — visually
// odd and trivialises the puzzle.
const MIN_PAIRWISE_TARGET_DIST = 2;

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
  dateString: string = getLocalDateString()
): DailyTriple => {
  // Manual override takes precedence over the deterministic picker.
  const override = tripleOverrides[dateString];
  if (override) {
    const steiner = findSteinerTree(override.start, override.t1, override.t2);
    return {
      start: override.start,
      t1: override.t1,
      t2: override.t2,
      // Use computed optimal if available; fall back to a safe default if
      // the override words can't connect in legitimate (shouldn't happen
      // for vetted overrides but guard anyway).
      optimalEdges: steiner ? steiner.edges : 5,
    };
  }

  const sortedLegitimate = getSortedLegitimate();
  const viableStarts = sortedLegitimate.filter(isViableStart);

  // Phase 1 (most attempts): reject any candidate where a linear-optimal
  // arrangement exists — linear "triples" are essentially two daily puzzles
  // stuck together and lose the tree character. Phase 2 (final attempts)
  // drops the constraint as a fallback so we never fail to return a puzzle.
  // In practice phase 2 should be rare; the natural linear rate is well
  // below the budget.
  const TOTAL_ATTEMPTS = 256;
  const LINEAR_REJECT_UNTIL = 240;
  for (let attempt = 0; attempt < TOTAL_ATTEMPTS; attempt++) {
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

    // Filter the t2 candidate set: must be distinct from t1 AND at least
    // MIN_PAIRWISE_TARGET_DIST legitimate-edges away.
    const distancesFromT1 = bfsDistancesLegitimate(t1);
    const t2Candidates = candidates.filter((w) => {
      if (w === t1) return false;
      const d = distancesFromT1.get(w);
      return d !== undefined && d >= MIN_PAIRWISE_TARGET_DIST;
    });
    if (t2Candidates.length === 0) continue;
    const t2Index =
      hashStringWithSalt(dateString, attempt * 4 + 103) % t2Candidates.length;
    const t2 = t2Candidates[t2Index];

    const steiner = findSteinerTree(start, t1, t2);
    if (!steiner) continue;
    if (steiner.edges < MIN_TREE_EDGES || steiner.edges > MAX_TREE_EDGES) {
      continue;
    }
    if (attempt < LINEAR_REJECT_UNTIL) {
      // Reject if a linear-optimal exists in *either* the legitimate
      // (Dict A) graph or the full Dict B graph — see hasLinearOptimal
      // comment on SteinerTree for context. Two-step check: the Dict A
      // one is cheap (already computed), Dict B requires extra BFS so
      // only run it when Dict A passes.
      if (steiner.hasLinearOptimal) continue;
      if (hasLinearOptimalInDictB(start, t1, t2)) continue;
    }

    return { start, t1, t2, optimalEdges: steiner.edges };
  }

  // Fallback: should never trigger in practice. If it does, we still need
  // *something* renderable. Use the daily pair's start and a couple of
  // close neighbours; the player will see a degenerate puzzle but the app
  // won't crash.
  return { start: "a", t1: "at", t2: "in", optimalEdges: 3 };
};
