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
