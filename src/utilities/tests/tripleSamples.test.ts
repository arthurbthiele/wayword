import { findSteinerTree, getDailyTriple } from "../tripleTarget";

// Not a real test — just dumps a couple of weeks of generated triples so a
// human can eyeball that the puzzles look like reasonable English. Marked
// with `it.skip` so it doesn't run by default; flip to `it` to inspect.
describe("sample generated triples", () => {
  it.skip("logs two weeks of upcoming triples", () => {
    const dates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.UTC(2026, 4, 20 + i));
      dates.push(d.toISOString().slice(0, 10));
    }
    for (const date of dates) {
      const t = getDailyTriple(date);
      const tree = findSteinerTree(t.start, t.t1, t.t2)!;
      // eslint-disable-next-line no-console
      console.log(
        `${date}  start=${t.start.padEnd(8)} t1=${t.t1.padEnd(8)} t2=${t.t2.padEnd(8)}  optimal=${t.optimalEdges} edges  joint=${tree.joint}`
      );
      // eslint-disable-next-line no-console
      console.log(
        `         start branch: ${tree.branchToStart.reverse().join(" → ")}`
      );
      // eslint-disable-next-line no-console
      console.log(
        `         t1 branch:    ${tree.branchToT1.reverse().join(" → ")}`
      );
      // eslint-disable-next-line no-console
      console.log(
        `         t2 branch:    ${tree.branchToT2.reverse().join(" → ")}`
      );
    }
  });
});
