import { migrateStaleGraphState } from "../useLocalStorage";

describe("migrateStaleGraphState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const setGraph = (key: string, startWord: string) => {
    window.localStorage.setItem(
      `wordJourney:${key}:graph`,
      JSON.stringify({
        nodes: [{ id: startWord, label: startWord }],
        edges: [],
        parents: {},
      })
    );
  };

  // The migration only clears state in the orphan-word case: the stored
  // start has been removed from the playable dictionary and the player
  // genuinely can't move from it. Other forms of dict drift (picker
  // output shifted but start word still typeable) are tolerated because
  // the per-date puzzle cache makes the user's stored puzzle canonical.

  it("clears daily state when the stored start is no longer in the dictionary", () => {
    setGraph("daily:v2:2026-06-02", "removed");
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:selectedWord",
      JSON.stringify("removed")
    );

    const playable = new Set(["alive", "plain", "held"]);
    migrateStaleGraphState((word) => playable.has(word));

    expect(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:graph")
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "wordJourney:daily:v2:2026-06-02:selectedWord"
      )
    ).toBeNull();
  });

  it("preserves state when the stored start is still playable, even if the picker would now pick something different", () => {
    setGraph("daily:v2:2026-06-02", "plain");

    // Simulate dict drift: the picker would now give a different start,
    // but "plain" itself is still a valid word in the dictionary.
    const playable = new Set(["plain", "alive"]);
    migrateStaleGraphState((word) => playable.has(word));

    expect(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:graph")
    ).not.toBeNull();
  });

  it("clears triple state when the stored start is no longer playable", () => {
    setGraph("triple:v1:2026-06-02", "removed");

    const playable = new Set(["alive"]);
    migrateStaleGraphState((word) => playable.has(word));

    expect(
      window.localStorage.getItem("wordJourney:triple:v1:2026-06-02:graph")
    ).toBeNull();
  });

  it("doesn't touch unrelated keys (freeplay, stats)", () => {
    setGraph("daily:v2:2026-06-02", "removed");
    window.localStorage.setItem(
      "wordJourney:freeplay:target",
      JSON.stringify("something")
    );
    window.localStorage.setItem(
      "wordJourney:stats:dailyHistory",
      JSON.stringify({})
    );

    migrateStaleGraphState(() => false); // everything appears removed

    expect(
      window.localStorage.getItem("wordJourney:freeplay:target")
    ).not.toBeNull();
    expect(
      window.localStorage.getItem("wordJourney:stats:dailyHistory")
    ).not.toBeNull();
  });

  it("ignores malformed JSON in a stored graph (doesn't throw)", () => {
    // A corrupted graph blob shouldn't crash the migration on app load.
    // Leaving the value in place is fine — useLocalStorage will fall back
    // to the initial value when it tries to parse and fails.
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:graph",
      "{not valid JSON"
    );

    expect(() =>
      migrateStaleGraphState(() => true)
    ).not.toThrow();
  });
});
