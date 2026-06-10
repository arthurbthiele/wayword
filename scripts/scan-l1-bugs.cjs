// L1-from-Dict-B scan: detect "disconnected valid" words that are in fact
// one edit away from a current Dict B word. When this happens, the
// rejection message "X is a word, but not one edit from Y" tells the user
// a lie — Y *is* one edit from X, so the bug is the dictionary, not the
// player's word choice.
//
// Run after any change to `dictBInclude` or `excludeBoth` in
// scripts/build-dictionaries.cjs (and a full dict regen). Exits non-zero
// if any bugs are found.
//
//   node scripts/scan-l1-bugs.cjs

const fs = require("fs");
const path = require("path");

const ALPHA = "abcdefghijklmnopqrstuvwxyz";

const root = path.join(__dirname, "..");
const wgSrc = fs.readFileSync(
  path.join(root, "src/dictionaryData/wordGraph.ts"),
  "utf8"
);
const dvSrc = fs.readFileSync(
  path.join(root, "src/dictionaryData/disconnectedValidWords.ts"),
  "utf8"
);

// Regex-extract keys from each generated file. The shape is stable
// (build-dictionaries.cjs is the single writer) so this is good enough
// without TS tooling.
const dictB = new Set();
for (const m of wgSrc.matchAll(/^\s*"([a-z]+)":/gm)) dictB.add(m[1]);

const disconnectedValid = [];
for (const m of dvSrc.matchAll(/"([a-z]+)"/g)) disconnectedValid.push(m[1]);

const findL1NeighbourInDictB = (w) => {
  for (let i = 0; i < w.length; i++) {
    for (const c of ALPHA) {
      if (c === w[i]) continue;
      const cand = w.slice(0, i) + c + w.slice(i + 1);
      if (dictB.has(cand)) return cand;
    }
  }
  for (let i = 0; i <= w.length; i++) {
    for (const c of ALPHA) {
      const cand = w.slice(0, i) + c + w.slice(i);
      if (dictB.has(cand)) return cand;
    }
  }
  for (let i = 0; i < w.length; i++) {
    const cand = w.slice(0, i) + w.slice(i + 1);
    if (dictB.has(cand)) return cand;
  }
  return null;
};

console.log(`dictB size:              ${dictB.size}`);
console.log(`disconnectedValid size:  ${disconnectedValid.length}`);

const bugs = [];
for (const w of disconnectedValid) {
  const bridge = findL1NeighbourInDictB(w);
  if (bridge) bugs.push([w, bridge]);
}

console.log(`\nL1-from-Dict-B bugs: ${bugs.length}`);
for (const [w, n] of bugs.slice(0, 30)) console.log(`  ${w}  ←L1→  ${n}`);
if (bugs.length > 30) console.log(`  ...and ${bugs.length - 30} more`);

if (bugs.length > 0) {
  console.log(
    `\nFor each, either add to dictBInclude (real English we should accept)\n` +
      `or add to excludeBoth (fragment/noise we shouldn't surface).`
  );
  process.exit(1);
}
