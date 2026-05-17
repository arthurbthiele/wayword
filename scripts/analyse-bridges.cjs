/*
 * One-off analysis script: which words in dict B, if promoted into dict A,
 * would most expand the "legitimate" set (i.e. the connected component of A
 * reachable from 'a' using only A-only Levenshtein-1 edges)?
 *
 * Approach:
 *   1. Build A from the same source pipeline as scripts/build-dictionaries.cjs.
 *   2. Compute the components of A under A-only adjacency. The one containing
 *      'a' is the current legitimate set.
 *   3. For each candidate w in (B \ A):
 *        a. Find its A-neighbours (the A-words exactly one edit away).
 *        b. Look at which A-components those neighbours sit in.
 *        c. If 'a's component is among them, the bridge promotes the OTHER
 *           components into legitimate. Score = 1 (for w itself) + sum of
 *           sizes of those other components.
 *   4. Sort and report the highest scorers.
 *
 * Run:  node scripts/analyse-bridges.cjs
 */

const englishWords = require("an-array-of-english-words");
const scowlSize10 = require("wordlist-english/english-words-10.json");

// Match the exclude list from build-dictionaries.cjs.
const dictAExclude = new Set([
  "cs", "hes", "hell", "hellish",
  "cum", "cums",
  "ass", "asses", "asshole", "assholes",
  "fuck", "fucks", "fucking", "fucked",
  "shit", "shits", "shitty", "shitting",
  "damn", "damned", "damning",
  "piss", "pisses", "pissing", "pissed",
  "crap", "craps", "crappy",
  "bitch", "bitches", "bitching", "bitchy",
  "bastard", "bastards",
  "whore", "whores",
  "dick", "dicks", "cock", "cocks", "cocky",
  "tit", "tits", "titty", "boob", "boobs",
  "porn", "porno",
  "sex", "sexy", "sexual", "sexually",
  "nigger", "niggers", "fag", "fags", "faggot", "faggots",
  "kike", "spic", "gook", "chink", "paki",
  "retard", "retards", "retarded",
  "cunt", "cunts",
]);

const dictBList = englishWords
  .map((w) => w.toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w));
const dictB = new Set(dictBList);

const dictA = new Set(
  scowlSize10
    .map((w) => w.toLowerCase())
    .filter(
      (w) => /^[a-z]+$/.test(w) && dictB.has(w) && !dictAExclude.has(w)
    )
);

console.log(`dict A: ${dictA.size}, dict B: ${dictB.size}`);

const alphabet = "abcdefghijklmnopqrstuvwxyz";

const oneEditNeighbours = (word, allowedSet) => {
  const out = new Set();
  for (let i = 0; i < word.length; i++) {
    for (let c = 0; c < 26; c++) {
      if (alphabet[c] === word[i]) continue;
      const candidate = word.slice(0, i) + alphabet[c] + word.slice(i + 1);
      if (allowedSet.has(candidate)) out.add(candidate);
    }
  }
  for (let i = 0; i < word.length; i++) {
    const candidate = word.slice(0, i) + word.slice(i + 1);
    if (candidate.length > 0 && allowedSet.has(candidate)) out.add(candidate);
  }
  for (let i = 0; i <= word.length; i++) {
    for (let c = 0; c < 26; c++) {
      const candidate = word.slice(0, i) + alphabet[c] + word.slice(i);
      if (allowedSet.has(candidate)) out.add(candidate);
    }
  }
  return out;
};

// 1. A-only adjacency.
console.log("Building A-only adjacency...");
const aAdjacency = new Map();
for (const w of dictA) {
  aAdjacency.set(w, oneEditNeighbours(w, dictA));
}

// 2. Components of A.
console.log("Computing A components...");
const wordToComponent = new Map();
const components = []; // array of Sets
for (const seed of dictA) {
  if (wordToComponent.has(seed)) continue;
  const id = components.length;
  const set = new Set([seed]);
  const queue = [seed];
  let head = 0;
  wordToComponent.set(seed, id);
  while (head < queue.length) {
    const word = queue[head++];
    for (const n of aAdjacency.get(word) || []) {
      if (!set.has(n)) {
        set.add(n);
        wordToComponent.set(n, id);
        queue.push(n);
      }
    }
  }
  components.push(set);
}
const legId = wordToComponent.get("a");
const legSize = components[legId].size;
console.log(
  `${components.length} A-components. legitimate (from 'a') = ${legSize}.`
);
const sortedSizes = components
  .map((c, i) => ({ id: i, size: c.size }))
  .filter((c) => c.id !== legId)
  .sort((a, b) => b.size - a.size);
console.log(
  "Top non-legitimate components (size, sample word):",
  sortedSizes.slice(0, 12).map((c) => ({
    size: c.size,
    sample: [...components[c.id]].slice(0, 3),
  }))
);

// 3. Score each B-word as a potential bridge.
console.log("Scoring bridge candidates from B \\ A...");
const candidates = [];
let progress = 0;
for (const w of dictB) {
  if (dictA.has(w)) continue;
  progress++;
  if (progress % 50000 === 0) {
    console.log(`  ${progress}/${dictB.size}`);
  }

  const aNeighbours = oneEditNeighbours(w, dictA);
  if (aNeighbours.size === 0) continue;

  const touched = new Set();
  for (const n of aNeighbours) touched.add(wordToComponent.get(n));

  if (!touched.has(legId)) continue;

  let expansion = 1; // for w itself
  const mergedSamples = [];
  for (const cid of touched) {
    if (cid === legId) continue;
    expansion += components[cid].size;
    if (mergedSamples.length < 3) {
      mergedSamples.push([...components[cid]].slice(0, 3).join(", "));
    }
  }

  if (expansion <= 1) continue; // bridges nothing new

  candidates.push({ word: w, expansion, mergedSamples });
}

candidates.sort((a, b) => b.expansion - a.expansion);

console.log(`\nTotal bridge candidates: ${candidates.length}`);
console.log("\nTop 30 by expansion potential:");
for (const c of candidates.slice(0, 30)) {
  console.log(
    `  +${String(c.expansion).padStart(4)}  ${c.word.padEnd(12)}  → merges: ${c.mergedSamples.join(" | ")}`
  );
}

const totalPossible = candidates.reduce((sum, c) => sum + c.expansion, 0);
const top10Sum = candidates.slice(0, 10).reduce((s, c) => s + c.expansion, 0);
const top50Sum = candidates.slice(0, 50).reduce((s, c) => s + c.expansion, 0);
console.log("\nSummary:");
console.log(`  Sum of expansions across all candidates: ${totalPossible}`);
console.log(`  Sum of top 10: ${top10Sum}`);
console.log(`  Sum of top 50: ${top50Sum}`);
console.log(
  `  (Note: these sums overcount, since adding multiple bridges merges overlapping components.)`
);
