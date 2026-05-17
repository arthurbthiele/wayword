/*
 * Builds the runtime dictionary data for Word Journey from two source lists:
 *
 *   Dict A — `wordlist-english` size 10 (SCOWL's most-common tier, ~3940
 *            words). Cleanly curated: no abbreviations, no proper nouns, no
 *            web-text noise. Used for daily targets and optimal-path
 *            computation.
 *
 *   Dict B — `an-array-of-english-words` (~275k). The permissive set of
 *            words the user is allowed to type. A union B → playable graph.
 *
 * We compute Levenshtein-1 adjacency over A ∪ B, then keep only the connected
 * component containing the word "a". Within that component we also compute
 * A's own connected-from-'a' subgraph using A-only edges. Those are the
 * "legitimate" words, used for optimal paths. A subset of them with optimal
 * path length in [4, 7] from 'a' are the daily targets.
 *
 * Outputs:
 *   src/dictionaryData/wordGraph.ts   — adjacency over A ∪ B's CC
 *   src/dictionaryData/legitimate.ts  — A's connected-from-'a' set
 *   src/dictionaryData/targets.ts     — daily-challenge target words
 *
 * Re-run any time the source lists change:
 *   node scripts/build-dictionaries.cjs
 */

const fs = require("fs");
const path = require("path");
const englishWords = require("an-array-of-english-words");
const scowlSize10 = require("wordlist-english/english-words-10.json");

const outDir = path.join(__dirname, "..", "src", "dictionaryData");

// --- 1. Build the two source dictionaries ------------------------------------

// SCOWL is well-curated but ships a handful of entries we don't want as
// targets/optimal-path nodes. No swears or vulgarity in dict A; "hes" is
// the apostropheless contraction "he's"; "cs" is an abbreviation. Defensive:
// includes some profanity that isn't in tier 10 today but might appear if
// SCOWL changes versions.
const dictAExclude = new Set([
  "cs",
  "hes",
  "hell",
  "hellish",
  "cum",
  "cums",
  "ass",
  "asses",
  "asshole",
  "assholes",
  "fuck",
  "fucks",
  "fucking",
  "fucked",
  "shit",
  "shits",
  "shitty",
  "shitting",
  "damn",
  "damned",
  "damning",
  "piss",
  "pisses",
  "pissing",
  "pissed",
  "crap",
  "craps",
  "crappy",
  "bitch",
  "bitches",
  "bitching",
  "bitchy",
  "bastard",
  "bastards",
  "whore",
  "whores",
  "dick",
  "dicks",
  "cock",
  "cocks",
  "cocky",
  "tit",
  "tits",
  "titty",
  "boob",
  "boobs",
  "porn",
  "porno",
  "sex",
  "sexy",
  "sexual",
  "sexually",
  // Slurs — never in dict A under any circumstances.
  "nigger",
  "niggers",
  "fag",
  "fags",
  "faggot",
  "faggots",
  "kike",
  "spic",
  "gook",
  "chink",
  "paki",
  "retard",
  "retards",
  "retarded",
  "cunt",
  "cunts",
]);

const dictAList = scowlSize10
  .map((w) => w.toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w) && !dictAExclude.has(w));

const dictBList = englishWords
  .map((w) => w.toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w));

const dictB = new Set(dictBList);
// Intersection with B ensures every dict-A word is a real English wordlist
// entry; SCOWL is already clean, so this catches the very rare edge case.
const dictA = new Set(dictAList.filter((w) => dictB.has(w)));
const union = new Set([...dictA, ...dictB]);

console.log(
  `dict A (${dictA.size}), dict B (${dictB.size}), union (${union.size})`
);

// --- 2. Build adjacency over A ∪ B using one-edit candidate generation -------

const alphabet = "abcdefghijklmnopqrstuvwxyz";

const oneEditNeighbours = (word, allowedSet) => {
  const out = new Set();
  // substitution
  for (let i = 0; i < word.length; i++) {
    for (let c = 0; c < 26; c++) {
      const ch = alphabet[c];
      if (ch === word[i]) continue;
      const candidate = word.slice(0, i) + ch + word.slice(i + 1);
      if (allowedSet.has(candidate)) out.add(candidate);
    }
  }
  // deletion
  for (let i = 0; i < word.length; i++) {
    const candidate = word.slice(0, i) + word.slice(i + 1);
    if (candidate.length > 0 && allowedSet.has(candidate)) out.add(candidate);
  }
  // insertion
  for (let i = 0; i <= word.length; i++) {
    for (let c = 0; c < 26; c++) {
      const candidate = word.slice(0, i) + alphabet[c] + word.slice(i);
      if (allowedSet.has(candidate)) out.add(candidate);
    }
  }
  return out;
};

console.log("building A ∪ B adjacency...");
const startUnion = Date.now();
const unionAdjacency = new Map();
let progressCount = 0;
for (const word of union) {
  unionAdjacency.set(word, oneEditNeighbours(word, union));
  if (++progressCount % 50000 === 0) {
    console.log(`  ${progressCount}/${union.size}`);
  }
}
console.log(`A ∪ B adjacency built in ${(Date.now() - startUnion) / 1000}s`);

