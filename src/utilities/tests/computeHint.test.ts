import { computeHint } from "../computeHint";

describe("computeHint", () => {
  it("returns the immediate next step when selected→target is one move", () => {
    // 'a' → 'at' is a single move; selected is the start, and graph
    // contains just 'a'.
    const hint = computeHint("a", "at", "a", ["a"]);
    expect(hint?.word).toBe("at");
  });

  it("returns the first step on the common-word optimal path", () => {
    const hint = computeHint("a", "cat", "a", ["a"]);
    expect(hint).not.toBeNull();
    expect(hint!.word.length).toBeLessThanOrEqual(2);
  });

  it("returns null when selected already equals target", () => {
    expect(computeHint("a", "cat", "cat", ["a", "cat"])).toBeNull();
  });

  it("works mid-path: from one step along, returns the next step", () => {
    const first = computeHint("a", "area", "a", ["a"]);
    expect(first).not.toBeNull();
    const second = computeHint("a", "area", first!.word, ["a", first!.word]);
    expect(second).not.toBeNull();
    expect(second!.word).not.toBe(first!.word);
  });

  describe("navigation hint (selected isn't the best foothold)", () => {
    it("suggests navigating when another graph node is closer to target", () => {
      // Graph has 'a' (2 hops from 'ate' via 'at') and 'at' (1 hop).
      // Selected at 'a'; the better foothold is 'at'.
      const hint = computeHint("a", "ate", "a", ["a", "at"]);
      expect(hint).not.toBeNull();
      expect(hint!.word).toBe("at");
      expect(hint!.message).toBe("Try starting from 'at'");
    });

    it("gives a letter hint when selected IS the best foothold", () => {
      // Graph has just 'a' — only Dict A node, so it's by definition
      // the best foothold.
      const hint = computeHint("a", "at", "a", ["a"]);
      expect(hint?.message).toMatch(/Try .* 'a'/);
      expect(hint?.message).not.toMatch(/Try starting from/);
    });
  });

  describe("hint message phrasing", () => {
    it("uses insertion phrasing when the hint adds a letter", () => {
      const hint = computeHint("a", "at", "a", ["a"]);
      expect(hint?.message).toMatch(/Try adding a.* 't' to 'a'/);
    });

    it("uses 'an' for vowel letters", () => {
      // 'on' → 'one' adds 'e' (vowel).
      const hint = computeHint("on", "one", "on", ["on"]);
      if (hint && hint.word === "one") {
        expect(hint.message).toMatch(/Try adding an 'e' to 'on'/);
      }
    });
  });
});
