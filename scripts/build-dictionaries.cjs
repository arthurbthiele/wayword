/*
 * Builds the runtime dictionary data for Wayword from SCOWL frequency tiers.
 *
 *   Dict A — "common everyday English". Source: SCOWL ≤ DICT_A_MAX_TIER
 *            plus the curated `dictAInclude` set. After the Levenshtein-1
 *            connectivity filter, ~3k words. Used for daily/triple target
 *            selection and the common-word optimal benchmark. Tier 20 is
 *            pure frequency-based — no "11-of-12-dictionaries" Scrabble
 *            cruft (`ohs`, `mys`, `ute`) sneaking in.
 *
 *   Dict B — "type-this-word" set. Source: SCOWL ≤ DICT_B_MAX_TIER plus
 *            higher tiers admitted with rising length floors (see
 *            `DICT_B_EXTRA_TIERS`) plus the `dictBInclude` set. After the
 *            connectivity filter, ~26k words. Permissive enough that most
 *            real English inputs are accepted.
 *
 *   Note: Dict A ⊂ Dict B is required by the architecture (every targetable
 *   word must be typeable). The inputs naturally satisfy this; we assert
 *   it as a sanity check.
 *
 * We compute Levenshtein-1 adjacency over Dict B (= A ∪ B since A ⊂ B),
 * keep only the connected component containing the word "a". Within that
 * we compute A's own connected-from-'a' subgraph using A-only edges — the
 * "legitimate" set used for picker candidates and optimal-path display.
 *
 * Outputs:
 *   src/dictionaryData/wordGraph.ts              — Dict B adjacency (CC of 'a')
 *   src/dictionaryData/legitimate.ts             — A reachable from 'a' via A-only edges
 *   src/dictionaryData/disconnectedValidWords.ts — real English not in the playable CC
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
  // 2-letter abbreviations / letter-name fragments. Not real words; not
  // admitted to play and not flagged as "valid English" in the rejection
  // message — without this they'd land in disconnectedValid AND be L1
  // from a Dict B word (e.g. 'gs' is L1 from 'go'), triggering the
  // misleading "is a word, but not one edit from X" message.
  "es", "gs", "ks", "ls", "ms", "rs", "ts", "kw",
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
  // Removed 2026-07-28 via scripts/edit-dict.cjs.
  "leaved",
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
  // Added 2026-06-22 via scripts/edit-dict.cjs.
  "soy",
]);

// Force-include in Dict B regardless of source tier or length filter. Real
// English short words that the SCOWL tier source doesn't surface at
// length 1 or 2 (the tier-35+ length filter strips them as fragments).
// Curated for real common-English use; abbreviations like gs/ks/ms/rs/ts
// are deliberately omitted (handled by excludeBoth instead).
const dictBInclude = new Set([
  // Musical notes / Greek letters
  "fa", "la", "ti", "mi", "mu",
  // 2-letter pronouns / nouns
  "en",
  "ma", "pa", "ox",
  // 2-letter abbreviations that read as everyday words
  "ad", "ok", "ex",
  // Interjections — same category as ha/ho/eh which are in Dict B
  // (typeable but not Dict A target material).
  "ah", "ow", "sh", "uh", "um", "yo",
  // First-person pronoun; displayed as 'I' to honour standard capitalisation
  // (see src/utilities/displayWord.ts).
  "i",
  // Player-requested additions (2026-06-08). All have L1 bridges into the
  // current Dict B connected component — verified before inclusion.
  "pug", "mage", "bot", "bots", "ramen",
  "henge", "treaded", "fae", "ube",
  // Player-requested additions (2026-06-10). milt/gar/puce have direct
  // dictionaryapi.dev entries; spined is morphological off "spine" and
  // won't have a definition but reads fine.
  "milt", "gar", "puce", "spined",
  // Added 2026-06-22 via scripts/edit-dict.cjs.
  "plat",
  // Added 2026-06-22 via scripts/edit-dict.cjs.
  "roo", "asp", "bream", "bam", "lede", "seance", "slimed", "wort", "binging", "brining", "mach", "stele", "pacer", "stye", "eared",
  // Added 2026-06-23 via scripts/edit-dict.cjs.
  "barding",
  // Added 2026-07-07 via scripts/edit-dict.cjs.
  "holt", "kine", "pled", "nock", "tase", "tased", "cred", "chare", "marl", "woad", "clast", "roc", "skink", "wicking", "lek", "torc", "couth", "hench", "scry", "phage", "lich", "merc", "durity", "lat", "rad", "lam", "hod", "pip", "dun", "hob", "rand", "cud", "yaw", "sai", "fob", "bonk", "boop", "bro", "poo",
  // Added 2026-07-28 via scripts/edit-dict.cjs.
  "paver", "luge", "doc", "mosh", "raver", "chai", "biter", "fop", "glug", "dosh", "dal", "dhal", "yay", "tut", "pish", "noir", "seine", "june", "july", "surd", "morse", "january", "february", "april", "august", "september", "october", "november", "december",
  // Added 2026-07-28 via scripts/edit-dict.cjs.
  "glute", "glutes",
  // Added 2026-08-04 via scripts/edit-dict.cjs.
  "hex", "max", "remix", "comp", "scrum", "busk", "serif", "cafe", "glam", "penne", "jib", "tat", "braze", "cosh", "plonk", "skive", "prang", "roust", "croft", "demob", "remap", "unfix", "whelm", "ere", "haw", "dob", "clade", "prat",
  // Added 2026-08-04 via scripts/edit-dict.cjs.
  "pend",
  // Added 2026-08-09 via scripts/edit-dict.cjs.
  "ghee", "faux", "mid", "fey", "bap", "maned", "paned", "pash", "tam", "hie", "runed", "pease",
  // Added 2026-08-10 via scripts/edit-dict.cjs.
  "tech", "dev", "retro", "indie", "pic", "pics", "pix", "vid", "vids", "ebook", "ebooks", "eco", "abs", "dang", "greek", "dutch", "swiss", "chinese", "latin", "irish", "thai", "finnish",
  // Added 2026-08-10 via scripts/edit-dict.cjs.
  "turbo", "ciao", "morph", "xerox",
  // Added 2026-08-10 via scripts/edit-dict.cjs.
  "african", "afrikaans", "albanian", "american", "arabic", "armenian", "asian", "australian", "aztec", "baltic", "bangladeshi", "bengali", "bolivian", "brazilian", "british", "bulgarian", "canadian", "cantonese", "caribbean", "catalan", "celtic", "chilean", "colombian", "croatian", "cuban", "czech", "egyptian", "esperanto", "estonian", "ethiopian", "european", "farsi", "filipino", "gaelic", "georgian", "haitian", "hebrew", "hindi", "hispanic", "hungarian", "icelandic", "indian", "indonesian", "iranian", "iraqi", "israeli", "italian", "jamaican", "japanese", "javanese", "kenyan", "korean", "latina", "latvian", "lebanese", "lithuanian", "malay", "malaysian", "mayan", "mexican", "mongolian", "moroccan", "nepali", "nigerian", "nordic", "norwegian", "pakistani", "persian", "peruvian", "polynesian", "portuguese", "punjabi", "romanian", "russian", "sanskrit", "saudi", "scandinavian", "scottish", "serbian", "slavic", "slovak", "slovenian", "spanish", "swahili", "swedish", "syrian", "tagalog", "tamil", "tibetan", "turkish", "ukrainian", "urdu", "venezuelan", "vietnamese", "yiddish", "zulu",
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

// --- 8. Valid-but-disconnected words ----------------------------------------
//
// Words that ARE real English (in our broader source) but aren't in current
// wordGraph (either because they're outside the connected-from-'a'
// component, or because the tier/length filter cut them, or — for orphans
// — because the dict shrank between releases). Used by the runtime to give
// a better rejection message: "valid word, but not in our dictionary"
// rather than "not a word". The user complaint was "quality is a word!" —
// and yes, it is, but it can't be reached from 'a' in our common-word
// adjacency, so it doesn't appear in wordGraph.
//
// Subtract `excludeBoth` so we never say "yes, that's valid English" about
// a slur. We don't subtract `dictAOnlyExclude` because those words are
// still in current wordGraph (they're typeable, just not target-eligible),
// so they don't appear in the disconnected set in the first place.
//
// Source = the full dict B (source tiers + dictBInclude force-adds). Any
// word that we attempted to admit to dict B and failed to connect lands
// here, so the rejection message is honest. Previously this was tier-≤40
// only, leaving higher-tier disconnected words (e.g. "duality" at tier 50)
// to fall through with a false "not a word" rejection.

// Single letters trigger the same "is a word, not one edit from X" bug
// (every single letter is L1 from some 2-letter Dict B word). Skip them —
// they aren't really "words" in any sense players would defend.
const DISCONNECTED_VALID_MIN_LENGTH = 2;
const disconnectedValid = [];
// Iterate the full dict B (source tiers PLUS the dictBInclude force-adds),
// not just dictBSource — so a word we deliberately admit that turns out to
// be graph-isolated is treated as "a real word we endorse, just unreachable"
// (disconnectedValid → "is a word, but not one edit from X") rather than
// silently falling through to the below-bar "not in the playable set"
// message, which wrongly implies we judged it too obscure to include.
for (const word of dictB) {
  if (word.length < DISCONNECTED_VALID_MIN_LENGTH) continue;
  if (excludeBoth.has(word)) continue;
  if (unionCC.has(word)) continue;
  disconnectedValid.push(word);
}
disconnectedValid.sort();

// --- 8a. Bloom filter encoding of the disconnected-valid set ----------------
//
// Shipping the full list as a Set<string> cost ~1.4 MB raw and ~3-5 MB of
// JS heap (per-string overhead is high). The runtime only needs membership
// lookup ("is X a word we recognise?"), so we encode it as a Bloom filter.
// False positives degrade gracefully to the friendlier-rejection-when-it
// shouldn't case — never a wrong "not a word" rejection of a real word.

// 25 bits per word → optimal k=17, FPR ≈ 2×10⁻⁶ (one false positive per
// ~500k unknown-word lookups). Picked over the cheaper-but-noisier
// 14 bits/word config because plausible-looking FPs like "ahso" still
// snuck through at the 0.1% rate.
const BITS_PER_WORD = 25;
const FNV_PRIME = 16777619;
const FNV_OFFSET = 2166136261;
const fnv1a = (input, seed) => {
  let h = (FNV_OFFSET ^ seed) >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
};
const n = disconnectedValid.length;
const bloomM = BITS_PER_WORD * n;
const bloomK = Math.max(1, Math.round(BITS_PER_WORD * Math.LN2));
const bloomBytes = new Uint8Array(Math.ceil(bloomM / 8));
// Enhanced double hashing: (a + i*b + i(i-1)/2) mod m. The triangular
// term breaks the stride correlation that pure double hashing leaves
// behind. Must stay byte-for-byte identical to BloomFilter.has() in
// src/dictionaryData/bloomFilter.ts.
for (const word of disconnectedValid) {
  const a = fnv1a(word, 0);
  const b = fnv1a(word, 0xdeadbeef);
  for (let i = 0; i < bloomK; i++) {
    const tri = (Math.imul(i, i - 1) >>> 1);
    const bit = ((a + Math.imul(i, b) + tri) >>> 0) % bloomM;
    bloomBytes[bit >>> 3] |= 1 << (bit & 7);
  }
}

const bloomContent =
  "// Generated by scripts/build-dictionaries.cjs — do not edit by hand.\n" +
  "// Bloom filter over `disconnectedValid` (dict B source minus the\n" +
  "// playable graph minus excluded). Used only for the friendlier\n" +
  "// rejection message: 'X is a word, but not one edit from Y'.\n" +
  "// Configured at ~" +
  BITS_PER_WORD +
  " bits per word → FPR ≈ 2×10⁻⁶. A false positive\n" +
  "// degrades to the friendlier rejection on a non-word, never the inverse.\n" +
  'import { bloomFromBase64 } from "./bloomFilter";\n\n' +
  `const M = ${bloomM};\n` +
  `const K = ${bloomK};\n` +
  `const N = ${n};\n` +
  `// ${n} words encoded into ${bloomBytes.length} bytes ` +
  `(${(bloomBytes.length / 1024).toFixed(1)} KB) of bits.\n` +
  `const BITS = "${Buffer.from(bloomBytes).toString("base64")}";\n\n` +
  "export const disconnectedValidBloom = bloomFromBase64(BITS, M, K);\n" +
  "export const disconnectedValidWordCount = N;\n";
fs.writeFileSync(
  path.join(outDir, "disconnectedValidBloom.ts"),
  bloomContent
);

// --- 8b. Below-bar recognition bloom ----------------------------------------
//
// "Below-bar" = real English words (per an-array-of-english-words) that are
// rarer than our SCOWL-tier cutoff — so they're neither playable nor in the
// disconnected-valid set, and today reject as "not a word". This filter lets
// the runtime upgrade them to the descriptive "recognised, just not in the
// playable set" message + explainer. It never admits a word to play.
//
// The message makes no adjacency claim, so — unlike disconnectedValid — these
// words needn't be L1-safe (many are one edit from a playable word). A much
// higher FPR is also fine here: a false positive calls a fake string "a real
// word we don't include", a harmless nicer-than-"not a word" degradation. So
// we spend ~7.3 bits/word (FPR ≈ 3%) instead of 25, keeping the chunk small.
//
// excludeBoth is subtracted, same as disconnectedValid, so the curated
// never-affirm set stays "not a word" rather than getting acknowledged.
const broadWords = require("an-array-of-english-words");
const recognizedSet = new Set(unionCC);
for (const w of disconnectedValid) recognizedSet.add(w);
const belowBar = [];
for (const w of broadWords) {
  if (w.length < DISCONNECTED_VALID_MIN_LENGTH) continue;
  if (!/^[a-z]+$/.test(w)) continue;
  if (recognizedSet.has(w) || excludeBoth.has(w)) continue;
  belowBar.push(w);
}
belowBar.sort();

const BELOW_BAR_FPR = 0.03;
const nBelow = belowBar.length;
const belowM = Math.ceil((-nBelow * Math.log(BELOW_BAR_FPR)) / Math.LN2 ** 2);
const belowK = Math.max(1, Math.round((belowM / nBelow) * Math.LN2));
const belowBytes = new Uint8Array(Math.ceil(belowM / 8));
for (const word of belowBar) {
  const a = fnv1a(word, 0);
  const b = fnv1a(word, 0xdeadbeef);
  for (let i = 0; i < belowK; i++) {
    const tri = Math.imul(i, i - 1) >>> 1;
    const bit = ((a + Math.imul(i, b) + tri) >>> 0) % belowM;
    belowBytes[bit >>> 3] |= 1 << (bit & 7);
  }
}
const belowContent =
  "// Generated by scripts/build-dictionaries.cjs — do not edit by hand.\n" +
  "// Bloom over 'below-bar' words: real English (an-array-of-english-words)\n" +
  "// rarer than our tier cutoff, so neither playable nor disconnected-valid.\n" +
  "// Powers the 'recognised, but not in the playable set' rejection message.\n" +
  "// ~7.3 bits/word → FPR ≈ 3%; a false positive is a harmless nicer message.\n" +
  'import { bloomFromBase64 } from "./bloomFilter";\n\n' +
  `const M = ${belowM};\n` +
  `const K = ${belowK};\n` +
  `const N = ${nBelow};\n` +
  `// ${nBelow} words encoded into ${belowBytes.length} bytes ` +
  `(${(belowBytes.length / 1024).toFixed(1)} KB) of bits.\n` +
  `const BITS = "${Buffer.from(belowBytes).toString("base64")}";\n\n` +
  "export const belowBarBloom = bloomFromBase64(BITS, M, K);\n" +
  "export const belowBarWordCount = N;\n";
fs.writeFileSync(path.join(outDir, "belowBarBloom.ts"), belowContent);

// Plain-text cache for tooling (e.g. scripts/scan-l1-bugs.cjs). Not
// shipped — gitignored under scripts/.dict-cache/.
const cacheDir = path.join(__dirname, ".dict-cache");
fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(
  path.join(cacheDir, "disconnected-words.txt"),
  disconnectedValid.join("\n") + "\n"
);

const bytes = (file) =>
  fs.statSync(path.join(outDir, file)).size.toLocaleString();
console.log("\nWritten:");
console.log(`  src/dictionaryData/wordGraph.ts                (${bytes("wordGraph.ts")} bytes)`);
console.log(`  src/dictionaryData/legitimate.ts               (${bytes("legitimate.ts")} bytes)`);
console.log(`  src/dictionaryData/disconnectedValidBloom.ts   (${bytes("disconnectedValidBloom.ts")} bytes, ${disconnectedValid.length} words, ${bloomBytes.length}-byte bit array, k=${bloomK})`);
console.log(`  src/dictionaryData/belowBarBloom.ts             (${bytes("belowBarBloom.ts")} bytes, ${nBelow} words, ${belowBytes.length}-byte bit array, k=${belowK})`);
console.log(`  scripts/.dict-cache/disconnected-words.txt     (tooling cache, gitignored)`);
