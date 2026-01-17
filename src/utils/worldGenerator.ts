import type { WorldData, Tile, TileType, WorldConfig, Chunk } from '../types/world.types';

export class WorldGenerator {
  private worldData: WorldData;
  private config: WorldConfig;
  private noiseCache: Map<string, number> = new Map();
  private randomCache: Map<string, number> = new Map();
  private readonly CACHE_LIMIT = 15000;

  constructor(worldData: WorldData, config: WorldConfig) {
    this.worldData = worldData;
    this.config = config;
  }

  /**
   * Generate a single chunk with enhanced terrain detail
   */
  generateChunk(chunkX: number, chunkY: number): Chunk {
    const { chunkSize } = this.config;
    const tiles: Tile[][] = new Array(chunkSize);
    
    const worldOffsetX = chunkX * chunkSize;
    const worldOffsetY = chunkY * chunkSize;

    for (let y = 0; y < chunkSize; y++) {
      const row: Tile[] = new Array(chunkSize);
      const worldY = worldOffsetY + y;
      
      for (let x = 0; x < chunkSize; x++) {
        const worldX = worldOffsetX + x;
        
        const tileType = this.getTileType(worldX, worldY);
        row[x] = {
          type: tileType,
          x: worldX,
          y: worldY,
          variant: this.getTileVariant(worldX, worldY, tileType)
        };
      }
      tiles[y] = row;
    }

    return { x: chunkX, y: chunkY, tiles };
  }

  /**
   * Enhanced tile type determination with more variety
   */
  private getTileType(x: number, y: number): TileType {
    // Multi-scale noise for natural terrain
    const scale1 = 0.08; // Large features (biomes)
    const scale2 = 0.15; // Medium features (terrain variation)
    const scale3 = 0.3;  // Small features (detail)
    
    const noise1 = this.noise(x * scale1, y * scale1, 0);
    const noise2 = this.noise(x * scale2, y * scale2, 1000);
    const noise3 = this.noise(x * scale3, y * scale3, 2000);
    
    // Combine noise layers with different weights
    const terrain = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
    
    // Moisture and temperature for biome variation
    const moisture = this.noise(x * 0.05, y * 0.05, 3000);
    const temperature = this.noise(x * 0.04, y * 0.04, 4000);
    
    // Feature noise for structures and special terrain
    const urbanNoise = this.noise(x * 0.12, y * 0.12, 5000);
    const forestNoise = this.noise(x * 0.18, y * 0.18, 6000);
    
    // Deep water (lakes, rivers)
    if (terrain < -0.35) {
      return 'deep_water';
    }
    
    // Shallow water (shores, marshes)
    if (terrain < -0.15) {
      return 'water';
    }
    
    // Sandy beaches near water
    if (terrain < -0.05 && terrain > -0.15) {
      return 'sand';
    }
    
    // Urban ruins (concrete/asphalt)
    if (urbanNoise > 0.55 && terrain > -0.05 && terrain < 0.3) {
      return this.getRandomValue(x, y, 7000) > 0.3 ? 'concrete' : 'asphalt';
    }
    
    // Dense forest areas
    if (forestNoise > 0.45 && moisture > 0.2 && terrain > 0.0 && terrain < 0.4) {
      return 'forest';
    }
    
    // Dead trees in wasteland
    if (forestNoise > 0.5 && moisture < -0.3 && terrain > 0.1) {
      return 'dead_tree';
    }
    
    // Rocky/mountainous terrain
    if (terrain > 0.5) {
      return temperature > 0.2 ? 'stone' : 'gravel';
    }
    
    // Gravel patches
    if (terrain > 0.35 && moisture < -0.1) {
      return 'gravel';
    }
    
    // Dirt patches (worn paths, cleared areas)
    if (moisture < -0.4 || (urbanNoise > 0.4 && urbanNoise < 0.55)) {
      return 'dirt';
    }
    
    // Default: grass
    return 'grass';
  }

  /**
   * Get variant number for visual diversity
   */
  private getTileVariant(x: number, y: number, type: TileType): number {
    const hash = this.getRandomValue(x, y, 8000);
    
    // Different tile types have different variant counts
    const variantCounts: Record<TileType, number> = {
      grass: 6,
      dirt: 4,
      water: 4,
      deep_water: 3,
      sand: 4,
      stone: 5,
      gravel: 4,
      forest: 3,
      dead_tree: 3,
      concrete: 4,
      asphalt: 3
    };
    
    const count = variantCounts[type] || 1;
    return Math.floor((hash + 1) * 0.5 * count);
  }

  /**
   * Perlin-like noise with improved caching
   */
  private noise(x: number, y: number, offset: number = 0): number {
    const cacheKey = `${x.toFixed(2)},${y.toFixed(2)},${offset}`;
    
    const cached = this.noiseCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (this.noiseCache.size > this.CACHE_LIMIT) {
      this.clearOldestCache();
    }

    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;

    const n00 = this.getRandomValue(X, Y, offset);
    const n10 = this.getRandomValue(X + 1, Y, offset);
    const n01 = this.getRandomValue(X, Y + 1, offset);
    const n11 = this.getRandomValue(X + 1, Y + 1, offset);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    const result = nx0 + v * (nx1 - nx0);

    this.noiseCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get cached random value for coordinates
   */
  private getRandomValue(x: number, y: number, offset: number): number {
    const key = `${x},${y},${offset}`;
    
    let value = this.randomCache.get(key);
    if (value !== undefined) return value;

    value = this.hash(x, y, offset);
    this.randomCache.set(key, value);
    return value;
  }

  /**
   * Fast hash function for pseudo-random values
   */
  private hash(x: number, y: number, offset: number): number {
    const seedHash = this.hashString(this.worldData.seed);
    let n = (x * 374761393) + (y * 668265263) + (offset * 1911520717) + seedHash;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
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
   * Smooth fade function
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Clear oldest cache entries
   */
  private clearOldestCache(): void {
    const entries = Array.from(this.noiseCache.entries());
    const halfSize = Math.floor(entries.length / 2);
    
    this.noiseCache.clear();
    for (let i = halfSize; i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        this.noiseCache.set(entry[0], entry[1]);
      }
    }
  }

  /**
   * Get terrain statistics
   */
  getChunkStatistics(chunks: Chunk[]): Record<TileType, number> {
    const stats: Record<TileType, number> = {
      grass: 0,
      dirt: 0,
      water: 0,
      deep_water: 0,
      sand: 0,
      stone: 0,
      gravel: 0,
      forest: 0,
      dead_tree: 0,
      concrete: 0,
      asphalt: 0
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