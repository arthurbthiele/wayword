// Indirection layer over the wordGraph data file. The actual file is ~7 MB
// raw; importing it statically would force every page load to download and
// parse the whole dictionary before the app shell can render. Instead we
// load it via a dynamic `import()` from App on mount and stash it here, so
// the app's initial JS bundle is small and the dictionary streams in after.
//
// All consumer code goes through `getWordGraph()` to read it; the
// `setWordGraph()` setter is called once, by App during boot (or by the
// test setup file).

export type WordGraph = Record<string, string[]>;

let cached: WordGraph | null = null;

export const setWordGraph = (graph: WordGraph): void => {
  cached = graph;
};

export const getWordGraph = (): WordGraph => {
  if (!cached) {
    throw new Error(
      "wordGraph not loaded yet — check the boot order in App.tsx"
    );
  }
  return cached;
};

export const isWordGraphLoaded = (): boolean => cached !== null;
