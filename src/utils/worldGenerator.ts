import type { WorldData, Tile, TileType, WorldConfig, Chunk, Block } from '../types/world.types';

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
        
        const tile = this.generateTileWithBlocks(worldX, worldY);
        row[x] = tile;
      }
      tiles[y] = row;
    }

    return { x: chunkX, y: chunkY, tiles };
  }

  /**
   * Generate a tile with 16x16 blocks and smooth biome transitions
   */
  private generateTileWithBlocks(tileX: number, tileY: number): Tile {
    const { blocksPerTile } = this.config;
    const blocks: Block[][] = new Array(blocksPerTile);
    
    // Get the dominant tile type for this tile
    const dominantType = this.getTileType(tileX, tileY);
    
    // Generate each block with biome blending
    for (let by = 0; by < blocksPerTile; by++) {
      const blockRow: Block[] = new Array(blocksPerTile);
      
      for (let bx = 0; bx < blocksPerTile; bx++) {
        // Calculate world position for this block (in block coordinates)
        const blockWorldX = tileX * blocksPerTile + bx;
        const blockWorldY = tileY * blocksPerTile + by;
        
        // Sample biome at higher resolution for smooth transitions
        const blockType = this.getBlockTypeWithBlending(
          blockWorldX, 
          blockWorldY,
          dominantType
        );
        
        blockRow[bx] = {
          type: blockType.type,
          x: blockWorldX,
          y: blockWorldY,
          blendFactor: blockType.blendFactor
        };
      }
      blocks[by] = blockRow;
    }

    return {
      type: dominantType,
      x: tileX,
      y: tileY,
      variant: this.getTileVariant(tileX, tileY, dominantType),
      blocks
    };
  }

  /**
   * Get block type with smooth biome blending
   */
  private getBlockTypeWithBlending(
    blockX: number, 
    blockY: number,
    dominantType: TileType
  ): { type: TileType; blendFactor: number } {
    // Sample at block resolution for detailed transitions
    const scale = 0.05; // Higher resolution for block-level detail
    
    const noise1 = this.noise(blockX * scale, blockY * scale, 0);
    const noise2 = this.noise(blockX * scale * 2, blockY * scale * 2, 1000);
    const noise3 = this.noise(blockX * scale * 0.5, blockY * scale * 0.5, 2000);
    
    const terrain = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
    const moisture = this.noise(blockX * 0.04, blockY * 0.04, 3000);
    const temperature = this.noise(blockX * 0.03, blockY * 0.03, 4000);
    const urbanNoise = this.noise(blockX * 0.08, blockY * 0.08, 5000);
    const forestNoise = this.noise(blockX * 0.12, blockY * 0.12, 6000);
    
    // Calculate distance to biome boundaries for blending
    const blendFactor = this.calculateBlendFactor(terrain, moisture);
    
    // Determine block type based on refined noise
    let blockType: TileType;
    
    if (terrain < -0.35) {
      blockType = 'deep_water';
    } else if (terrain < -0.15) {
      blockType = 'water';
    } else if (terrain < -0.05 && terrain > -0.15) {
      blockType = 'sand';
    } else if (urbanNoise > 0.55 && terrain > -0.05 && terrain < 0.3) {
      blockType = this.getRandomValue(blockX, blockY, 7000) > 0.3 ? 'concrete' : 'asphalt';
    } else if (forestNoise > 0.45 && moisture > 0.2 && terrain > 0.0 && terrain < 0.4) {
      blockType = 'forest';
    } else if (forestNoise > 0.5 && moisture < -0.3 && terrain > 0.1) {
      blockType = 'dead_tree';
    } else if (terrain > 0.5) {
      blockType = temperature > 0.2 ? 'stone' : 'gravel';
    } else if (terrain > 0.35 && moisture < -0.1) {
      blockType = 'gravel';
    } else if (moisture < -0.4 || (urbanNoise > 0.4 && urbanNoise < 0.55)) {
      blockType = 'dirt';
    } else {
      blockType = 'grass';
    }
    
    // Apply biome transition blending
    if (blendFactor < 0.3) {
      blockType = this.blendBiomes(blockType, dominantType, blendFactor);
    }
    
    return { type: blockType, blendFactor };
  }

  /**
   * Calculate blend factor for smooth biome transitions
   */
  private calculateBlendFactor(terrain: number, moisture: number): number {
    // Calculate how far we are from biome boundaries
    const boundaries = [
      Math.abs(terrain + 0.35),  // deep_water boundary
      Math.abs(terrain + 0.15),  // water boundary
      Math.abs(terrain - 0.0),   // grass/forest boundary
      Math.abs(terrain - 0.35),  // gravel boundary
      Math.abs(terrain - 0.5),   // stone boundary
      Math.abs(moisture + 0.3),  // moisture boundaries
      Math.abs(moisture - 0.2)
    ];
    
    const minDistance = Math.min(...boundaries);
    return Math.min(1, minDistance * 5); // Scale to 0-1 range
  }

  /**
   * Blend between two biome types for smooth transitions
   */
  private blendBiomes(
    currentType: TileType, 
    dominantType: TileType, 
    blendFactor: number
  ): TileType {
    // If we're close to a boundary, potentially use an intermediate type
    if (blendFactor < 0.15) {
      return this.getTransitionType(currentType, dominantType);
    }
    return currentType;
  }

  /**
   * Get appropriate transition type between biomes
   */
  private getTransitionType(type1: TileType, type2: TileType): TileType {
    const transitionMap: Record<string, TileType> = {
      'water-grass': 'sand',
      'grass-water': 'sand',
      'water-dirt': 'sand',
      'dirt-water': 'sand',
      'deep_water-water': 'water',
      'water-deep_water': 'water',
      'grass-dirt': 'dirt',
      'dirt-grass': 'grass',
      'forest-grass': 'grass',
      'grass-forest': 'grass',
      'stone-gravel': 'gravel',
      'gravel-stone': 'gravel',
      'concrete-asphalt': 'asphalt',
      'asphalt-concrete': 'concrete',
      'dirt-sand': 'sand',
      'sand-dirt': 'sand'
    };
    
    const key = `${type1}-${type2}`;
    return transitionMap[key] || type1;
  }

  /**
   * Enhanced tile type determination
   */
  private getTileType(x: number, y: number): TileType {
    const scale1 = 0.08;
    const scale2 = 0.15;
    const scale3 = 0.3;
    
    const noise1 = this.noise(x * scale1, y * scale1, 0);
    const noise2 = this.noise(x * scale2, y * scale2, 1000);
    const noise3 = this.noise(x * scale3, y * scale3, 2000);
    
    const terrain = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
    const moisture = this.noise(x * 0.05, y * 0.05, 3000);
    const temperature = this.noise(x * 0.04, y * 0.04, 4000);
    const urbanNoise = this.noise(x * 0.12, y * 0.12, 5000);
    const forestNoise = this.noise(x * 0.18, y * 0.18, 6000);
    
    if (terrain < -0.35) return 'deep_water';
    if (terrain < -0.15) return 'water';
    if (terrain < -0.05 && terrain > -0.15) return 'sand';
    if (urbanNoise > 0.55 && terrain > -0.05 && terrain < 0.3) {
      return this.getRandomValue(x, y, 7000) > 0.3 ? 'concrete' : 'asphalt';
    }
    if (forestNoise > 0.45 && moisture > 0.2 && terrain > 0.0 && terrain < 0.4) return 'forest';
    if (forestNoise > 0.5 && moisture < -0.3 && terrain > 0.1) return 'dead_tree';
    if (terrain > 0.5) return temperature > 0.2 ? 'stone' : 'gravel';
    if (terrain > 0.35 && moisture < -0.1) return 'gravel';
    if (moisture < -0.4 || (urbanNoise > 0.4 && urbanNoise < 0.55)) return 'dirt';
    return 'grass';
  }

  private getTileVariant(x: number, y: number, type: TileType): number {
    const hash = this.getRandomValue(x, y, 8000);
    const variantCounts: Record<TileType, number> = {
      grass: 6, dirt: 4, water: 4, deep_water: 3, sand: 4,
      stone: 5, gravel: 4, forest: 3, dead_tree: 3, concrete: 4, asphalt: 3
    };
    const count = variantCounts[type] || 1;
    return Math.floor((hash + 1) * 0.5 * count);
  }

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

  private getRandomValue(x: number, y: number, offset: number): number {
    const key = `${x},${y},${offset}`;
    let value = this.randomCache.get(key);
    if (value !== undefined) return value;
    value = this.hash(x, y, offset);
    this.randomCache.set(key, value);
    return value;
  }

  private hash(x: number, y: number, offset: number): number {
    const seedHash = this.hashString(this.worldData.seed);
    let n = (x * 374761393) + (y * 668265263) + (offset * 1911520717) + seedHash;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return ((n & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

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

  getChunkStatistics(chunks: Chunk[]): Record<TileType, number> {
    const stats: Record<TileType, number> = {
      grass: 0, dirt: 0, water: 0, deep_water: 0, sand: 0,
      stone: 0, gravel: 0, forest: 0, dead_tree: 0, concrete: 0, asphalt: 0
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

  clearCache(): void {
    this.noiseCache.clear();
    this.randomCache.clear();
  }
}