#!/usr/bin/env node

/*
 * Preview upcoming daily + triple puzzles, with their common-word optimal
 * and overall (all-word) optimal paths. Useful for eyeballing the puzzle
 * pipeline after a dictionary regen.
 *
 * Reimplements the production picker + path-finder against the current
 * data files (so it always reflects the live state of the working tree).
 * Respects manual overrides from `puzzleOverrides.ts`.
 *
 *   node scripts/preview-puzzles.cjs              # next 10 days
 *   node scripts/preview-puzzles.cjs 30           # next 30 days
 *   node scripts/preview-puzzles.cjs 10 2026-07-01  # 10 days from a specific date
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const numDays = args[0] ? parseInt(args[0], 10) : 10;
const startDateArg = args[1];

// --- Load data files ---------------------------------------------------------

const repoRoot = path.join(__dirname, "..");

const parseLegitimate = (file) => {
  const text = fs.readFileSync(file, "utf8");
  return new Set(
    [...text.matchAll(/"([a-z]+)",/g)].map((m) => m[1])
  );
};

const parseWordGraph = (file) => {
  const text = fs.readFileSync(file, "utf8");
  const graph = {};
  for (const m of text.matchAll(/^\s*"([a-z]+)":\s*\[([^\]]*)\]/gm)) {
    graph[m[1]] = [...m[2].matchAll(/"([a-z]+)"/g)].map((n) => n[1]);
  }
  return graph;
};

const parseOverrides = (file) => {
  const text = fs.readFileSync(file, "utf8");
  const daily = {};
  const triple = {};
  // Daily overrides: "YYYY-MM-DD": { start: "x", target: "y" }
  for (const m of text.matchAll(
    /"(\d{4}-\d{2}-\d{2})":\s*\{\s*start:\s*"([a-z]+)",\s*target:\s*"([a-z]+)"\s*\}/g
  )) {
    daily[m[1]] = { start: m[2], target: m[3] };
  }
  for (const m of text.matchAll(
    /"(\d{4}-\d{2}-\d{2})":\s*\{\s*start:\s*"([a-z]+)",\s*t1:\s*"([a-z]+)",\s*t2:\s*"([a-z]+)"\s*\}/g
  )) {
    triple[m[1]] = { start: m[2], t1: m[3], t2: m[4] };
  }
  return { daily, triple };
};

const legitimate = parseLegitimate(
  path.join(repoRoot, "src/dictionaryData/legitimate.ts")
);
const wordGraph = parseWordGraph(
  path.join(repoRoot, "src/dictionaryData/wordGraph.ts")
);
const overrides = parseOverrides(
  path.join(repoRoot, "src/utilities/puzzleOverrides.ts")
);

// --- Adjacency + BFS helpers ------------------------------------------------

// Adjacency restricted to legitimate words (for common-word optimal)
const legitimateAdj = new Map();
for (const w of legitimate) {
  legitimateAdj.set(
    w,
    (wordGraph[w] || []).filter((n) => legitimate.has(n))
  );
}

// BFS with predecessors. `useAllWords` = true means use full wordGraph;
// false means use legitimate-only adjacency.
const bfsWithPredecessors = (start, useAllWords) => {
  const distances = new Map([[start, 0]]);
  const predecessors = new Map();
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word);
    const neighbours = useAllWords
      ? wordGraph[word] || []
      : legitimateAdj.get(word) || [];
    for (const n of neighbours) {
      if (!distances.has(n)) {
        distances.set(n, distance + 1);
        predecessors.set(n, word);
        queue.push(n);
      }
    }
  }
  return { distances, predecessors };
};

const reconstructPath = (predecessors, target) => {
  const out = [target];
  let cur = target;
  while (predecessors.has(cur)) {
    cur = predecessors.get(cur);
    out.unshift(cur);
  }
  return out;
};

const shortestPath = (start, target, useAllWords) => {
  const { distances, predecessors } = bfsWithPredecessors(start, useAllWords);
  if (!distances.has(target)) return null;
  return reconstructPath(predecessors, target);
};

// --- Picker logic (same as production) --------------------------------------

const isTrivialPlural = (w) =>
  w.endsWith("s") && legitimate.has(w.slice(0, -1));
const isViableStart = (w) => w.length >= 3 && !isTrivialPlural(w);

const hashStringWithSalt = (input, salt) => {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0);
};

const sortedLegitimate = [...legitimate].sort();
const viableStarts = sortedLegitimate.filter(isViableStart);

const MIN_LEGIT_DIST = 4;
const MAX_LEGIT_DIST = 7;
const MIN_TERM_DIST = 2;
const MAX_TERM_DIST = 7;
const MIN_TREE_EDGES = 5;
const MAX_TREE_EDGES = 10;
const MIN_PAIRWISE_TARGET_DIST = 2;

const getDailyPair = (dateString) => {
  const override = overrides.daily[dateString];
  if (override) return { start: override.start, target: override.target };

  for (let attempt = 0; attempt < 64; attempt++) {
    const startIndex =
      hashStringWithSalt(dateString, attempt * 2 + 1) % viableStarts.length;
    const start = viableStarts[startIndex];
    const { distances } = bfsWithPredecessors(start, false);
    const candidates = [];
    for (const [word, distance] of distances) {
      if (
        distance >= MIN_LEGIT_DIST &&
        distance <= MAX_LEGIT_DIST &&
        word.length >= 3 &&
        !isTrivialPlural(word)
      ) {
        candidates.push(word);
      }
    }
    if (candidates.length === 0) continue;
    candidates.sort();
    const targetIndex =
      hashStringWithSalt(dateString, attempt * 2 + 2) % candidates.length;
    return { start, target: candidates[targetIndex] };
  }
  return null;
};

const findSteinerTree = (start, t1, t2, useAllWords) => {
  const fromStart = bfsWithPredecessors(start, useAllWords);
  const fromT1 = bfsWithPredecessors(t1, useAllWords);
  const fromT2 = bfsWithPredecessors(t2, useAllWords);
  let best = null;
  for (const [v, d1] of fromStart.distances) {
    const d2 = fromT1.distances.get(v);
    if (d2 === undefined) continue;
    const d3 = fromT2.distances.get(v);
    if (d3 === undefined) continue;
    const sum = d1 + d2 + d3;
    if (best === null || sum < best.edges) {
      best = { edges: sum, joint: v };
    }
  }
  if (!best) return null;
  return {
    edges: best.edges,
    joint: best.joint,
    pathToStart: reconstructPath(fromStart.predecessors, best.joint).reverse(),
    pathToT1: reconstructPath(fromT1.predecessors, best.joint).reverse(),
    pathToT2: reconstructPath(fromT2.predecessors, best.joint).reverse(),
  };
};

const getDailyTriple = (dateString) => {
  const override = overrides.triple[dateString];
  if (override) return { ...override };

  for (let attempt = 0; attempt < 256; attempt++) {
    const startIndex =
      hashStringWithSalt(dateString, attempt * 4 + 101) % viableStarts.length;
    const start = viableStarts[startIndex];
    const { distances } = bfsWithPredecessors(start, false);
    const candidates = [];
    for (const [word, distance] of distances) {
      if (
        word !== start &&
        distance >= MIN_TERM_DIST &&
        distance <= MAX_TERM_DIST &&
        word.length >= 3 &&
        !isTrivialPlural(word)
      ) {
        candidates.push(word);
      }
    }
    if (candidates.length < 2) continue;
    candidates.sort();
    const t1Index =
      hashStringWithSalt(dateString, attempt * 4 + 102) % candidates.length;
    const t1 = candidates[t1Index];
    const { distances: distancesFromT1 } = bfsWithPredecessors(t1, false);
    const t2Candidates = candidates.filter((w) => {
      if (w === t1) return false;
      const d = distancesFromT1.get(w);
      return d !== undefined && d >= MIN_PAIRWISE_TARGET_DIST;
    });
    if (t2Candidates.length === 0) continue;
    const t2Index =
      hashStringWithSalt(dateString, attempt * 4 + 103) % t2Candidates.length;
    const t2 = t2Candidates[t2Index];
    const steiner = findSteinerTree(start, t1, t2, false);
    if (!steiner) continue;
    if (steiner.edges < MIN_TREE_EDGES || steiner.edges > MAX_TREE_EDGES) {
      continue;
    }
    return { start, t1, t2 };
  }
  return null;
};

// --- Render preview ----------------------------------------------------------

const getLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatPath = (path) => (path ? path.join(" → ") : "<no path found>");

const startDate = startDateArg ? new Date(startDateArg + "T12:00:00") : new Date();

console.log(
  `\n=== Daily puzzles (${numDays} days from ${getLocalDateString(startDate)}) ===\n`
);

for (let i = 0; i < numDays; i++) {
  const d = new Date(startDate);
  d.setDate(startDate.getDate() + i);
  const dateString = getLocalDateString(d);
  const pinned = overrides.daily[dateString];

  const pair = getDailyPair(dateString);
  if (!pair) {
    console.log(`${dateString}  (no viable pair)`);
    continue;
  }
  const commonPath = shortestPath(pair.start, pair.target, false);
  const allWordPath = shortestPath(pair.start, pair.target, true);
  const tag = pinned ? " [PINNED]" : "";
  console.log(
    `${dateString}${tag}  ${pair.start.toUpperCase()} → ${pair.target.toUpperCase()}`
  );
  console.log(
    `              common-word optimal (${commonPath ? commonPath.length - 1 : "?"}):  ${formatPath(commonPath)}`
  );
  console.log(
    `              overall optimal     (${allWordPath ? allWordPath.length - 1 : "?"}):  ${formatPath(allWordPath)}`
  );
  console.log();
}

console.log(
  `\n=== Daily triples (${numDays} days from ${getLocalDateString(startDate)}) ===\n`
);

for (let i = 0; i < numDays; i++) {
  const d = new Date(startDate);
  d.setDate(startDate.getDate() + i);
  const dateString = getLocalDateString(d);
  const pinned = overrides.triple[dateString];

  const triple = getDailyTriple(dateString);
  if (!triple) {
    console.log(`${dateString}  (no viable triple)`);
    continue;
  }
  const commonTree = findSteinerTree(triple.start, triple.t1, triple.t2, false);
  const allTree = findSteinerTree(triple.start, triple.t1, triple.t2, true);
  const tag = pinned ? " [PINNED]" : "";

  console.log(
    `${dateString}${tag}  ${triple.start.toUpperCase()} + ${triple.t1.toUpperCase()} + ${triple.t2.toUpperCase()}`
  );
  if (commonTree) {
    console.log(
      `              common-word optimal (${commonTree.edges} via "${commonTree.joint}"):`
    );
    console.log(`                start  →  ${formatPath(commonTree.pathToStart)}`);
    console.log(`                t1     →  ${formatPath(commonTree.pathToT1)}`);
    console.log(`                t2     →  ${formatPath(commonTree.pathToT2)}`);
  } else {
    console.log(`              common-word optimal: <no tree>`);
  }
  if (allTree) {
    console.log(
      `              overall optimal     (${allTree.edges} via "${allTree.joint}"):`
    );
    console.log(`                start  →  ${formatPath(allTree.pathToStart)}`);
    console.log(`                t1     →  ${formatPath(allTree.pathToT1)}`);
    console.log(`                t2     →  ${formatPath(allTree.pathToT2)}`);
  } else {
    console.log(`              overall optimal: <no tree>`);
  }
  console.log();
}
