import { loadOrPickDaily, loadOrPickTriple } from "../puzzleCache";

describe("loadOrPickDaily", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("caches the first picker result and returns the same pair on subsequent calls", () => {
    const first = loadOrPickDaily("2026-06-02");
    const second = loadOrPickDaily("2026-06-02");
    expect(second).toEqual(first);
  });

  it("writes the cached pair under the expected localStorage key", () => {
    const pair = loadOrPickDaily("2026-06-02");
    const raw = window.localStorage.getItem(
      "wordJourney:daily:v2:2026-06-02:puzzle"
    );
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.start).toBe(pair.start);
    expect(stored.target).toBe(pair.target);
    expect(stored.version).toBe(1);
  });

  it("returns the cached pair even if the picker would now disagree", () => {
    // Seed the cache with a hand-crafted entry. As long as the version
    // matches the current code's PUZZLE_CACHE_VERSION (1), the cache is
    // trusted — we do NOT re-derive from the picker.
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:puzzle",
      JSON.stringify({ start: "alive", target: "dance", version: 1 })
    );
    const pair = loadOrPickDaily("2026-06-02");
    expect(pair).toEqual({ start: "alive", target: "dance" });
  });

  it("invalidates and re-picks when the stored version is older than the current version", () => {
    // Pretend a previous app version stored a cache entry under version
    // 0. The current code only honours version 1, so should re-pick and
    // overwrite.
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:puzzle",
      JSON.stringify({ start: "fakeword", target: "fakeword", version: 0 })
    );
    const pair = loadOrPickDaily("2026-06-02");
    expect(pair.start).not.toBe("fakeword");
    const stored = JSON.parse(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:puzzle")!
    );
    expect(stored.version).toBe(1);
  });

  it("falls through to re-pick if a version-matched cache entry is missing fields", () => {
    // A hand-edited or partially-corrupt entry with the right version
    // tag but no start/target shouldn't return undefined words. Type
    // guards on start/target force a fresh pick instead.
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:puzzle",
      JSON.stringify({ version: 1 })
    );
    const pair = loadOrPickDaily("2026-06-02");
    expect(typeof pair.start).toBe("string");
    expect(typeof pair.target).toBe("string");
  });

  it("wipes a stale in-progress graph when the cache miss resolves to a different start", () => {
    // Simulate a user mid-game from before the cache existed: there's a
    // graph in localStorage but no `:puzzle` entry. The fresh pick will
    // disagree with the stored graph's start.
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:graph",
      JSON.stringify({
        nodes: [{ id: "stalestart", label: "stalestart" }],
        edges: [],
      })
    );
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:selectedWord",
      JSON.stringify("stalestart")
    );

    const fresh = loadOrPickDaily("2026-06-02");
    expect(fresh.start).not.toBe("stalestart");
    // Graph + selectedWord both wiped by the reconciliation step.
    expect(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:graph")
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "wordJourney:daily:v2:2026-06-02:selectedWord"
      )
    ).toBeNull();
  });

  it("leaves an in-progress graph alone when the stored start matches the fresh pick", () => {
    // First compute the fresh pick so we can build a matching graph.
    const fresh = loadOrPickDaily("2026-06-02");
    // Clear the cache entry but keep a matching graph — simulates "user
    // had a matching graph from before the cache existed, then we cache-miss".
    window.localStorage.removeItem("wordJourney:daily:v2:2026-06-02:puzzle");
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:graph",
      JSON.stringify({
        nodes: [{ id: fresh.start, label: fresh.start }],
        edges: [],
      })
    );

    loadOrPickDaily("2026-06-02");
    expect(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:graph")
    ).not.toBeNull();
  });
});

describe("loadOrPickTriple", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("caches the first picker result and returns the same trio on subsequent calls", () => {
    const first = loadOrPickTriple("2026-06-02");
    const second = loadOrPickTriple("2026-06-02");
    expect(second).toEqual(first);
  });

  it("writes the cached trio under the expected localStorage key with version", () => {
    const trio = loadOrPickTriple("2026-06-02");
    const raw = window.localStorage.getItem(
      "wordJourney:triple:v1:2026-06-02:puzzle"
    );
    const stored = JSON.parse(raw!);
    expect(stored.start).toBe(trio.start);
    expect(stored.t1).toBe(trio.t1);
    expect(stored.t2).toBe(trio.t2);
    expect(stored.version).toBe(1);
  });
});
