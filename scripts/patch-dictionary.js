/*
 * One-off dictionary patcher.
 *
 * Reads every src/dictionaryData/graphLetter_X.js file, applies the
 * REMOVE/ADD lists below, prunes any words made unreachable from 'a',
 * then writes the affected files back in the original single-line format.
 *
 * Usage: node scripts/patch-dictionary.js
 */

const fs = require("fs");
const path = require("path");

const dictDir = path.join(__dirname, "..", "src", "dictionaryData");

// From the Google form responses. De-duplicated.
const wordsToRemove = [
  "fuckers",
  "cunts",
  "fuck",
  "testword",
  "fucking",
  "lam",
  "cock",
  "fag",
  "nigger",
];

const wordsToAdd = [
  "tare",
  "bile",
  "rind",
  "mast",
  "oat",
  "hone",
  "ovary",
  "canny",
  "nab",
  "roo",
  "paring",
  "wicker",
  "sag",
  "din",
  "lotus",
];

const letters = "abcdefghijklmnopqrstuvwxyz".split("");

const filenameFor = (letter) => path.join(dictDir, `graphLetter_${letter}.js`);
const exportNameFor = (letter) => `graphEntries_${letter}`;

const loadLetter = (letter) => {
  const filePath = filenameFor(letter);
  const source = fs.readFileSync(filePath, "utf8");
  // Files have mixed formats: some use 'single quotes' on one line,
  // others use JS object literal with unquoted keys. Evaluate the literal
  // directly rather than trying to coerce it into JSON.
  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  const literal = source.slice(objectStart, objectEnd + 1);
  // eslint-disable-next-line no-new-func
  return new Function(`return (${literal});`)();
};

const writeLetter = (letter, entries) => {
  const filePath = filenameFor(letter);
  const body = Object.entries(entries)
    .map(
      ([word, neighbours]) =>
        `'${word}': [${neighbours.map((n) => `'${n}'`).join(", ")}]`
    )
    .join(", ");
  const source = `export const ${exportNameFor(letter)}= {${body}};\n`;
  fs.writeFileSync(filePath, source);
};

const letterOf = (word) => word[0];

const areConnected = (a, b) => {
  if (a === b) return false;
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 1) return false;

  if (a.length === b.length) {
    // Single substitution.
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        mismatches++;
        if (mismatches > 1) return false;
      }
    }
    return mismatches === 1;
  }

  // One is exactly one character longer than the other — single insertion/deletion.
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      if (skipped) return false;
      skipped = true;
      j++;
    }
  }
  return true;
};

// 1. Load the full dictionary into memory.
const wordGraph = {};
for (const letter of letters) {
  Object.assign(wordGraph, loadLetter(letter));
}

const dirtyLetters = new Set();

// 2. Apply removals — drop the word's entry and scrub it from every neighbour list.
for (const word of wordsToRemove) {
  if (!(word in wordGraph)) {
    console.log(`skip remove: '${word}' not in dictionary`);
    continue;
  }
  const neighbours = wordGraph[word];
  delete wordGraph[word];
  dirtyLetters.add(letterOf(word));
  for (const neighbour of neighbours) {
    if (wordGraph[neighbour]) {
      const before = wordGraph[neighbour].length;
      wordGraph[neighbour] = wordGraph[neighbour].filter((w) => w !== word);
      if (wordGraph[neighbour].length !== before) {
        dirtyLetters.add(letterOf(neighbour));
      }
    }
  }
  console.log(`removed '${word}' (${neighbours.length} edges)`);
}

// 3. Apply additions — compute neighbours via Levenshtein-1 against current dict.
for (const word of wordsToAdd) {
  if (word in wordGraph) {
    console.log(`skip add: '${word}' already in dictionary`);
    continue;
  }
  const neighbours = [];
  for (const existing of Object.keys(wordGraph)) {
    if (areConnected(word, existing)) neighbours.push(existing);
  }
  if (neighbours.length === 0) {
    console.log(`skip add: '${word}' has no neighbours in dictionary`);
    continue;
  }
  wordGraph[word] = neighbours;
  dirtyLetters.add(letterOf(word));
  for (const neighbour of neighbours) {
    wordGraph[neighbour].push(word);
    dirtyLetters.add(letterOf(neighbour));
  }
  console.log(`added '${word}' (${neighbours.length} edges)`);
}

// 4. Prune words no longer reachable from 'a'.
const reachable = new Set();
const queue = ["a"];
let head = 0;
reachable.add("a");
while (head < queue.length) {
  const w = queue[head++];
  for (const n of wordGraph[w] || []) {
    if (!reachable.has(n)) {
      reachable.add(n);
      queue.push(n);
    }
  }
}

const orphans = Object.keys(wordGraph).filter((w) => !reachable.has(w));
for (const w of orphans) {
  delete wordGraph[w];
  dirtyLetters.add(letterOf(w));
}
if (orphans.length > 0) {
  console.log(`pruned ${orphans.length} orphan(s): ${orphans.join(", ")}`);
}

// 5. Write back only the letter files that changed.
for (const letter of dirtyLetters) {
  const entries = {};
  for (const [word, neighbours] of Object.entries(wordGraph)) {
    if (letterOf(word) === letter) entries[word] = neighbours;
  }
  writeLetter(letter, entries);
}

console.log(
  `\ndone. ${dirtyLetters.size} letter file(s) rewritten. dict now has ${Object.keys(wordGraph).length} words.`
);
