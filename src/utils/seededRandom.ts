/**
 * Optimized seeded random number generator
 * Uses xorshift128 algorithm for better performance
 */
export class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === 'string' ? this.hashString(seed) : seed;
    // Ensure state is never 0
    if (this.state === 0) this.state = 1;
  }

  /**
   * Fast string hash function (FNV-1a variant)
   */
  private hashString(str: string): number {
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  /**
   * Next random number using xorshift algorithm (faster than LCG)
   */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    // Normalize to [0, 1)
    return ((x >>> 0) / 0xffffffff);
  }

  /**
   * Get random float between min and max
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Get random integer between min (inclusive) and max (exclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  /**
   * Get random boolean with optional probability
   */
  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.int(0, array.length)];
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      const temp = array[i];
      const temp2 = array[j];
      if (temp !== undefined && temp2 !== undefined) {
        array[i] = temp2;
        array[j] = temp;
      }
    }
    return array;
  }
}