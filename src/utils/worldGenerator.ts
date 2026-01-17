import type { WorldData, Tile, TileType, WorldConfig, Chunk } from '../types/world.types';

export class WorldGenerator {
  private worldData: WorldData;
  private config: WorldConfig;
  private noiseCache: Map<string, number> = new Map();
  private randomCache: Map<string, number> = new Map();
  private readonly CACHE_LIMIT = 10000; // Prevent unlimited memory growth

  constructor(worldData: WorldData, config: WorldConfig) {
    this.worldData = worldData;
    this.config = config;
  }

  /**
   * Generate a single chunk at the given chunk coordinates
   */
  generateChunk(chunkX: number, chunkY: number): Chunk {
    const { chunkSize } = this.config;
    const tiles: Tile[][] = new Array(chunkSize);
    
    // Calculate world-space offset for this chunk
    const worldOffsetX = chunkX * chunkSize;
    const worldOffsetY = chunkY * chunkSize;

    // Pre-calculate all noise values for this chunk (more cache-friendly)
    for (let y = 0; y < chunkSize; y++) {
      const row: Tile[] = new Array(chunkSize);
      const worldY = worldOffsetY + y;
      
      for (let x = 0; x < chunkSize; x++) {
        const worldX = worldOffsetX + x;
        
        row[x] = {
          type: this.getTileType(worldX, worldY),
          x: worldX,
          y: worldY
        };
      }
      tiles[y] = row;
    }

    return { x: chunkX, y: chunkY, tiles };
  }

  /**
   * Get tile type based on noise functions (optimized)
   */
  private getTileType(x: number, y: number): TileType {
    // Multi-octave noise with pre-calculated weights
    const noise1 = this.noise(x * 0.05, y * 0.05, 0);
    const noise2 = this.noise(x * 0.1, y * 0.1, 1000);
    const noise3 = this.noise(x * 0.2, y * 0.2, 2000);
    
    // Weighted combination (weights sum to 1.75)
    const combinedNoise = (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;

    // Quick terrain check (most common case first)
    if (combinedNoise >= -0.05 && combinedNoise <= 0.45) {
      // Land biome - check moisture only when needed
      const moisture = this.noise(x * 0.03, y * 0.03, 5000);
      return moisture > 0.6 ? 'stone' : 'land';
    }

    // Water
    if (combinedNoise < -0.2) return 'water';
    
    // Sand
    if (combinedNoise < -0.05) return 'sand';
    
    // Stone
    return 'stone';
  }

  /**
   * Optimized Perlin-like noise with caching
   */
  private noise(x: number, y: number, offset: number = 0): number {
    const cacheKey = `${x.toFixed(2)},${y.toFixed(2)},${offset}`;
    
    const cached = this.noiseCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Cache size management
    if (this.noiseCache.size > this.CACHE_LIMIT) {
      this.clearOldestCache();
    }

    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;

    // Get corner values
    const n00 = this.getRandomValue(X, Y, offset);
    const n10 = this.getRandomValue(X + 1, Y, offset);
    const n01 = this.getRandomValue(X, Y + 1, offset);
    const n11 = this.getRandomValue(X + 1, Y + 1, offset);

    // Smooth interpolation
    const u = this.fade(xf);
    const v = this.fade(yf);

    // Bilinear interpolation
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    const result = nx0 + v * (nx1 - nx0);

    this.noiseCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get a random value for coordinates with caching
   */
  private getRandomValue(x: number, y: number, offset: number): number {
    const key = `${x},${y},${offset}`;
    
    let value = this.randomCache.get(key);
    if (value !== undefined) return value;

    // Use a simple hash instead of creating new SeededRandom instances
    value = this.hash(x, y, offset);
    
    this.randomCache.set(key, value);
    return value;
  }

  /**
   * Fast hash function for pseudo-random values
   */
  private hash(x: number, y: number, offset: number): number {
    // Mix the seed with coordinates
    const seedHash = this.hashString(this.worldData.seed);
    let n = (x * 374761393) + (y * 668265263) + (offset * 1911520717) + seedHash;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    // Normalize to [-1, 1]
    return ((n & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Smooth fade function (5th-order interpolation)
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Clear oldest half of cache when limit reached
   */
  private clearOldestCache(): void {
    const entries = Array.from(this.noiseCache.entries());
    const halfSize = Math.floor(entries.length / 2);
    
    // Keep second half (most recent)
    this.noiseCache.clear();
    for (let i = halfSize; i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        this.noiseCache.set(entry[0], entry[1]);
      }
    }
  }

  /**
   * Get statistics for a set of chunks (optimized)
   */
  getChunkStatistics(chunks: Chunk[]): Record<TileType, number> {
    const stats: Record<TileType, number> = {
      land: 0,
      water: 0,
      stone: 0,
      sand: 0
    };

    for (const chunk of chunks) {
      for (const row of chunk.tiles) {
        for (const tile of row) {
          stats[tile.type]++;
        }
      }
    }

    return stats;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.noiseCache.clear();
    this.randomCache.clear();
  }
}