import { wordGraph } from "../dictionaryData/wordGraph";

export const wordsAreConnected = (
  word1: string,
  word2: string | null | undefined
): boolean => {
  if (!word2 || typeof word2 !== "string") {
    return false;
  }
  return wordGraph[word2].includes(word1);
};
