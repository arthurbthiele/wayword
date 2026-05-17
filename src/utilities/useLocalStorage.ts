import { useState, useEffect, Dispatch, SetStateAction } from "react";

const storagePrefix = "wordJourney:";

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] => {
  const fullKey = storagePrefix + key;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(fullKey);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(value));
    } catch {
      // Private browsing mode or quota exceeded — silently degrade.
    }
  }, [fullKey, value]);

  return [value, setValue];
};

/**
 * One-time clear of daily state when the daily scheme changes (e.g. the
 * v1 → v2 jump that introduced random start words). Daily state was tied
 * to start='a'; carrying it forward would conflict with the new puzzle.
 */
export const migrateDailyToV2 = (): void => {
  const flagKey = storagePrefix + "dailyMigrated:v2";
  if (window.localStorage.getItem(flagKey) !== null) return;
  const dailyPrefix = storagePrefix + "daily:";
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(dailyPrefix)) {
        window.localStorage.removeItem(key);
      }
    }
    window.localStorage.setItem(flagKey, "true");
  } catch {
    // Ignore.
  }
};

/**
 * One-time migration of pre-daily-mode keys. Earlier versions stored
 * free-play state without a mode prefix; daily mode introduced the
 * `freeplay:` prefix so the two modes can persist independently.
 */
export const migrateLegacyFreePlayKeys = (): void => {
  const flagKey = storagePrefix + "migration:v1";
  if (window.localStorage.getItem(flagKey) !== null) return;

  const legacyKeys = [
    "graph",
    "selectedWord",
    "target",
    "difficulty",
    "score",
    "lastScoredTarget",
  ];
  try {
    for (const key of legacyKeys) {
      const oldFull = storagePrefix + key;
      const newFull = storagePrefix + "freeplay:" + key;
      const value = window.localStorage.getItem(oldFull);
      if (value !== null && window.localStorage.getItem(newFull) === null) {
        window.localStorage.setItem(newFull, value);
        window.localStorage.removeItem(oldFull);
      }
    }
    window.localStorage.setItem(flagKey, "true");
  } catch {
    // Private mode / quota — never block the app.
  }
};

/**
 * Removes every key under `wordJourney:${subPrefix}`. Pass an empty string
 * to clear all app state, or a mode prefix like `"daily:"` / `"freeplay:"`
 * to clear only that mode's state.
 */
export const clearLocalStorage = (subPrefix: string = ""): void => {
  const fullPrefix = storagePrefix + subPrefix;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore.
  }
};
