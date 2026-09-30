// Fetch + cache definitions from the Wiktionary REST API (free, no key,
// CORS-enabled). Used by the InputBar's "look up" button. Cache results in
// localStorage so repeat lookups are instant and we stay polite to the API.
//
// Docs: https://en.wiktionary.org/api/rest_v1/#/Page%20content/get_page_definition__term_
// The response's `en` bucket means "entries on English Wiktionary", not
// "English-language entries" — it includes Translingual (ISO codes etc.) and
// other languages, so we filter on `language === "English"`. Definitions are
// Parsoid HTML fragments; we reduce them to plain text.

// Bumped when the source changed: not_found results from the previous API
// (a partial Wiktionary scrape) shouldn't shadow the complete source.
const CACHE_PREFIX = "wj:def2:";
const API_BASE = "https://en.wiktionary.org/api/rest_v1/page/definition/";
const REQUEST_TIMEOUT_MS = 8 * 1000;
const ENGLISH = "English";

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

type WiktionaryEntry = {
  partOfSpeech?: string;
  language?: string;
  definitions?: { definition?: string; examples?: string[] }[];
};

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

// Some definitions embed template <style> blocks whose CSS would otherwise
// leak into textContent (seen on "lich").
const htmlToText = (html: string): string => {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  for (const element of body.querySelectorAll("style, link, script")) {
    element.remove();
  }
  return (body.textContent ?? "").replace(/\s+/g, " ").trim();
};

const toMeanings = (entries: WiktionaryEntry[]): DefinitionData["meanings"] =>
  entries
    .filter((entry) => entry.language === ENGLISH)
    .map((entry) => ({
      partOfSpeech: (entry.partOfSpeech ?? "").toLowerCase(),
      definitions: (entry.definitions ?? [])
        .map((definition) => ({
          definition: htmlToText(definition.definition ?? ""),
          example: definition.examples?.[0]
            ? htmlToText(definition.examples[0])
            : undefined,
        }))
        .filter((definition) => definition.definition.length > 0),
    }))
    .filter((meaning) => meaning.definitions.length > 0);

const saveNotFound = (word: string): DefinitionResult => {
  const result: DefinitionResult = { status: "not_found", word };
  writeCache(word, result);
  return result;
};

export const fetchDefinition = async (
  word: string
): Promise<DefinitionResult> => {
  const cached = readCache(word);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(API_BASE + encodeURIComponent(word), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { status: "error", word };
  }

  if (response.status === 404) return saveNotFound(word);
  if (!response.ok) return { status: "error", word };

  let json: { en?: WiktionaryEntry[] };
  try {
    json = await response.json();
  } catch {
    return { status: "error", word };
  }

  const meanings = toMeanings(json.en ?? []);
  if (meanings.length === 0) return saveNotFound(word);

  const result: DefinitionResult = { status: "ok", data: { word, meanings } };
  writeCache(word, result);
  return result;
};
