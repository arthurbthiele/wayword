import { wordGraph } from "../dictionaryData/wordGraph";

export type GraphNode = { id: string; label: string };
export type Depths = Record<string, number>;

export const computeDepths = (currentGraphNodes: GraphNode[]): Depths => {
  const depths: Depths = {};
  const nodesToVisit: string[] = [];
  let head = 0;

  currentGraphNodes.forEach((node) => {
    depths[node.id] = 0;
    nodesToVisit.push(node.id);
  });

  while (head < nodesToVisit.length) {
    const currentWord = nodesToVisit[head++];
    const currentDepth = depths[currentWord];
    const adjacentWords = wordGraph[currentWord] || [];
    adjacentWords.forEach((word) => {
      if (!(word in depths) || depths[word] > currentDepth + 1) {
        depths[word] = currentDepth + 1;
        nodesToVisit.push(word);
      }
    });
  }

  return depths;
};
