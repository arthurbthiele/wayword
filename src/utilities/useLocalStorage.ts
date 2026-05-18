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
