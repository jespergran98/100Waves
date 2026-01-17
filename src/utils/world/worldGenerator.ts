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
    const scale = 0.015; // Slightly adjusted for better biome sizes
    
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
    // Multi-octave noise for temperature
    const temp1 = this.noiseGen.noise(x * 0.8, y * 0.8, 1000);
    const temp2 = this.noiseGen.noise(x * 2.0, y * 2.0, 1100);
    const temp3 = this.noiseGen.noise(x * 0.4, y * 0.4, 1200);
    const temperature = (temp1 * 0.5 + temp2 * 0.3 + temp3 * 0.2);
    
    // Multi-octave noise for moisture
    const moist1 = this.noiseGen.noise(x * 1.0, y * 1.0, 2000);
    const moist2 = this.noiseGen.noise(x * 2.5, y * 2.5, 2100);
    const moist3 = this.noiseGen.noise(x * 0.5, y * 0.5, 2200);
    const moisture = (moist1 * 0.5 + moist2 * 0.3 + moist3 * 0.2);
    
    // Multi-octave noise for elevation with more dramatic variation
    const elev1 = this.noiseGen.noise(x * 0.6, y * 0.6, 3000);
    const elev2 = this.noiseGen.noise(x * 1.8, y * 1.8, 3100);
    const elev3 = this.noiseGen.noise(x * 3.5, y * 3.5, 3200);
    const elevation = (elev1 * 0.6 + elev2 * 0.25 + elev3 * 0.15);
    
    // Weirdness for unusual biomes
    const weird1 = this.noiseGen.noise(x * 1.2, y * 1.2, 4000);
    const weird2 = this.noiseGen.noise(x * 3.5, y * 3.5, 4100);
    const weirdness = (weird1 * 0.7 + weird2 * 0.3);
    
    return { temperature, moisture, elevation, weirdness };
  }

  private determineBiome(weights: BiomeWeights, blockX: number, blockY: number): TileType {
    const { temperature, moisture, elevation, weirdness } = weights;
    
    const distanceFromSpawn = Math.sqrt(blockX * blockX + blockY * blockY);
    const rarityThreshold = this.noiseGen.noise(blockX * 0.008, blockY * 0.008, 5000);
    
    // LEGENDARY BIOMES (extremely rare, far from spawn)
    if (distanceFromSpawn > 12000 && weirdness > 0.7) {
      if (temperature > 0.65 && elevation > 0.55 && rarityThreshold > 0.82) {
        return 'molten_wastes';
      }
      if (temperature < -0.4 && elevation < -0.35 && rarityThreshold > 0.82) {
        return 'ashlands';
      }
    }
    
    // EPIC BIOMES (very rare)
    if (weirdness > 0.6 && rarityThreshold > 0.72) {
      // Oasis in deserts
      if (moisture > 0.4 && elevation < -0.25 && temperature > 0.25 && temperature < 0.65) {
        if (this.noiseGen.noise(blockX * 0.04, blockY * 0.04, 6000) > 0.55) {
          return 'oasis';
        }
      }
      // Mines in mountains
      if (elevation > 0.6 && moisture < -0.15) {
        if (this.noiseGen.noise(blockX * 0.07, blockY * 0.07, 6100) > 0.65) {
          return 'mines';
        }
      }
    }
    
    // RARE BIOMES
    if (rarityThreshold > 0.55) {
      if (elevation < -0.45 && weirdness > 0.35) return 'caves';
      if (temperature > 0.45 && moisture > 0.55 && elevation > -0.15 && elevation < 0.35) return 'jungle';
      if (moisture > 0.45 && elevation > -0.12 && elevation < 0.05 && temperature > 0.15) return 'mangrove';
      if (elevation < -0.08 && elevation > -0.28 && temperature > 0.35 && moisture > 0.25) {
        if (this.noiseGen.noise(blockX * 0.09, blockY * 0.09, 6200) > 0.45) return 'coral_reef';
      }
      if (temperature > 0.35 && moisture < -0.25 && elevation > 0.25 && elevation < 0.55) return 'badlands';
      if (temperature > 0.25 && moisture > -0.08 && moisture < 0.25 && elevation > 0.25 && elevation < 0.5) return 'wooded_badlands';
      if (temperature > 0.25 && moisture < -0.45 && elevation > -0.08 && elevation < 0.35) return 'wastelands';
      if (temperature < -0.25 && moisture > 0.05 && elevation > 0.15 && elevation < 0.45) return 'snowy_taiga';
      if (temperature < -0.35 && moisture < 0.05 && elevation > 0.05) return 'tundra';
    }
    
    // WATER BIOMES (elevation-based)
    if (elevation < -0.55) return temperature < -0.25 ? 'deep_frozen_ocean' : 'deep_ocean';
    if (elevation < -0.32) return temperature < -0.25 ? 'frozen_ocean' : 'ocean';
    if (elevation < -0.18 && elevation > -0.32) return 'river';
    
    // MOUNTAIN
    if (elevation > 0.58) return 'mountain';
    
    // COLD BIOMES
    if (temperature < -0.25) {
      if (moisture > 0.25 && elevation > 0.12) return 'taiga';
      if (elevation < 0.12) return 'snowy_plains';
      return 'tundra';
    }
    
    // HOT/DRY BIOMES
    if (temperature > 0.35) {
      if (moisture < -0.35) return 'desert';
      if (moisture > 0.25 && elevation < 0.15) return 'savanna';
    }
    
    // TEMPERATE BIOMES
    if (moisture > 0.28 && elevation > -0.08 && elevation < 0.25) {
      if (this.noiseGen.noise(blockX * 0.05, blockY * 0.05, 7000) > 0.25) return 'forest';
    }
    if (moisture < -0.15 && moisture > -0.45 && elevation > -0.08 && elevation < 0.35) return 'plains';
    if (moisture > 0.48 && elevation > -0.08 && elevation < 0.12) return 'swamp';
    
    return 'grasslands';
  }

  private getElevation(x: number, y: number): number {
    const scale = 0.015;
    const elev1 = this.noiseGen.noise(x * scale * 0.6, y * scale * 0.6, 3000);
    const elev2 = this.noiseGen.noise(x * scale * 1.8, y * scale * 1.8, 3100);
    const elev3 = this.noiseGen.noise(x * scale * 3.5, y * scale * 3.5, 3200);
    return (elev1 * 0.6 + elev2 * 0.25 + elev3 * 0.15);
  }

  private getTileType(x: number, y: number): TileType {
    const scale = 0.015;
    const weights = this.getBiomeWeights(x * scale, y * scale);
    return this.determineBiome(weights, x * 16, y * 16);
  }

  private getTileVariant(x: number, y: number, type: TileType): number {
    const hash = this.noiseGen.noise(x * 0.08, y * 0.08, 8000);
    const variantCounts: Partial<Record<TileType, number>> = {
      grasslands: 6, plains: 5, forest: 6, desert: 5,
      ocean: 6, deep_ocean: 6, mountain: 6, swamp: 6,
      taiga: 6, jungle: 6, badlands: 6, savanna: 5,
      tundra: 6, ashlands: 6, molten_wastes: 6,
      river: 6, coral_reef: 6, mangrove: 6
    };
    const count = variantCounts[type] || 6;
    return Math.floor((hash + 1) * 0.5 * count);
  }

  private calculateBlendFactor(weights: BiomeWeights): number {
    const boundaries = [
      Math.abs(weights.elevation + 0.55),
      Math.abs(weights.elevation + 0.32),
      Math.abs(weights.elevation - 0.0),
      Math.abs(weights.elevation - 0.58),
      Math.abs(weights.temperature + 0.25),
      Math.abs(weights.temperature - 0.35),
      Math.abs(weights.moisture + 0.28),
      Math.abs(weights.moisture - 0.28)
    ];
    
    const minDistance = Math.min(...boundaries);
    return Math.min(1, minDistance * 10);
  }

  clearCache(): void {
    this.noiseGen.clearCache();
  }
}