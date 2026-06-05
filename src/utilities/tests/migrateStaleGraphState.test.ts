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

  it("clears daily state when stored start word doesn't match picker", () => {
    setGraph("daily:v2:2026-06-02", "wrong");
    window.localStorage.setItem(
      "wordJourney:daily:v2:2026-06-02:selectedWord",
      JSON.stringify("wrong")
    );

    migrateStaleGraphState(
      () => ({ start: "plain" }),
      () => ({ start: "anything" })
    );

    expect(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:graph")
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "wordJourney:daily:v2:2026-06-02:selectedWord"
      )
    ).toBeNull();
  });

  it("preserves state when stored start matches picker", () => {
    setGraph("daily:v2:2026-06-02", "plain");

    migrateStaleGraphState(
      () => ({ start: "plain" }),
      () => ({ start: "anything" })
    );

    expect(
      window.localStorage.getItem("wordJourney:daily:v2:2026-06-02:graph")
    ).not.toBeNull();
  });

  it("handles triple state mismatch", () => {
    setGraph("triple:v1:2026-06-02", "wrong");

    migrateStaleGraphState(
      () => ({ start: "anything" }),
      () => ({ start: "slip" })
    );

    expect(
      window.localStorage.getItem("wordJourney:triple:v1:2026-06-02:graph")
    ).toBeNull();
  });

  it("doesn't touch unrelated keys (freeplay, stats)", () => {
    setGraph("daily:v2:2026-06-02", "wrong");
    window.localStorage.setItem(
      "wordJourney:freeplay:target",
      JSON.stringify("something")
    );
    window.localStorage.setItem(
      "wordJourney:stats:dailyHistory",
      JSON.stringify({})
    );

    migrateStaleGraphState(
      () => ({ start: "plain" }),
      () => ({ start: "anything" })
    );

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
      migrateStaleGraphState(
        () => ({ start: "plain" }),
        () => ({ start: "anything" })
      )
    ).not.toThrow();
  });
});
