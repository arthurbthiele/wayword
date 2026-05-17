import { computeDepths } from "../wordDepths";
const startingNodes = [{ id: "a", label: "a" }];
const depthOneWord = "at";
const depthTwoWord = "cat";
const depthFiveWord = "dreams";
const nonWord = "blargle";

describe("when passed the graph containing just the word 'a'", () => {
  it(`should have ${depthOneWord} at depth 1`, () => {
    const depths = computeDepths(startingNodes);
    expect(depths[depthOneWord]).toEqual(1);
  });
  it(`should have ${depthTwoWord} at depth 2`, () => {
    const depths = computeDepths(startingNodes);
    expect(depths[depthTwoWord]).toEqual(2);
  });
  it(`should have ${depthFiveWord} at depth 5`, () => {
    const depths = computeDepths(startingNodes);
    expect(depths[depthFiveWord]).toEqual(5);
  });
  it(`should not contain the non-word ${nonWord}`, () => {
    const depths = computeDepths(startingNodes);
    expect(depths).not.toContain(nonWord);
  });
});

describe("when passed a graph containing both 'a' and 'at'", () => {
  it(`should have ${depthTwoWord} at depth 1`, () => {
    const depths = computeDepths([
      { id: "a", label: "a" },
      { id: "at", label: "at" },
    ]);
    expect(depths[depthTwoWord]).toEqual(1);
  });
});

describe("when a node is added to a previously computed graph", () => {
  it("should reflect the new shorter depths for affected words", () => {
    const nodesAfterAddition = [
      { id: "a", label: "a" },
      { id: "at", label: "at" },
    ];
    const depths = computeDepths(nodesAfterAddition);
    expect(depths[depthTwoWord]).toEqual(1);
  });
});

describe("when passed no nodes", () => {
  it("should have no depths", () => {
    const depths = computeDepths([]);
    expect(depths).toMatchObject({});
  });
});
