import {
  findShortestPathInGraph,
  findShortestPathInGraphFromAny,
  findShortestPathInDictionary,
} from "../findPath";

describe("findShortestPathInGraph", () => {
  const nodes = [
    { id: "a", label: "a" },
    { id: "at", label: "at" },
    { id: "art", label: "art" },
    { id: "cart", label: "cart" },
  ];
  const edges = [
    { from: "a", to: "at" },
    { from: "at", to: "art" },
    { from: "art", to: "cart" },
  ];

  it("returns the path between connected nodes", () => {
    expect(findShortestPathInGraph(nodes, edges, "a", "cart")).toEqual([
      "a",
      "at",
      "art",
      "cart",
    ]);
  });

  it("returns a single-element path when start equals target", () => {
    expect(findShortestPathInGraph(nodes, edges, "art", "art")).toEqual([
      "art",
    ]);
  });

  it("returns null when a node is missing from the graph", () => {
    expect(findShortestPathInGraph(nodes, edges, "a", "ship")).toBeNull();
  });

  it("returns null when the graph has the nodes but no path between them", () => {
    const disconnected = [
      ...nodes,
      { id: "ship", label: "ship" },
    ];
    expect(
      findShortestPathInGraph(disconnected, edges, "a", "ship")
    ).toBeNull();
  });
});

describe("findShortestPathInGraph — shortest, not chronological", () => {
  // Regression: after the user builds a long route AND a shorter alternative
  // that converges on the same node, the displayed/scored path must be the
  // shortest one, not the order-of-addition (`parents`-based) chain.
  it("picks the shortest route when two paths converge", () => {
    const nodes = [
      { id: "spend", label: "spend" },
      { id: "pend", label: "pend" },
      { id: "pen", label: "pen" },
      { id: "pin", label: "pin" },
      { id: "pit", label: "pit" },
      { id: "sit", label: "sit" },
      { id: "spent", label: "spent" },
      { id: "sent", label: "sent" },
      { id: "set", label: "set" },
    ];
    const edges = [
      { from: "spend", to: "pend" },
      { from: "pend", to: "pen" },
      { from: "pen", to: "pin" },
      { from: "pin", to: "pit" },
      { from: "pit", to: "sit" },
      { from: "spend", to: "spent" },
      { from: "spent", to: "sent" },
      { from: "sent", to: "set" },
      { from: "set", to: "sit" },
    ];
    expect(findShortestPathInGraph(nodes, edges, "spend", "sit")).toEqual([
      "spend",
      "spent",
      "sent",
      "set",
      "sit",
    ]);
  });
});

describe("findShortestPathInGraphFromAny", () => {
  const nodes = [
    { id: "a", label: "a" },
    { id: "at", label: "at" },
    { id: "art", label: "art" },
    { id: "cart", label: "cart" },
    { id: "cat", label: "cat" },
  ];
  const edges = [
    { from: "a", to: "at" },
    { from: "at", to: "art" },
    { from: "art", to: "cart" },
    { from: "at", to: "cat" },
    { from: "cat", to: "cart" },
  ];

  it("starts from the closest seed", () => {
    // Two seeds: 'a' (3 hops to cart) and 'cat' (1 hop to cart). Should
    // pick the cat→cart route.
    expect(
      findShortestPathInGraphFromAny(nodes, edges, ["a", "cat"], "cart")
    ).toEqual(["cat", "cart"]);
  });

  it("returns [target] when target itself is a seed", () => {
    expect(
      findShortestPathInGraphFromAny(nodes, edges, ["a", "cart"], "cart")
    ).toEqual(["cart"]);
  });

  it("ignores seeds not present in the graph", () => {
    expect(
      findShortestPathInGraphFromAny(nodes, edges, ["zzz", "art"], "cart")
    ).toEqual(["art", "cart"]);
  });

  it("returns null when no seed can reach the target", () => {
    expect(
      findShortestPathInGraphFromAny(nodes, edges, [], "cart")
    ).toBeNull();
  });
});

describe("findShortestPathInDictionary", () => {
  it("finds a known short path through the full dictionary", () => {
    const path = findShortestPathInDictionary("a", "at");
    expect(path).toEqual(["a", "at"]);
  });

  it("returns null when given a non-dictionary word", () => {
    expect(findShortestPathInDictionary("a", "blargle")).toBeNull();
  });
});
