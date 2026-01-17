// src/utils/world/worldGenerator.ts

import type { WorldData, Tile, TileType, WorldConfig, Chunk, Block } from '../../types/world.types';
import { NoiseGenerator } from './noiseGenerator';

interface BiomeWeights {
  temperature: number;
  moisture: number;
  elevation: number;
  weirdness: number;
}

export class WorldGenerator {
  private worldData: WorldData;
  private config: WorldConfig;
  private noiseGen: NoiseGenerator;

  constructor(worldData: WorldData, config: WorldConfig) {
    this.worldData = worldData;
    this.config = config;
    this.noiseGen = new NoiseGenerator(worldData.seed);
  }

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

  private generateTileWithBlocks(tileX: number, tileY: number): Tile {
    const { blocksPerTile } = this.config;
    const blocks: Block[][] = new Array(blocksPerTile);
    
    const tileElevation = this.getElevation(tileX, tileY);
    
    for (let by = 0; by < blocksPerTile; by++) {
      const blockRow: Block[] = new Array(blocksPerTile);
      
      for (let bx = 0; bx < blocksPerTile; bx++) {
        const blockWorldX = tileX * blocksPerTile + bx;
        const blockWorldY = tileY * blocksPerTile + by;
        
        const blockType = this.getBlockTypeWithBlending(blockWorldX, blockWorldY);
        
        blockRow[bx] = {
          type: blockType.type,
          x: blockWorldX,
          y: blockWorldY,
          blendFactor: blockType.blendFactor,
          elevation: blockType.elevation
        };
      }
      blocks[by] = blockRow;
    }

    const dominantType = this.getTileType(tileX, tileY);

    return {
      type: dominantType,
      x: tileX,
      y: tileY,
      variant: this.getTileVariant(tileX, tileY, dominantType),
      blocks,
      elevation: tileElevation
    };
  }

  private getBlockTypeWithBlending(
    blockX: number, 
    blockY: number
  ): { type: TileType; blendFactor: number; elevation: number } {
    const scale = 0.02;
    
    const weights = this.getBiomeWeights(blockX * scale, blockY * scale);
    const biome = this.determineBiome(weights, blockX, blockY);
    const blendFactor = this.calculateBlendFactor(weights);
    
    return { 
      type: biome, 
      blendFactor,
      elevation: weights.elevation
    };
  }

  private getBiomeWeights(x: number, y: number): BiomeWeights {
    const temp1 = this.noiseGen.noise(x * 1.0, y * 1.0, 1000);
    const temp2 = this.noiseGen.noise(x * 2.0, y * 2.0, 1100);
    const temp3 = this.noiseGen.noise(x * 0.5, y * 0.5, 1200);
    const temperature = (temp1 * 0.5 + temp2 * 0.3 + temp3 * 0.2);
    
    const moist1 = this.noiseGen.noise(x * 1.2, y * 1.2, 2000);
    const moist2 = this.noiseGen.noise(x * 2.4, y * 2.4, 2100);
    const moist3 = this.noiseGen.noise(x * 0.6, y * 0.6, 2200);
    const moisture = (moist1 * 0.5 + moist2 * 0.3 + moist3 * 0.2);
    
    const elev1 = this.noiseGen.noise(x * 0.8, y * 0.8, 3000);
    const elev2 = this.noiseGen.noise(x * 1.6, y * 1.6, 3100);
    const elev3 = this.noiseGen.noise(x * 3.2, y * 3.2, 3200);
    const elevation = (elev1 * 0.6 + elev2 * 0.25 + elev3 * 0.15);
    
    const weird1 = this.noiseGen.noise(x * 1.5, y * 1.5, 4000);
    const weird2 = this.noiseGen.noise(x * 3.0, y * 3.0, 4100);
    const weirdness = (weird1 * 0.7 + weird2 * 0.3);
    
    return { temperature, moisture, elevation, weirdness };
  }

