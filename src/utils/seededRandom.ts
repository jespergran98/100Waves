// Seeded random number generator for consistent world generation

export class SeededRandom {
  private seed: number;

  constructor(seed: string | number) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Linear congruential generator
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Get random float between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Get random integer between min (inclusive) and max (exclusive)
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  // Get random boolean with optional probability
  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}