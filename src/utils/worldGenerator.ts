import type { WorldData, Tile, TileType, WorldConfig, Chunk } from '../types/world.types';
import { SeededRandom } from './seededRandom';

export class WorldGenerator {
  private worldData: WorldData;
  private config: WorldConfig;
  private noiseCache: Map<string, number> = new Map();

  constructor(worldData: WorldData, config: WorldConfig) {
    this.worldData = worldData;
    this.config = config;
  }

  /**
   * Generate a single chunk at the given chunk coordinates
   * Map generation is now identical regardless of difficulty
   */
  generateChunk(chunkX: number, chunkY: number): Chunk {
    const tiles: Tile[][] = [];
    const { chunkSize } = this.config;
    
    // Calculate world-space offset for this chunk
    const worldOffsetX = chunkX * chunkSize;
    const worldOffsetY = chunkY * chunkSize;

    for (let y = 0; y < chunkSize; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < chunkSize; x++) {
        const worldX = worldOffsetX + x;
        const worldY = worldOffsetY + y;
        
        row.push({
          type: this.getTileType(worldX, worldY),
          x: worldX,
          y: worldY
        });
      }
      tiles.push(row);
    }

    return {
      x: chunkX,
      y: chunkY,
      tiles
    };
  }

  /**
   * Get tile type based on noise functions
   * Consistent terrain generation regardless of difficulty
   */
  private getTileType(x: number, y: number): TileType {
    // Multi-octave noise for terrain variation
    const noise1 = this.noise(x * 0.05, y * 0.05, 0);
    const noise2 = this.noise(x * 0.1, y * 0.1, 1000) * 0.5;
    const noise3 = this.noise(x * 0.2, y * 0.2, 2000) * 0.25;
    const combinedNoise = (noise1 + noise2 + noise3) / 1.75;

    // Moisture map for biome variation
    const moisture = this.noise(x * 0.03, y * 0.03, 5000);

    // Consistent terrain thresholds for all difficulties
    if (combinedNoise < -0.2) {
      return 'water';
    } else if (combinedNoise < -0.05) {
      return 'sand';
    } else if (combinedNoise > 0.45) {
      return 'stone';
    } else {
      // Vary land based on moisture
      if (moisture > 0.6) {
        return 'stone';
      }
      return 'land';
    }
  }

  /**
   * Perlin-like noise function using seeded random
   */
  private noise(x: number, y: number, offset: number = 0): number {
    const cacheKey = `${x},${y},${offset}`;
    
    if (this.noiseCache.has(cacheKey)) {
      return this.noiseCache.get(cacheKey)!;
    }

    const X = Math.floor(x);
    const Y = Math.floor(y);
    
    const xf = x - X;
    const yf = y - Y;

    // Get corner values
    const n00 = this.randomValue(X, Y, offset);
    const n10 = this.randomValue(X + 1, Y, offset);
    const n01 = this.randomValue(X, Y + 1, offset);
    const n11 = this.randomValue(X + 1, Y + 1, offset);

    // Smooth interpolation
    const u = this.fade(xf);
    const v = this.fade(yf);

    const nx0 = this.lerp(n00, n10, u);
    const nx1 = this.lerp(n01, n11, u);
    const result = this.lerp(nx0, nx1, v);

    this.noiseCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get a random value for coordinates
   */
  private randomValue(x: number, y: number, offset: number): number {
    const seed = `${this.worldData.seed}-${x}-${y}-${offset}`;
    const random = new SeededRandom(seed);
    return random.next() * 2 - 1;
  }

  /**
   * Smooth fade function
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /**
   * Get statistics for a set of chunks
   */
  getChunkStatistics(chunks: Chunk[]): Record<TileType, number> {
    const stats: Record<TileType, number> = {
      land: 0,
      water: 0,
      stone: 0,
      sand: 0
    };

    chunks.forEach(chunk => {
      chunk.tiles.forEach(row => {
        row.forEach(tile => {
          stats[tile.type]++;
        });
      });
    });

    return stats;
  }

  /**
   * Clear noise cache to free memory
   */
  clearCache(): void {
    this.noiseCache.clear();
  }
}