  private determineBiome(weights: BiomeWeights, blockX: number, blockY: number): TileType {
    const { temperature, moisture, elevation, weirdness } = weights;
    
    const distanceFromSpawn = Math.sqrt(blockX * blockX + blockY * blockY);
    const rarityThreshold = this.noiseGen.noise(blockX * 0.01, blockY * 0.01, 5000);
    
    // LEGENDARY BIOMES
    if (distanceFromSpawn > 15000 && weirdness > 0.75) {
      if (temperature > 0.7 && elevation > 0.6 && rarityThreshold > 0.85) {
        return 'molten_wastes';
      }
      if (temperature < -0.5 && elevation < -0.4 && rarityThreshold > 0.85) {
        return 'ashlands';
      }
    }
    
    // EPIC BIOMES
    if (weirdness > 0.65 && rarityThreshold > 0.75) {
      if (moisture > 0.5 && elevation < -0.3 && temperature > 0.3 && temperature < 0.6) {
        if (this.noiseGen.noise(blockX * 0.05, blockY * 0.05, 6000) > 0.6) {
          return 'oasis';
        }
      }
      if (elevation > 0.65 && moisture < -0.2) {
        if (this.noiseGen.noise(blockX * 0.08, blockY * 0.08, 6100) > 0.7) {
          return 'mines';
        }
      }
    }
    
    // RARE BIOMES
    if (rarityThreshold > 0.6) {
      if (elevation < -0.5 && weirdness > 0.4) return 'caves';
      if (temperature > 0.5 && moisture > 0.6 && elevation > -0.2 && elevation < 0.3) return 'jungle';
      if (moisture > 0.5 && elevation > -0.15 && elevation < 0.0 && temperature > 0.2) return 'mangrove';
      if (elevation < -0.1 && elevation > -0.3 && temperature > 0.4 && moisture > 0.3) {
        if (this.noiseGen.noise(blockX * 0.1, blockY * 0.1, 6200) > 0.5) return 'coral_reef';
      }
      if (temperature > 0.4 && moisture < -0.3 && elevation > 0.2 && elevation < 0.5) return 'badlands';
      if (temperature > 0.3 && moisture > -0.1 && moisture < 0.2 && elevation > 0.2 && elevation < 0.45) return 'wooded_badlands';
      if (temperature > 0.3 && moisture < -0.5 && elevation > -0.1 && elevation < 0.3) return 'wastelands';
      if (temperature < -0.3 && moisture > 0.0 && elevation > 0.1 && elevation < 0.4) return 'snowy_taiga';
      if (temperature < -0.4 && moisture < 0.0 && elevation > 0.0) return 'tundra';
    }
    
    // WATER BIOMES
    if (elevation < -0.6) return temperature < -0.3 ? 'deep_frozen_ocean' : 'deep_ocean';
    if (elevation < -0.35) return temperature < -0.3 ? 'frozen_ocean' : 'ocean';
    if (elevation < -0.2 && elevation > -0.35) return 'river';
    
    // MOUNTAIN
    if (elevation > 0.6) return 'mountain';
    
    // COLD BIOMES
    if (temperature < -0.3) {
      if (moisture > 0.2 && elevation > 0.1) return 'taiga';
      if (elevation < 0.1) return 'snowy_plains';
      return 'tundra';
    }
    
    // HOT/DRY BIOMES
    if (temperature > 0.4) {
      if (moisture < -0.4) return 'desert';
      if (moisture > 0.3 && elevation < 0.1) return 'savanna';
    }
    
    // TEMPERATE BIOMES
    if (moisture > 0.3 && elevation > -0.1 && elevation < 0.2) {
      if (this.noiseGen.noise(blockX * 0.06, blockY * 0.06, 7000) > 0.3) return 'forest';
    }
    if (moisture < -0.2 && moisture > -0.5 && elevation > -0.1 && elevation < 0.3) return 'plains';
    if (moisture > 0.5 && elevation > -0.1 && elevation < 0.1) return 'swamp';
    
    return 'grasslands';
  }

  private getElevation(x: number, y: number): number {
    const scale = 0.02;
    const elev1 = this.noiseGen.noise(x * scale * 0.8, y * scale * 0.8, 3000);
    const elev2 = this.noiseGen.noise(x * scale * 1.6, y * scale * 1.6, 3100);
    const elev3 = this.noiseGen.noise(x * scale * 3.2, y * scale * 3.2, 3200);
    return (elev1 * 0.6 + elev2 * 0.25 + elev3 * 0.15);
  }

  private getTileType(x: number, y: number): TileType {
    const scale = 0.02;
    const weights = this.getBiomeWeights(x * scale, y * scale);
    return this.determineBiome(weights, x * 16, y * 16);
  }

  private getTileVariant(x: number, y: number, type: TileType): number {
    const hash = this.noiseGen.noise(x * 0.1, y * 0.1, 8000);
    const variantCounts: Partial<Record<TileType, number>> = {
      grasslands: 6, plains: 5, forest: 6, desert: 5,
      ocean: 4, deep_ocean: 3, mountain: 5, swamp: 4,
      taiga: 5, jungle: 6, badlands: 5, savanna: 4,
      tundra: 4, ashlands: 4, molten_wastes: 3
    };
    const count = variantCounts[type] || 4;
    return Math.floor((hash + 1) * 0.5 * count);
  }

  private calculateBlendFactor(weights: BiomeWeights): number {
    const boundaries = [
      Math.abs(weights.elevation + 0.6),
      Math.abs(weights.elevation + 0.35),
      Math.abs(weights.elevation - 0.0),
      Math.abs(weights.elevation - 0.6),
      Math.abs(weights.temperature + 0.3),
      Math.abs(weights.temperature - 0.4),
      Math.abs(weights.moisture + 0.3),
      Math.abs(weights.moisture - 0.3)
    ];
    
    const minDistance = Math.min(...boundaries);
    return Math.min(1, minDistance * 8);
  }

  clearCache(): void {
    this.noiseGen.clearCache();
  }
}