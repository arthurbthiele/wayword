import { getWordGraph } from "../dictionaryData/wordGraphRef";
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
 * Multi-source BFS through the user's graph from any of `startNodeIds` to
 * `target`. Returns the shortest such path. Used in free play, where the
 * "starting frontier" is the graph snapshot at pick time and the
 * just-reached `target` is the end.
 */
export const findShortestPathInGraphFromAny = (
  graphNodes: GraphNode[],
  graphEdges: { from: string; to: string }[],
  startNodeIds: readonly string[],
  target: string
): string[] | null => {
  if (startNodeIds.length === 0) return null;
  const nodeIds = new Set(graphNodes.map((node) => node.id));
  if (!nodeIds.has(target)) return null;
  const seeds = startNodeIds.filter((id) => nodeIds.has(id));
  if (seeds.length === 0) return null;
  if (seeds.includes(target)) return [target];

  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) adjacency.set(id, new Set());
  for (const edge of graphEdges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const previous = new Map<string, string>();
  const visited = new Set<string>(seeds);
  const queue: string[] = [...seeds];
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
 * Multi-source BFS through the dictionary from any of `startNodeIds` to
 * `target`. Returns the shortest path, starting at whichever start node is
 * closest.
 *
 * If `restrictTo` is provided, only words in that set are traversable
 * (and only start nodes within it are considered seeds). Use this to keep
 * the chain composed of legitimate words rather than obscure B-only ones.
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

  const wordGraph = getWordGraph();
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
  const wordGraph = getWordGraph();
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
