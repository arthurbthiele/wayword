import { findSteinerTree, getDailyTriple } from "../tripleTarget";
import { legitimateWords } from "../../dictionaryData/legitimate";
import { bfsDistancesLegitimate } from "../legitimateGraph";

describe("findSteinerTree", () => {
  it("collapses to the direct distance when two terminals coincide", () => {
    // Steiner({a, a, t}) = edges in shortest path from a to t.
    // Single-letter neighbours: a → at is 1 edge.
    const tree = findSteinerTree("a", "a", "at");
    expect(tree).not.toBeNull();
    expect(tree!.edges).toBe(1);
  });

  it("is symmetric in its three terminals", () => {
    const a = findSteinerTree("at", "cat", "art")!.edges;
    const b = findSteinerTree("cat", "art", "at")!.edges;
    const c = findSteinerTree("art", "at", "cat")!.edges;
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("is no larger than the sum of two direct paths via any terminal", () => {
    // For any v, edges <= sum of distances from v to each terminal — and
    // in particular this holds when v is a terminal itself, giving us a
    // simple upper bound: take the direct chain start → t1 → t2 (route
    // via t1) = d(start, t1) + d(t1, t2). The Steiner answer must be
    // at most this.
    const start = "at";
    const t1 = "cat";
    const t2 = "art";
    const fromT1 = bfsDistancesLegitimate(t1);
    const directViaT1 = fromT1.get(start)! + fromT1.get(t2)!;
    const tree = findSteinerTree(start, t1, t2)!;
    expect(tree.edges).toBeLessThanOrEqual(directViaT1);
  });

  it("each branch ends at its terminal and starts at the joint", () => {
    const tree = findSteinerTree("at", "cat", "art")!;
    expect(tree.branchToStart[0]).toBe(tree.joint);
    expect(tree.branchToStart[tree.branchToStart.length - 1]).toBe("at");
    expect(tree.branchToT1[0]).toBe(tree.joint);
    expect(tree.branchToT1[tree.branchToT1.length - 1]).toBe("cat");
    expect(tree.branchToT2[0]).toBe(tree.joint);
    expect(tree.branchToT2[tree.branchToT2.length - 1]).toBe("art");
  });

  it("branch lengths sum to the total edge count", () => {
    const tree = findSteinerTree("at", "cat", "art")!;
    // Each branch of length k has k+1 nodes (joint + k along path).
    // So edges in branch = nodes - 1. Total edges = sum of all three.
    const totalEdges =
      tree.branchToStart.length -
      1 +
      (tree.branchToT1.length - 1) +
      (tree.branchToT2.length - 1);
    expect(totalEdges).toBe(tree.edges);
  });
});

describe("getDailyTriple", () => {
  it("is deterministic for a given date string", () => {
    const a = getDailyTriple("2026-06-01");
    const b = getDailyTriple("2026-06-01");
    expect(a).toEqual(b);
  });

  it("produces three distinct legitimate words", () => {
    const triple = getDailyTriple("2026-06-01");
    expect(legitimateWords.has(triple.start)).toBe(true);
    expect(legitimateWords.has(triple.t1)).toBe(true);
    expect(legitimateWords.has(triple.t2)).toBe(true);
    expect(triple.start).not.toBe(triple.t1);
    expect(triple.start).not.toBe(triple.t2);
    expect(triple.t1).not.toBe(triple.t2);
  });

  it("optimalEdges is in the calibrated difficulty window for typical dates", () => {
    // The picker rerolls until the Steiner tree size is in [5, 10]. Hit
    // a handful of dates to make sure the constraint actually holds (and
    // we're not silently falling through to the fallback).
    const dates = [
      "2026-06-01",
      "2026-06-15",
      "2026-07-04",
      "2026-08-12",
      "2026-09-23",
      "2026-11-11",
      "2027-01-01",
    ];
    for (const date of dates) {
      const triple = getDailyTriple(date);
      expect(triple.optimalEdges).toBeGreaterThanOrEqual(5);
      expect(triple.optimalEdges).toBeLessThanOrEqual(10);
    }
  });

  it("produces a variety of triples across different dates", () => {
    const samples = new Set<string>();
    for (let i = 1; i <= 30; i++) {
      const date = `2026-06-${String(i).padStart(2, "0")}`;
      const t = getDailyTriple(date);
      samples.add(`${t.start}|${t.t1}|${t.t2}`);
    }
    // 30 dates should produce many distinct triples — at minimum not all
    // the same.
    expect(samples.size).toBeGreaterThan(5);
  });
});
