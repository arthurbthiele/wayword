// Fetch + cache definitions from dictionaryapi.dev (free, no key, CORS-
// enabled). Used by the InputBar's "look up" button. Cache results in
// localStorage so repeat lookups are instant and we don't re-hit the API
// — they rate-limit aggressively (429s) under burst load, and we want
// to be polite.

const CACHE_PREFIX = "wj:def:";
const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";

export type DefinitionData = {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
};

export type DefinitionResult =
  | { status: "ok"; data: DefinitionData }
  | { status: "not_found"; word: string }
  | { status: "error"; word: string };

const readCache = (word: string): DefinitionResult | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + word);
    return raw ? (JSON.parse(raw) as DefinitionResult) : null;
  } catch {
    return null;
  }
};

const writeCache = (word: string, result: DefinitionResult): void => {
  // Only persist deterministic outcomes — transient network errors
  // shouldn't poison the cache for next time.
  if (result.status === "error") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + word, JSON.stringify(result));
  } catch {
    // Quota exceeded or private mode — fail silently. Next lookup will
    // just hit the API again.
  }
};

export const fetchDefinition = async (
  word: string
): Promise<DefinitionResult> => {
  const cached = readCache(word);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(API_BASE + encodeURIComponent(word));
  } catch {
    return { status: "error", word };
  }

  if (response.status === 404) {
    const result: DefinitionResult = { status: "not_found", word };
    writeCache(word, result);
    return result;
  }
  if (!response.ok) {
    // 429s or 5xxs — don't cache; let the user try again.
    return { status: "error", word };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { status: "error", word };
  }

  if (!Array.isArray(json) || json.length === 0) {
    const result: DefinitionResult = { status: "not_found", word };
    writeCache(word, result);
    return result;
  }

  const entry = json[0] as {
    word?: string;
    phonetic?: string;
    meanings?: {
      partOfSpeech?: string;
      definitions?: { definition?: string; example?: string }[];
    }[];
  };

  const data: DefinitionData = {
    word: entry.word ?? word,
    phonetic: entry.phonetic,
    meanings: (entry.meanings ?? []).map((m) => ({
      partOfSpeech: m.partOfSpeech ?? "",
      definitions: (m.definitions ?? []).map((d) => ({
        definition: d.definition ?? "",
        example: d.example,
      })),
    })),
  };
  const result: DefinitionResult = { status: "ok", data };
  writeCache(word, result);
  return result;
};
