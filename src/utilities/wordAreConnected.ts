import { getWordGraph } from "../dictionaryData/wordGraphRef";

export const wordsAreConnected = (
  word1: string,
  word2: string | null | undefined
): boolean => {
  if (!word2 || typeof word2 !== "string") {
    return false;
  }
  const neighbours = getWordGraph()[word2];
  return neighbours ? neighbours.includes(word1) : false;
};
