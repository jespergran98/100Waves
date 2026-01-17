// src/utils/world/noiseGenerator.ts

export class NoiseGenerator {
  private seed: number;
  private cache: Map<string, number> = new Map();
  private readonly CACHE_LIMIT = 10000;

  constructor(seedString: string) {
    this.seed = this.hashString(seedString);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  private hash(x: number, y: number, offset: number): number {
    let n = (x * 374761393) + (y * 668265263) + (offset * 1911520717) + this.seed;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return ((n & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  noise(x: number, y: number, offset: number = 0): number {
    const cacheKey = `${x.toFixed(3)},${y.toFixed(3)},${offset}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (this.cache.size > this.CACHE_LIMIT) {
      const entries = Array.from(this.cache.entries());
      const halfSize = Math.floor(entries.length / 2);
      this.cache.clear();
      for (let i = halfSize; i < entries.length; i++) {
        const entry = entries[i];
        if (entry) this.cache.set(entry[0], entry[1]);
      }
    }

    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;

    const n00 = this.hash(X, Y, offset);
    const n10 = this.hash(X + 1, Y, offset);
    const n01 = this.hash(X, Y + 1, offset);
    const n11 = this.hash(X + 1, Y + 1, offset);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    const result = nx0 + v * (nx1 - nx0);

    this.cache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}