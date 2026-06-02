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

/**
 * Detects daily / triple graph state whose stored start word no longer
 * matches the picker's start for that date — e.g. after a dict swap or
 * a local-rollover change shifted the puzzle for that calendar date.
 * When detected, clears all state for that date's keyPrefix so the user
 * gets a fresh puzzle aligned with the new picker output.
 *
 * Targeted: only clears dates with actual mismatches. Most users see
 * nothing change. Idempotent.
 *
 * Takes the picker functions as args (rather than importing them) to
 * avoid a circular module-load order between useLocalStorage and the
 * pickers; callers pass them in.
 */
export const migrateStaleGraphState = (
  pickDaily: (dateString: string) => { start: string },
  pickTriple: (dateString: string) => { start: string }
): void => {
  const dailyPattern = new RegExp(
    `^${storagePrefix}daily:v2:(\\d{4}-\\d{2}-\\d{2}):graph$`
  );
  const triplePattern = new RegExp(
    `^${storagePrefix}triple:v1:(\\d{4}-\\d{2}-\\d{2}):graph$`
  );

  const checkAndMaybeClear = (
    keyPrefixForDate: string,
    expectedStart: string
  ): void => {
    const fullGraphKey = storagePrefix + keyPrefixForDate + ":graph";
    try {
      const raw = window.localStorage.getItem(fullGraphKey);
      if (!raw) return;
      const stored = JSON.parse(raw);
      const storedStart = stored?.nodes?.[0]?.id;
      if (storedStart && storedStart !== expectedStart) {
        // Mismatch — clear everything under this date's prefix.
        const fullPrefix = storagePrefix + keyPrefixForDate + ":";
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(fullPrefix)) {
            window.localStorage.removeItem(key);
          }
        }
      }
    } catch {
      // Parse error or storage error — leave state alone.
    }
  };

  try {
    const dailyDates: string[] = [];
    const tripleDates: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const dailyMatch = key.match(dailyPattern);
      if (dailyMatch) dailyDates.push(dailyMatch[1]);
      const tripleMatch = key.match(triplePattern);
      if (tripleMatch) tripleDates.push(tripleMatch[1]);
    }
    for (const date of dailyDates) {
      checkAndMaybeClear(`daily:v2:${date}`, pickDaily(date).start);
    }
    for (const date of tripleDates) {
      checkAndMaybeClear(`triple:v1:${date}`, pickTriple(date).start);
    }
  } catch {
    // Ignore — localStorage might be unavailable.
  }
};
