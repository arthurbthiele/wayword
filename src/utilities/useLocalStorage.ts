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
 * Detects stored daily / triple graphs whose start word is no longer in
 * the playable dictionary — the orphan-word case, where excluding the
 * word from Dict B (via excludeBoth) has stranded the user on an
 * unreachable node. When detected, clears all state for that date's
 * keyPrefix so the user can pick up a fresh puzzle.
 *
 * Other forms of dict drift are deliberately tolerated. The puzzle
 * cache (`{daily,triple}:vN:{date}:puzzle`) is the user's source of
 * truth for what they're playing, and the picker is only consulted on
 * cache miss — so shifts in picker output across deploys never disrupt
 * a stored puzzle, only this true unplayable case does.
 *
 * Takes the dict-membership check as an arg to avoid a circular module
 * load between useLocalStorage and wordGraphRef.
 *
 * Idempotent.
 */
export const migrateStaleGraphState = (
  isPlayable: (word: string) => boolean
): void => {
  const dailyPattern = new RegExp(
    `^${storagePrefix}daily:v2:(\\d{4}-\\d{2}-\\d{2}):graph$`
  );
  const triplePattern = new RegExp(
    `^${storagePrefix}triple:v1:(\\d{4}-\\d{2}-\\d{2}):graph$`
  );

  const clearPrefix = (fullPrefix: string): void => {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        window.localStorage.removeItem(key);
      }
    }
  };

  const checkAndMaybeClear = (keyPrefixForDate: string): void => {
    const fullGraphKey = storagePrefix + keyPrefixForDate + ":graph";
    try {
      const raw = window.localStorage.getItem(fullGraphKey);
      if (!raw) return;
      const stored = JSON.parse(raw);
      const storedStart = stored?.nodes?.[0]?.id;
      if (storedStart && !isPlayable(storedStart)) {
        clearPrefix(storagePrefix + keyPrefixForDate + ":");
      }
    } catch {
      // Parse error or storage error — leave state alone.
    }
  };

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const dm = key.match(dailyPattern);
      if (dm) checkAndMaybeClear(`daily:v2:${dm[1]}`);
      const tm = key.match(triplePattern);
      if (tm) checkAndMaybeClear(`triple:v1:${tm[1]}`);
    }
  } catch {
    // Ignore — localStorage might be unavailable.
  }
};
