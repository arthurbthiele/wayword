/**
 * The game's internal representation is lowercase. For one specific word
 * ('i'), that lowercase form reads as a typo because the first-person
 * pronoun is universally capitalised in written English. This helper
 * applies the visual override at user-facing surfaces — node labels,
 * status-strip text, victory paths, hint messages. Internal logic
 * (matching, BFS, graph storage) continues to use the lowercase form.
 */
export const displayWord = (word: string): string =>
  word === "i" ? "I" : word;
