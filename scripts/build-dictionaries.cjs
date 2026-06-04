/*
 * Builds the runtime dictionary data for Wayword from SCOWL frequency tiers.
 *
 *   Dict A — SCOWL cumulative ≤ tier 20 (~10.7k words). The "common everyday
 *            English" set: targets for daily puzzles, words in the
 *            common-word optimal. Tier 20 is pure frequency-based — no
 *            "11-of-12-dictionaries" Scrabble cruft (`ohs`, `mys`, `ute`).
 *            Plus a manually-curated `dictAInclude` set for bridge words.
 *
 *   Dict B — SCOWL cumulative ≤ tier 40 (~42.6k words). The permissive
 *            "type-this-word" set the player may input. Includes the
 *            12-dict-intersection words (tier 35) plus Alan Beale's 3esl
 *            essentials (tier 40). Wide enough that most genuine English
 *            inputs are accepted, narrow enough to filter the most obscure
 *            Scrabble-only entries (which arrive at tier 50+).
 *
 *   Note: Dict A ⊂ Dict B is required by the architecture (every word in A
 *   must be typeable). Since A_MAX_TIER (20) < B_MAX_TIER (40), the
 *   cumulative tiers naturally satisfy this. We assert it as a sanity check.
 *
 * We compute Levenshtein-1 adjacency over A ∪ B = B (since A ⊂ B), keep only
 * the connected component containing the word "a". Within that we compute
 * A's own connected-from-'a' subgraph using A-only edges — the "legitimate"
 * words used for optimal paths. A subset of those with optimal path 4..7
 * from 'a' are the daily targets.
 *
 * Outputs:
 *   src/dictionaryData/wordGraph.ts   — adjacency over A ∪ B's CC
 *   src/dictionaryData/legitimate.ts  — A's connected-from-'a' set
 *   src/dictionaryData/targets.ts     — daily-challenge target words
 *
 * Re-run any time the source lists or curation lists change:
 *   node scripts/build-dictionaries.cjs
 */

const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "src", "dictionaryData");
const wlBase = path.join(__dirname, "..", "node_modules", "wordlist-english");

// --- 1. Load source dictionaries from SCOWL tiers ----------------------------

const SCOWL_TIERS = [10, 20, 35, 40, 50, 55, 60, 70];

const loadTier = (tier) => {
  const out = new Set();
  // Combine all dialect variants at this tier — gives us breadth across
  // American / British / Australian / Canadian English without needing to
  // pick one.
  for (const variant of ["english", "american", "british", "australian", "canadian"]) {
    const file = path.join(wlBase, `${variant}-words-${tier}.json`);
    if (!fs.existsSync(file)) continue;
    const words = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const w of words) {
      const lw = w.toLowerCase();
      if (/^[a-z]+$/.test(lw)) out.add(lw);
    }
  }
  return out;
};

const cumulativeUpTo = (maxTier) => {
  const all = new Set();
  for (const t of SCOWL_TIERS) {
    if (t > maxTier) break;
    for (const w of loadTier(t)) all.add(w);
  }
  return all;
};

const DICT_A_MAX_TIER = 20;
const DICT_B_MAX_TIER = 20;

// Above tier 20, Dict B accepts higher-tier words with a length floor that
// rises with the tier. Premise: short words at higher tiers are mostly
// Scrabble cruft, but at tier 35-40 the *ratio* of real-to-noise is good
// enough that we let length-3 words in and handle the noise via the
// `excludeBoth` set below. Tier 50+ the ratio worsens, so we raise
// the floor.
const DICT_B_EXTRA_TIERS = [
  { tier: 35, minLength: 3 },
  { tier: 40, minLength: 3 },
  { tier: 50, minLength: 4 },
  { tier: 55, minLength: 6 },
  { tier: 60, minLength: 6 },
  { tier: 70, minLength: 6 },
];

// --- 2. Exclusion + inclusion lists ------------------------------------------

