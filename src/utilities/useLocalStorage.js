import { useState, useEffect } from "react";

const storagePrefix = "wordJourney:";

export const useLocalStorage = (key, initialValue) => {
  const fullKey = storagePrefix + key;
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(fullKey);
      return stored !== null ? JSON.parse(stored) : initialValue;
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

export const clearLocalStorage = () => {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(storagePrefix)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore.
  }
};
