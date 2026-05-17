import { wordGraph } from "../dictionaryData/wordGraph";
import type { GraphNode } from "./wordDepths";

/**
 * BFS shortest path from `start` to `target` through the user's current graph
 * (i.e. only words they've added). Returns the sequence of words, or null if
 * the target is not reachable from the start within the given graph.
 */
export const findShortestPathInGraph = (
  graphNodes: GraphNode[],
  graphEdges: { from: string; to: string }[],
  start: string,
  target: string
): string[] | null => {
  if (start === target) return [start];

  const nodeIds = new Set(graphNodes.map((node) => node.id));
  if (!nodeIds.has(start) || !nodeIds.has(target)) return null;

  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) adjacency.set(id, new Set());
  for (const edge of graphEdges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const previous = new Map<string, string>();
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    if (current === target) {
      const path: string[] = [];
      let step: string | undefined = target;
      while (step !== undefined) {
        path.unshift(step);
        step = previous.get(step);
      }
      return path;
    }
    for (const neighbour of adjacency.get(current) ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        previous.set(neighbour, current);
        queue.push(neighbour);
      }
    }
  }

  return null;
};

/**
 * Reconstructs the path the user actually took to reach `target`, by walking
 * back through the `parents` map (which records the word that was selected
 * when each word was added). Returns null if `target` can't be traced back
 * to `start` via parents (e.g. on legacy graphs that pre-date parent tracking).
 */
export const findUserPath = (
  parents: Record<string, string> | undefined,
  start: string,
  target: string
): string[] | null => {
  if (target === start) return [start];
  if (!parents) return null;
  const path: string[] = [target];
  let current = target;
  let safety = 500;
  while (current !== start && parents[current] && safety-- > 0) {
    current = parents[current];
    path.unshift(current);
  }
  return current === start ? path : null;
};

/**
 * Multi-source BFS through the dictionary from any of `startNodeIds` to
 * `target`. Returns the shortest path, starting at whichever start node is
 * closest. Used to show the "qualifying chain" — the puzzle the picker
 * implicitly set when it chose a target at depth N from the user's graph.
 *
 * If `restrictTo` is provided, only words in that set are traversable
 * (and only start nodes within it are considered seeds). Use this to show
 * a legitimate-only qualifying chain rather than one routed through
 * obscure B-only words.
 */
export const findShortestPathFromAnyToTarget = (
  startNodeIds: string[],
  target: string,
  restrictTo?: ReadonlySet<string>
): string[] | null => {
  if (startNodeIds.length === 0) return null;
  if (restrictTo && !restrictTo.has(target)) return null;
  const seeds = restrictTo
    ? startNodeIds.filter((id) => restrictTo.has(id))
    : startNodeIds;
  if (seeds.length === 0) return null;
  if (seeds.includes(target)) return [target];

  const visited = new Set<string>(seeds);
  const previous = new Map<string, string>();
  const queue: string[] = [...seeds];
  let head = 0;

  while (head < queue.length) {
    const word = queue[head++];
    if (word === target) {
      const path: string[] = [];
      let step: string | undefined = word;
      while (step !== undefined) {
        path.unshift(step);
        step = previous.get(step);
      }
      return path;
    }
    for (const neighbour of wordGraph[word] ?? []) {
      if (restrictTo && !restrictTo.has(neighbour)) continue;
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        previous.set(neighbour, word);
        queue.push(neighbour);
      }
    }
  }

  return null;
};

/**
 * BFS shortest path between two words using the dictionary as the graph.
 * If `restrictTo` is provided, BFS only visits words in that set — used to
 * compute the "optimal" path using only legitimate words (so the comparison
 * shown to the player feels honest, not built from obscure intermediates).
 */
export const findShortestPathInDictionary = (
  start: string,
  target: string,
  restrictTo?: ReadonlySet<string>
): string[] | null => {
  if (start === target) return [start];
  if (!(start in wordGraph) || !(target in wordGraph)) return null;
  if (restrictTo && (!restrictTo.has(start) || !restrictTo.has(target))) {
    return null;
  }

  const previous = new Map<string, string>();
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    if (current === target) {
      const path: string[] = [];
      let step: string | undefined = target;
      while (step !== undefined) {
        path.unshift(step);
        step = previous.get(step);
      }
      return path;
    }
    for (const neighbour of wordGraph[current] ?? []) {
      if (restrictTo && !restrictTo.has(neighbour)) continue;
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        previous.set(neighbour, current);
        queue.push(neighbour);
      }
    }
  }

  return null;
};