// Excluded from BOTH dict A and dict B — these words do not exist in the
// playable graph at all (not typeable as input, not a target, not in an
// optimal path). Two semantic categories below:
//
//   1. SLURS — racial, ethnic, ableist, LGBTQ+, antisemitic, misogynistic.
//      Includes the contested-but-still-slur-dominant words we discussed
//      (`fag`, `homo`, `gyp`, `tranny`, `spastic`). Some entries are
//      defensive — not necessarily in today's source word lists but listed
//      so future tier expansion or source-package upgrades can't
//      re-introduce them.
//
//   2. NOISE — abbreviations, fragments, non-words that snuck into SCOWL
//      via dictionary-completeness or Scrabble inclusion. Plurals of
//      non-pluralisable interjections / prepositions / pronouns are the
//      bulk here.
//
// Words intentionally NOT in this list (kept in both dicts because their
// dominant modern interpretation is non-slur): `queer`, `chink` (as in
// "chink in armour"), `slope`, `tinker`, `poof`. See TRADEMARK / IDEAS for
// per-word judgement-call context.
const excludeBoth = new Set([
  // --- Slurs ---
  // Anti-Black
  "nigger", "niggers",
  "coon", "coons",
  "darkie", "darkies", "darky",
  "sambo", "sambos",
  "jigaboo", "jigaboos",
  "golliwog", "golliwogs",
  // Anti-Italian / Mediterranean / Hispanic
  "wog", "wogs",
  "wop", "wops",
  "dago", "dagos",
  "spic", "spics",
  "moolies",
  "beaner", "beaners",
  "wetback", "wetbacks",
  // Anti-Asian
  "gook", "gooks",
  "jap", "japs",
  "zipperhead",
  // Anti-Middle-Eastern / South-Asian / Romani / Egyptian
  "paki", "pakis",
  "raghead", "ragheads",
  "towelhead", "towelheads",
  "gippo", "gippos",
  "pikey", "pikeys",
  // Anti-European-immigrant
  "kraut", "krauts",
  "mick", "micks",
  "polack", "polacks",
  // Antisemitic
  "kike", "kikes",
  "hymie", "hymies",
  "yid", "yids",
  "sheeny", "sheenies", "sheenie",
  // Anti-LGBTQ+
  "faggot", "faggots",
  "fag", "fags",
  "poofter", "poofters",
  "homo", "homos",
  "shemale", "shemales",
  "tranny", "trannies",
  // Ableist
  "retard", "retards", "retarded",
  "spaz", "spazzes",
  "spastic",
  "mong", "mongs",
  "mongol", "mongols", "mongoloid",
  // Misogynistic
  "bint", "bints",
  // Anti-Romani (etymology) — "to cheat" usage is fading
  "gyp", "gyps", "gypped", "gypping",

  // --- Noise (non-slur but not-real-words) ---
  // abbreviations / fragments
  "cs",
  // plurals of non-pluralisable interjections / prepositions / pronouns —
  // technically Scrabble-legal but feel illegitimate
  "ohs", "oks", "ifs", "ins", "mas", "mes", "mys", "pis", "dos", "ads",
  "hos", "ems", "ens", "uts", "els", "ohms",
  // odd inflections / regional slang flagged for removal
  "avo", "zac",
]);

// Excluded from dict A only — vulgar / profane / dual-meaning / less-common
// words that remain typeable (in dict B) but never surface as optimal-path
// steps or daily targets. "hes" is the apostropheless contraction "he's".
// (`cs` is in `excludeBoth` — kept out of both.)
const dictAOnlyExclude = new Set([
  "hes",
  // Hand-curated removals from Dict A's short-word tier (Arthur's review).
  // 2-letter:
  "ax", "eh", "em", "ha", "ho", "re",
  // 3-letter:
  "amp", "huh", "ken", "mod", "mom", "nay", "sic", "ups",
  // Profanity / vulgarity
  "hell", "hellish",
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
  "dick", "dicks",
  "cock", "cocks", "cocky",
  "tit", "tits", "titty",
  "boob", "boobs",
  "porn", "porno",
  "sex", "sexy", "sexual", "sexually",
  "cunt", "cunts",
  // Reclaimed / dual-meaning / less-common — typeable but not optimal-path or
  // daily-target material.
  "dyke", "dykes",
  "twink", "twinks",
  "nip", "nips",
  "cripple", "cripples",
  // Contextually fraught — real words, but shouldn't surface as a daily
  // target or step in the displayed common-word optimal.
  "rape", "rapes", "raped", "raping",
  "rapist", "rapists",
]);

