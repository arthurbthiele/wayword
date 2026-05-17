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
