import { getWordGraph } from "../dictionaryData/wordGraphRef";

export type GraphNode = { id: string; label: string };
export type Depths = Record<string, number>;

/**
 * Multi-source BFS from the given graph nodes through the dictionary,
 * recording the shortest-path distance from any of those nodes to every
 * word reached. If `restrictTo` is provided, the BFS uses only words in
 * that set — both as seed candidates and as traversable neighbours — so
 * the resulting depths are distances through a sub-graph (e.g. legitimate
 * words only).
 */
export const computeDepths = (
  currentGraphNodes: GraphNode[],
  restrictTo?: ReadonlySet<string>
): Depths => {
  const wordGraph = getWordGraph();
  const depths: Depths = {};
  const nodesToVisit: string[] = [];
  let head = 0;

  currentGraphNodes.forEach((node) => {
    if (restrictTo && !restrictTo.has(node.id)) return;
    depths[node.id] = 0;
    nodesToVisit.push(node.id);
  });

  while (head < nodesToVisit.length) {
    const currentWord = nodesToVisit[head++];
    const currentDepth = depths[currentWord];
    const adjacentWords = wordGraph[currentWord] || [];
    adjacentWords.forEach((word) => {
      if (restrictTo && !restrictTo.has(word)) return;
      if (!(word in depths) || depths[word] > currentDepth + 1) {
        depths[word] = currentDepth + 1;
        nodesToVisit.push(word);
      }
    });
  }

  return depths;
};