// Manually promoted bridge words. SCOWL's lower tiers miss some common
// English that bridge analysis (scripts/analyse-bridges.cjs) showed would
// merge disconnected dict-A clusters into the legitimate set. Curated by
// hand for clear-everyday-English readability.
const dictAInclude = new Set([
  // Tier 1: high-impact, very common.
  "stale", "lease", "hone", "heave", "fling", "stare",
  // Tier 2: real and common, additional depth within bridged clusters.
  "dove", "drone", "grove", "liver", "rider", "rover",
  "shone", "slate", "spate", "sage",
  // Tier 3: common short words SCOWL misses at tier ≤20.
  "hi",
]);

// Force-include in Dict B regardless of source tier or length filter. Real
// English short words (e.g. musical notes) that the SCOWL tier source
// doesn't surface at length 2.
const dictBInclude = new Set([
  "en", "fa", "la", "ti",
]);

// --- 3. Build the two source dictionaries ------------------------------------

const dictASource = cumulativeUpTo(DICT_A_MAX_TIER);
const dictBSource = cumulativeUpTo(DICT_B_MAX_TIER);
for (const { tier, minLength } of DICT_B_EXTRA_TIERS) {
  for (const w of loadTier(tier)) {
    if (w.length >= minLength) dictBSource.add(w);
  }
}

// Filter precedence: `excludeBoth` removes from both dicts; on top of
// that, `dictAOnlyExclude` removes from A only. Manual `include` sets get
// added regardless of tier/length filters but still respect `excludeBoth`.
const dictA = new Set();
for (const w of dictASource) {
  if (excludeBoth.has(w)) continue;
  if (dictAOnlyExclude.has(w)) continue;
  dictA.add(w);
}
for (const w of dictAInclude) {
  if (excludeBoth.has(w)) continue;
  dictA.add(w);
}

const dictB = new Set();
for (const w of dictBSource) {
  if (excludeBoth.has(w)) continue;
  dictB.add(w);
}
// Bridge inclusions for A must also be typeable.
for (const w of dictAInclude) {
  if (!excludeBoth.has(w)) dictB.add(w);
}
// Force-include words for B regardless of tier / length filter.
for (const w of dictBInclude) {
  if (!excludeBoth.has(w)) dictB.add(w);
}

// Sanity: A ⊂ B.
for (const w of dictA) {
  if (!dictB.has(w)) {
    throw new Error(`Invariant violated: '${w}' is in dict A but not dict B`);
  }
}

const union = dictB; // A ⊂ B, so A ∪ B = B.

const dictBExtraDesc = DICT_B_EXTRA_TIERS.map(
  ({ tier, minLength }) => `tier ${tier} len≥${minLength}`
).join(", ");
console.log(
  `dict A (≤tier ${DICT_A_MAX_TIER}): ${dictA.size},  ` +
    `dict B (≤tier ${DICT_B_MAX_TIER}` +
    (dictBExtraDesc ? ` + ${dictBExtraDesc}` : "") +
    `): ${dictB.size},  union: ${union.size}`
);

// --- 4. Build adjacency over A ∪ B using one-edit candidate generation -------

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
  if (++progressCount % 25000 === 0) {
    console.log(`  ${progressCount}/${union.size}`);
  }
}
console.log(`A ∪ B adjacency built in ${(Date.now() - startUnion) / 1000}s`);

// --- 5. BFS distances from 'a' ----------------------------------------------

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
console.log(`A ∪ B connected component from 'a': ${unionCC.size} words`);

// --- 6. A's connected-from-'a' subgraph using A-only edges ------------------

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

// --- 7. Write runtime data --------------------------------------------------
//
// (Previously also generated src/dictionaryData/targets.ts — a curated list
// of "optimal path 4-7 from 'a'" targets used by an older single-picker
// fallback. Removed because `getDailyPair` now picks dynamically from any
// legitimate word at distance [4, 7] from the chosen start, so the static
// curated-targets list is no longer needed.)

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

const bytes = (file) =>
  fs.statSync(path.join(outDir, file)).size.toLocaleString();
console.log("\nWritten:");
console.log(`  src/dictionaryData/wordGraph.ts   (${bytes("wordGraph.ts")} bytes)`);
console.log(`  src/dictionaryData/legitimate.ts  (${bytes("legitimate.ts")} bytes)`);
