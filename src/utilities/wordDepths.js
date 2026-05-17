import { wordGraph } from "../dictionaryData";

export const computeDepths = (currentGraphNodes) => {
  const depths = {};
  const nodesToVisit = [];
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
