import { wordsAreConnected } from "../wordAreConnected";

it("should return that a and at are connected", () => {
  expect(wordsAreConnected("a", "at")).toBe(true);
});
it("should return that hat and bot are not connected", () => {
  expect(wordsAreConnected("hat", "bot")).toBe(false);
});

describe("orphan-word fallback (post-dict-migration)", () => {
  // `ar` and `han` were valid words under earlier dictionaries but were
  // removed in later dict regenerations. Players with these in their
  // freeplay graph need to be able to navigate AWAY from them — even
  // though the precomputed adjacency no longer has an entry.

  it("allows extending from an orphan to a current-dict word (substitution)", () => {
    // `ar` not in current Dict B; `or` is. ar → or is one substitution.
    expect(wordsAreConnected("or", "ar")).toBe(true);
  });

  it("allows extending from an orphan to a current-dict word (insertion)", () => {
    // ar → are is one insertion. `are` is in current Dict B.
    expect(wordsAreConnected("are", "ar")).toBe(true);
  });

  it("rejects extending from a current-dict word TO an orphan", () => {
    // We don't re-admit removed words. `or` is in dict; `ar` isn't.
    // Even though they are L1 apart, typing `ar` from `or` should fail.
    expect(wordsAreConnected("ar", "or")).toBe(false);
  });

  it("rejects extending from an orphan to a non-Dict-B word", () => {
    // Even from an orphan, we only admit words present in Dict B.
    expect(wordsAreConnected("blargle", "ar")).toBe(false);
  });

  it("rejects when the proposed step isn't actually L1 from the orphan", () => {
    // From orphan `han`, "than" is L1 (insert t) — allowed.
    expect(wordsAreConnected("than", "han")).toBe(true);
    // But "hands" is L2 (insert d + insert s) — not allowed.
    expect(wordsAreConnected("hands", "han")).toBe(false);
  });
});