// --- 3. BFS distances from 'a' ----------------------------------------------

const bfsDistances = (start, adjacencyGetter) => {
  const distances = new Map();
  if (!adjacencyGetter(start)) return distances;
  distances.set(start, 0);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const word = queue[head++];
    const distance = distances.get(word);
    for (const neighbour of adjacencyGetter(word) ?? new Set()) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }
  }
  return distances;
};

const unionDistances = bfsDistances("a", (w) => unionAdjacency.get(w));
const unionCC = new Set(unionDistances.keys());
console.log(`A ∪ B connected component from 'a' has ${unionCC.size} words`);

// --- 4. A's connected-from-'a' subgraph using A-only edges ------------------

const dictAInCC = new Set([...dictA].filter((w) => unionCC.has(w)));

const aOnlyNeighbours = (word) => {
  const ns = unionAdjacency.get(word);
  if (!ns) return new Set();
  const out = new Set();
  for (const n of ns) if (dictAInCC.has(n)) out.add(n);
  return out;
};

const legitimateDistances = bfsDistances("a", (w) =>
  dictAInCC.has(w) ? aOnlyNeighbours(w) : null
);
const legitimate = new Set(legitimateDistances.keys());
console.log(
  `legitimate set (A reachable from 'a' via A-only edges): ${legitimate.size}`
);

// --- 5. Targets — quality-filtered subset of legitimate ---------------------

const isTrivialPlural = (word) =>
  word.endsWith("s") && legitimate.has(word.slice(0, -1));

const MIN_OPTIMAL_MOVES = 4;
const MAX_OPTIMAL_MOVES = 7;

const targets = [...legitimate]
  .filter((w) => {
    const distance = legitimateDistances.get(w);
    return distance >= MIN_OPTIMAL_MOVES && distance <= MAX_OPTIMAL_MOVES;
  })
  .filter((w) => !isTrivialPlural(w))
  .sort();

console.log(
  `targets (legitimate, optimal path ${MIN_OPTIMAL_MOVES}-${MAX_OPTIMAL_MOVES} moves, no trivial plurals): ${targets.length}`
);

// --- 6. Write runtime data --------------------------------------------------

const wordGraphLines = [];
const ccWordsSorted = [...unionCC].sort();
for (const word of ccWordsSorted) {
  const neighbours = [...(unionAdjacency.get(word) ?? new Set())]
    .filter((n) => unionCC.has(n))
    .sort();
  wordGraphLines.push(
    `  ${JSON.stringify(word)}: [${neighbours.map((n) => JSON.stringify(n)).join(", ")}],`
  );
}

const wordGraphContent =
  "// Generated by scripts/build-dictionaries.cjs — do not edit by hand.\n" +
  "// Re-run that script to refresh.\n" +
  "// Adjacency for the connected component of (dict A ∪ dict B) containing 'a'.\n" +
  "// Every word listed here is a valid input; every neighbour is one edit away.\n" +
  "export const wordGraph: Record<string, string[]> = {\n" +
  wordGraphLines.join("\n") +
  "\n};\n";
fs.writeFileSync(path.join(outDir, "wordGraph.ts"), wordGraphContent);

const legitimateSorted = [...legitimate].sort();
const legitimateContent =
  "// Generated by scripts/build-dictionaries.cjs — do not edit by hand.\n" +
  "// The 'legitimate' word set used for optimal-path computation.\n" +
  "// = (dict A) ∩ (connected from 'a' using A-only Levenshtein-1 edges).\n" +
  "export const legitimateWords: ReadonlySet<string> = new Set([\n" +
  legitimateSorted.map((w) => `  ${JSON.stringify(w)},`).join("\n") +
  "\n]);\n";
fs.writeFileSync(path.join(outDir, "legitimate.ts"), legitimateContent);

const targetsContent =
  "// Generated by scripts/build-dictionaries.cjs — do not edit by hand.\n" +
  "// Quality-filtered subset of `legitimateWords`: optimal path length 4-7\n" +
  "// from 'a' through legitimate-only edges, plus no trivial plurals.\n" +
  "export const targetWords: readonly string[] = [\n" +
  targets.map((w) => `  ${JSON.stringify(w)},`).join("\n") +
  "\n];\n";
fs.writeFileSync(path.join(outDir, "targets.ts"), targetsContent);

const bytes = (file) =>
  fs.statSync(path.join(outDir, file)).size.toLocaleString();
console.log("\nWritten:");
console.log(`  src/dictionaryData/wordGraph.ts   (${bytes("wordGraph.ts")} bytes)`);
console.log(`  src/dictionaryData/legitimate.ts  (${bytes("legitimate.ts")} bytes)`);
console.log(`  src/dictionaryData/targets.ts     (${bytes("targets.ts")} bytes)`);
