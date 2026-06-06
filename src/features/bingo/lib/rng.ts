// Deterministic PRNG. We use mulberry32 because it is tiny, fast, and only
// needs a 32-bit seed — enough for shuffling a 16-cell grid reproducibly.
// The grid seed is stored as a hex string (crypto.randomBytes(8)) so we
// fold it down to 32 bits via FNV-1a before feeding mulberry32.

export type RNG = () => number;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function seedToUint32(seed: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): RNG {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): RNG {
  return mulberry32(seedToUint32(seed));
}

export function randomSeed(): string {
  // 8 bytes = 16 hex chars. We avoid Node's `crypto` import to keep
  // this module usable from anywhere; Math.random is fine because the
  // determinism guarantee is about reuse-given-the-seed, not seed entropy.
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

// Fisher-Yates shuffle driven by the provided RNG (returns a new array).
export function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Weighted single pick without replacement: returns the picked item AND
// the remaining pool (so the caller can iterate without re-allocating logic).
export function pickWeighted<T extends { weight: number }>(
  pool: readonly T[],
  rng: RNG
): { picked: T; rest: T[] } | null {
  if (pool.length === 0) return null;
  const total = pool.reduce((acc, item) => acc + Math.max(0, item.weight), 0);
  if (total <= 0) {
    const idx = Math.floor(rng() * pool.length);
    const rest = pool.slice();
    const [picked] = rest.splice(idx, 1);
    return { picked, rest };
  }
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= Math.max(0, pool[i].weight);
    if (r <= 0) {
      const rest = pool.slice();
      rest.splice(i, 1);
      return { picked: pool[i], rest };
    }
  }
  // Floating-point fallback: last item.
  const rest = pool.slice(0, -1);
  return { picked: pool[pool.length - 1], rest };
}
