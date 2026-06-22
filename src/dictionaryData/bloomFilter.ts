// A small Bloom filter for "is this word something we recognise but
// haven't connected into the playable graph?" lookups. Storing the actual
// word list cost ~1.4 MB shipped and ~3-5 MB of JS heap (Set overhead).
// A Bloom filter with 0.1% false-positive rate fits in ~215 KB of bits
// regardless of how many words are in it.
//
// Failure mode is friendly: a false positive means we tell the user
// "X is a real word, just not in our dictionary" when X actually isn't a
// real word. Without the filter we'd say "X is not a word" — so the
// degradation goes back to no-filter behaviour rather than something
// worse.

const FNV_PRIME_32 = 16777619;
const FNV_OFFSET_32 = 2166136261;

const fnv1a = (input: string, seed: number): number => {
  let h = (FNV_OFFSET_32 ^ seed) >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME_32);
  }
  return h >>> 0;
};

export class BloomFilter {
  // Double-hashing: derive k independent hashes from two base hashes via
  // h_i(x) = (a + i*b) mod m. Standard trick; quality loss is negligible.
  constructor(
    private readonly bits: Uint8Array,
    private readonly m: number,
    private readonly k: number
  ) {}

  has(word: string): boolean {
    const a = fnv1a(word, 0);
    const b = fnv1a(word, 0xdeadbeef);
    for (let i = 0; i < this.k; i++) {
      // Enhanced double hashing: the linear stride (a + i*b) is correlated
      // enough that empirical FPR sat ~30× above the theoretical floor.
      // Adding the triangular number i(i-1)/2 breaks the linearity and
      // brings the family closer to k independent hashes for free. Source:
      // Kirsch & Mitzenmacher 2006, "Less Hashing, Same Performance."
      const tri = (Math.imul(i, i - 1) >>> 1);
      const idx = (a + Math.imul(i, b) + tri) >>> 0;
      const bit = idx % this.m;
      if ((this.bits[bit >>> 3] & (1 << (bit & 7))) === 0) return false;
    }
    return true;
  }
}

export const bloomFromBase64 = (
  base64: string,
  m: number,
  k: number
): BloomFilter => {
  const binary = atob(base64);
  const bits = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bits[i] = binary.charCodeAt(i);
  return new BloomFilter(bits, m, k);
};

// Sentinel used before the real filter loads — answers "no" to everything,
// which gracefully degrades to the basic "X is not a word" rejection.
export const EMPTY_BLOOM = new BloomFilter(new Uint8Array(1), 1, 1);
