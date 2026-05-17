import { findShortestPathInDictionary } from "./findPath";
import { legitimateWords } from "../dictionaryData/legitimate";

/**
 * Logs both shortest paths from a chosen start word to a target word:
 *   - using only words in dict A ('legitimate')
 *   - using any valid input word (full A ∪ B graph)
 * Useful for debugging target difficulty / feasibility.
 */
export const logTargetPaths = (
  label: string,
  target: string,
  start: string = "a"
): void => {
  const legitPath = findShortestPathInDictionary(
    start,
    target,
    legitimateWords
  );
  const anyPath = findShortestPathInDictionary(start, target);

  const fmt = (path: string[] | null) =>
    path ? `${path.join(" → ")}  (${path.length - 1} moves)` : "(none)";

  console.log(
    `%c[${label}] ${start} → ${target}\n` +
      `  legitimate-only: ${fmt(legitPath)}\n` +
      `  any-word:        ${fmt(anyPath)}`,
    "color: #c25a2a; font-weight: 600;"
  );
};
