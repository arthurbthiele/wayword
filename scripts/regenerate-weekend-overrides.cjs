#!/usr/bin/env node

/*
 * Pre-generate weekend daily pins for the next N weeks and write them to
 * `src/utilities/weekendOverrides.ts`.
 *
 * Why: weekend daily puzzles run a strict-constraint picker (path floor of
 * 4 letters in both Dict A and Dict B, plus a Dict B gap cap). The runtime
 * implementation is O(|graph|) per app load — fine on desktop, borderline
 * on older mobile. Pre-generating means the override fast-path returns
 * immediately and the strict-constraint runtime code is only ever a
 * safety net for dates the generator hasn't covered yet.
 *
 * This script mirrors the picker logic in `src/utilities/dailyTarget.ts`.
 * If you change the picker's weekend constraints, re-run this. The output
 * file is auto-generated — do not hand-edit.
 *
 *   node scripts/regenerate-weekend-overrides.cjs                # default 26 weeks
 *   node scripts/regenerate-weekend-overrides.cjs 52             # 52 weeks
 *   node scripts/regenerate-weekend-overrides.cjs 26 2026-06-06  # start from a specific date
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const outFile = path.join(repoRoot, "src/utilities/weekendOverrides.ts");

const args = process.argv.slice(2);
const numWeeks = args[0] ? parseInt(args[0], 10) : 26;
const startDateArg = args[1];

// --- Load dictionaries -------------------------------------------------------

const legitText = fs.readFileSync(
  path.join(repoRoot, "src/dictionaryData/legitimate.ts"),
  "utf8"
);
const legitimate = new Set(
  [...legitText.matchAll(/"([a-z]+)",/g)].map((m) => m[1])
);

const graphText = fs.readFileSync(
  path.join(repoRoot, "src/dictionaryData/wordGraph.ts"),
  "utf8"
);
const wordGraph = {};
for (const m of graphText.matchAll(/^\s*"([a-z]+)":\s*\[([^\]]*)\]/gm)) {
  wordGraph[m[1]] = [...m[2].matchAll(/"([a-z]+)"/g)].map((n) => n[1]);
}

const legitimateAdj = new Map();
for (const w of legitimate) {
  legitimateAdj.set(
    w,
    (wordGraph[w] || []).filter((n) => legitimate.has(n))
  );
}

// --- BFS with the "any shortest path passes through a short word" flag -------

const bfsWithDipFlag = (start, useDictB, shortLengthThreshold) => {
  const distances = new Map([[start, 0]]);
  const dipsBelowShort = new Map([
    [start, start.length < shortLengthThreshold],
  ]);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word);
    const wordDips = dipsBelowShort.get(word);
    const neighbours = useDictB
      ? wordGraph[word] || []
      : legitimateAdj.get(word) || [];
    for (const n of neighbours) {
      if (!distances.has(n)) {
        distances.set(n, distance + 1);
        dipsBelowShort.set(n, wordDips || n.length < shortLengthThreshold);
        queue.push(n);
      } else if (distances.get(n) === distance + 1) {
        if (wordDips && !dipsBelowShort.get(n)) {
          dipsBelowShort.set(n, true);
        }
      }
    }
  }
  return { distances, dipsBelowShort };
};

// --- Picker (mirrors dailyTarget.ts) -----------------------------------------

const MIN_LEGIT_DIST = 4;
const MAX_LEGIT_DIST = 7;
const SATURDAY_DIST = 8;
const SUNDAY_DIST = 9;
const WEEKEND_PATH_MIN_WORD_LENGTH = 4;
const WEEKEND_MAX_DICTB_GAP = 3;

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

const viableStarts = [...legitimate].sort().filter(isViableStart);

const getWeekdayConstraints = (weekday) => {
  if (weekday === 6) {
    return {
      minDistance: SATURDAY_DIST,
      maxDistance: SATURDAY_DIST,
      pathMinWordLength: WEEKEND_PATH_MIN_WORD_LENGTH,
      maxDictBGap: WEEKEND_MAX_DICTB_GAP,
    };
  }
  if (weekday === 0) {
    return {
      minDistance: SUNDAY_DIST,
      maxDistance: SUNDAY_DIST,
      pathMinWordLength: WEEKEND_PATH_MIN_WORD_LENGTH,
      maxDictBGap: WEEKEND_MAX_DICTB_GAP,
    };
  }
  return null; // weekday — skip
};

const pickWeekendDaily = (dateString, constraints) => {
  const { minDistance, maxDistance, pathMinWordLength, maxDictBGap } =
    constraints;
  for (let attempt = 0; attempt < 64; attempt++) {
    const startIndex =
      hashStringWithSalt(dateString, attempt * 2 + 1) % viableStarts.length;
    const start = viableStarts[startIndex];
    const a = bfsWithDipFlag(start, false, pathMinWordLength);
    const b = bfsWithDipFlag(start, true, pathMinWordLength);
    const candidates = [];
    for (const [word, distance] of a.distances) {
      if (
        distance < minDistance ||
        distance > maxDistance ||
        word.length < 3 ||
        isTrivialPlural(word)
      ) {
        continue;
      }
      if (a.dipsBelowShort.get(word) === true) continue;
      const distanceB = b.distances.get(word);
      if (distanceB === undefined) continue;
      if (b.dipsBelowShort.get(word) === true) continue;
      if (distance - distanceB > maxDictBGap) continue;
      candidates.push(word);
    }
    if (!candidates.length) continue;
    candidates.sort();
    const idx =
      hashStringWithSalt(dateString, attempt * 2 + 2) % candidates.length;
    return { start, target: candidates[idx] };
  }
  return null;
};

// --- Iterate forward, picking each Sat / Sun ---------------------------------

const localDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startDate = startDateArg
  ? new Date(`${startDateArg}T12:00:00`)
  : new Date();
startDate.setHours(12, 0, 0, 0); // noon to avoid DST edge weirdness

const entries = [];
const cursor = new Date(startDate);
const stopDate = new Date(startDate);
stopDate.setDate(stopDate.getDate() + numWeeks * 7);

while (cursor < stopDate) {
  const weekday = cursor.getDay();
  const constraints = getWeekdayConstraints(weekday);
  if (constraints) {
    const dateString = localDateString(cursor);
    const pair = pickWeekendDaily(dateString, constraints);
    if (pair) {
      entries.push({ dateString, weekday, ...pair });
    } else {
      console.warn(`  (no candidate for ${dateString})`);
    }
  }
  cursor.setDate(cursor.getDate() + 1);
}

// --- Write the output file ---------------------------------------------------

const header = `// AUTO-GENERATED FILE — do not hand-edit.
//
// Pre-computed weekend daily puzzles. Generated by
// \`scripts/regenerate-weekend-overrides.cjs\`. Saturday targets a 8-move
// optimal; Sunday a 9-move; both apply the strict path-floor (no shortest
// path through a < 4-letter word in either Dict A or Dict B) and cap the
// Dict A vs Dict B gap at 3.
//
// The runtime picker treats this as an override map and short-circuits to
// the entries below for any matching date. If the player's date isn't
// here (e.g. the generator hasn't been re-run lately), the runtime falls
// back to computing the weekend constraints on-device — slower but
// correct.
//
// Regenerate after any change to weekend constraints or to the
// dictionary:
//
//   node scripts/regenerate-weekend-overrides.cjs

import type { DailyOverride } from "./puzzleOverrides";

export const weekendDailyOverrides: Record<string, DailyOverride> = {
`;

const lines = entries.map((e) => {
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][e.weekday];
  return `  "${e.dateString}": { start: "${e.start}", target: "${e.target}" }, // ${dayName}`;
});

const footer = `\n};\n`;

fs.writeFileSync(outFile, header + lines.join("\n") + footer);

console.log(
  `Wrote ${entries.length} weekend pins (${numWeeks} weeks from ${localDateString(startDate)}) to ${path.relative(repoRoot, outFile)}`
);
