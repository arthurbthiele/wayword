import {
  findShortestPathInGraph,
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

describe("findShortestPathInDictionary", () => {
  it("finds a known short path through the full dictionary", () => {
    const path = findShortestPathInDictionary("a", "at");
    expect(path).toEqual(["a", "at"]);
  });

  it("returns null when given a non-dictionary word", () => {
    expect(findShortestPathInDictionary("a", "blargle")).toBeNull();
  });
});
