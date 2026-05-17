import { targetWords } from "../dictionaryData/targets";

/**
 * Today's date in the user's local timezone, formatted YYYY-MM-DD.
 * This is the key under which today's daily-challenge state is stored.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// FNV-1a 32-bit. Better avalanche than djb2 for similar inputs, which matters
// because consecutive dates like 2026-05-17 / 2026-05-18 are extremely similar
// and we don't want them to map to neighbouring indices in a sorted word list.
const hashString = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0);
};

/**
 * Deterministic target word for a given date. Every player gets the same
 * word for a given date as long as the targets list does not change.
 */
export const getTargetForDate = (
  dateString: string = getLocalDateString()
): string => {
  const index = hashString(dateString) % targetWords.length;
  return targetWords[index];
};
