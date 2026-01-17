import { SeededRandom } from './seededRandom';
import type { 
  Tile, 
  TileType, 
  WorldConfig, 
  WorldData,
  TerrainThresholds,
  DifficultySettings
} from '../types/world.types';
import { DIFFICULTY_SETTINGS } from '../types/world.types';

export class WorldGenerator {
  private random: SeededRandom;
  private readonly config: WorldConfig;
  private readonly worldData: WorldData;

  constructor(worldData: WorldData, config: WorldConfig) {
    this.worldData = worldData;
    this.config = config;
    this.random = new SeededRandom(worldData.seed);
  }

  /**
   * Simple 2D noise function using multiple octaves for natural terrain
   */
  private noise2D(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const sampleX = x * frequency;
      const sampleY = y * frequency;
      
      const n = this.pseudoRandom(sampleX, sampleY);
      value += n * amplitude;

      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  /**
   * Pseudo-random function based on position
   */
  private pseudoRandom(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + this.random.next() * 1000) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Determine tile type based on noise value and difficulty
   */
  private getTileType(noiseValue: number): TileType {
    const settings = DIFFICULTY_SETTINGS[this.worldData.difficulty];
    const thresholds = this.calculateThresholds(settings);

    if (noiseValue < thresholds.water) return 'water';
    if (noiseValue < thresholds.sand) return 'sand';
    if (noiseValue < thresholds.land) return 'land';
    return 'stone';
  }

  /**
   * Calculate terrain thresholds based on difficulty settings
   */
  private calculateThresholds(settings: DifficultySettings): TerrainThresholds {
    return {
      water: settings.waterPercentage,
      sand: settings.waterPercentage + 0.05,
      land: settings.waterPercentage + 0.05 + settings.landPercentage,
      stone: 1.0
    };
  }

  /**
   * Apply smoothing to make terrain more natural
   */
  private smoothTerrain(tiles: Tile[][]): void {
    const { width, height } = this.config;
    
    for (let y = 1; y < height - 1; y++) {
      const row = tiles[y];
      if (!row) continue;
      
      for (let x = 1; x < width - 1; x++) {
        const currentTile = row[x];
        if (!currentTile) continue;
        
        const neighbors = this.getNeighbors(tiles, x, y);
        const waterCount = neighbors.filter(n => n.type === 'water').length;
        
        // If surrounded by water, become water
        if (waterCount >= 6 && currentTile.type === 'land') {
          currentTile.type = 'water';
        }
        
        // Create sand transition near water
        if (waterCount >= 2 && waterCount < 6 && currentTile.type === 'land') {
          if (this.random.boolean(0.4)) {
            currentTile.type = 'sand';
          }
        }
      }
    }
  }

  /**
   * Get neighboring tiles for smoothing algorithm
   */
  private getNeighbors(tiles: Tile[][], x: number, y: number): Tile[] {
    const neighbors: Tile[] = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
          const row = tiles[ny];
          const tile = row?.[nx];
          if (tile) {
            neighbors.push(tile);
          }
        }
      }
    }
    
    return neighbors;
  }

  /**
   * Generate the complete world with validation
   */
  generate(): Tile[][] {
    const { width, height } = this.config;
    
    if (width <= 0 || height <= 0) {
      throw new Error('Invalid world dimensions');
    }

    const tiles: Tile[][] = [];

    // Generate base terrain using noise
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        const noiseValue = this.noise2D(x / 20, y / 20, 4);
        const tileType = this.getTileType(noiseValue);
        
        const row = tiles[y];
        if (row) {
          row[x] = {
            type: tileType,
            x,
            y
          };
        }
      }
    }

    // Apply smoothing for more natural terrain
    this.smoothTerrain(tiles);
    this.smoothTerrain(tiles); // Second pass for better results

    return tiles;
  }

  /**
   * Get statistics about generated world
   */
  getStatistics(tiles: Tile[][]): Record<TileType, number> {
    const stats: Record<TileType, number> = {
      land: 0,
      water: 0,
      stone: 0,
      sand: 0
    };

    for (const row of tiles) {
      if (!row) continue;
      
      for (const tile of row) {
        if (tile) {
          stats[tile.type]++;
        }
      }
    }

    return stats;
  }

  /**
   * Get world seed for reproducibility
   */
  getSeed(): string {
    return this.worldData.seed;
  }

  /**
   * Get world configuration
   */
  getConfig(): WorldConfig {
    return { ...this.config };
  }
}