// src/utils/world/worldGenerator.ts

import type { WorldData, Tile, TileType, WorldConfig, Chunk, Block } from '../../types/world.types';
import { NoiseGenerator } from './noiseGenerator';

interface BiomeWeights {
  temperature: number;
  moisture: number;
  elevation: number;
  contamination: number; // Zombie infection spread
}

export class WorldGenerator {
  private worldData: WorldData;
  private config: WorldConfig;
  private noiseGen: NoiseGenerator;
  private spawnSafeZoneRadius = 50; // Blocks around spawn with reduced danger

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

    let totalThreat = 0;

    for (let y = 0; y < chunkSize; y++) {
      const row: Tile[] = new Array(chunkSize);
      const worldY = worldOffsetY + y;
      
      for (let x = 0; x < chunkSize; x++) {
        const worldX = worldOffsetX + x;
        const tile = this.generateTileWithBlocks(worldX, worldY);
        row[x] = tile;
        
        // Calculate chunk threat level
        totalThreat += this.getTileThreatLevel(tile.type);
      }
      tiles[y] = row;
    }

    return { 
      x: chunkX, 
      y: chunkY, 
      tiles,
      threatLevel: totalThreat / (chunkSize * chunkSize)
    };
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
          elevation: blockType.elevation,
          zombieSpawnWeight: this.calculateZombieSpawnWeight(blockType.type, blockWorldX, blockWorldY)
        };
      }
      blocks[by] = blockRow;
    }

    const dominantType = this.getTileType(tileX, tileY);
    const hasStructure = this.shouldGenerateStructure(tileX, tileY, dominantType);

    return {
      type: dominantType,
      x: tileX,
      y: tileY,
      variant: this.getTileVariant(tileX, tileY, dominantType),
      blocks,
      elevation: tileElevation,
      isExplored: false,
      hasStructure
    };
  }

  private getBlockTypeWithBlending(
    blockX: number, 
    blockY: number
  ): { type: TileType; blendFactor: number; elevation: number } {
    const scale = 0.012; // Slightly larger biomes for zombie survival
    
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
    const temperature = temp1 * 0.6 + temp2 * 0.4;
    
    // Multi-octave noise for moisture
    const moist1 = this.noiseGen.noise(x * 1.0, y * 1.0, 2000);
    const moist2 = this.noiseGen.noise(x * 2.5, y * 2.5, 2100);
    const moisture = moist1 * 0.6 + moist2 * 0.4;
    
    // Multi-octave noise for elevation
    const elev1 = this.noiseGen.noise(x * 0.6, y * 0.6, 3000);
    const elev2 = this.noiseGen.noise(x * 1.8, y * 1.8, 3100);
    const elevation = elev1 * 0.7 + elev2 * 0.3;
    
    // Contamination noise for infection spread
    const cont1 = this.noiseGen.noise(x * 1.2, y * 1.2, 4000);
    const cont2 = this.noiseGen.noise(x * 3.5, y * 3.5, 4100);
    const contamination = cont1 * 0.7 + cont2 * 0.3;
    
    return { temperature, moisture, elevation, contamination };
  }

  private determineBiome(weights: BiomeWeights, blockX: number, blockY: number): TileType {
    const { temperature, moisture, elevation, contamination } = weights;
    
    const distanceFromSpawn = Math.sqrt(blockX * blockX + blockY * blockY);
    const inSafeZone = distanceFromSpawn < this.spawnSafeZoneRadius;
    const rarityNoise = this.noiseGen.noise(blockX * 0.008, blockY * 0.008, 5000);
    
    // LEGENDARY APOCALYPTIC BIOMES (extremely rare, far from spawn)
    if (!inSafeZone && distanceFromSpawn > 15000) {
      if (contamination > 0.75 && rarityNoise > 0.85) {
        return 'infection_site'; // Origin of outbreak
      }
      if (contamination > 0.7 && elevation < -0.3 && rarityNoise > 0.82) {
        return 'dead_zone'; // Ground zero
      }
    }
    
    // EPIC BIOMES (very rare)
    if (!inSafeZone && rarityNoise > 0.72) {
      // Bunkers (safe zones)
      if (elevation > 0.5 && moisture < 0 && this.noiseGen.noise(blockX * 0.05, blockY * 0.05, 6000) > 0.7) {
        return 'bunker';
      }
      // Mines (resources)
      if (elevation > 0.6 && moisture < -0.15) {
        if (this.noiseGen.noise(blockX * 0.07, blockY * 0.07, 6100) > 0.65) {
          return 'mines';
        }
      }
      // Oasis (safe haven in desert)
      if (moisture > 0.4 && elevation < -0.2 && temperature > 0.3 && temperature < 0.7) {
        if (this.noiseGen.noise(blockX * 0.04, blockY * 0.04, 6200) > 0.6) {
          return 'oasis';
        }
      }
    }
    
    // RARE BIOMES
    if (rarityNoise > 0.55) {
      if (elevation < -0.45) return 'caves';
      if (temperature > 0.45 && moisture > 0.55 && elevation > -0.15 && elevation < 0.35) return 'jungle';
      if (moisture > 0.45 && elevation > -0.12 && elevation < 0.05 && temperature > 0.15) return 'mangrove';
      if (elevation < -0.08 && elevation > -0.28 && temperature > 0.35) {
        if (this.noiseGen.noise(blockX * 0.09, blockY * 0.09, 6300) > 0.45) return 'coral_reef';
      }
      if (temperature > 0.35 && moisture < -0.25 && elevation > 0.25 && elevation < 0.55) return 'badlands';
      if (temperature > 0.35 && moisture < -0.45 && elevation > -0.08 && elevation < 0.35) return 'wasteland';
      if (temperature < -0.25 && moisture > 0.05 && elevation > 0.15 && elevation < 0.45) return 'snowy_taiga';
      if (temperature < -0.35 && moisture < 0.05 && elevation > 0.05) return 'tundra';
      
      // Canyons in desert regions
      if (temperature > 0.4 && moisture < -0.3 && elevation > 0.3 && elevation < 0.6) {
        if (this.noiseGen.noise(blockX * 0.06, blockY * 0.06, 6400) > 0.6) return 'canyon';
      }
    }
    
    // RUINS (common in mid-range, avoid safe zone)
    if (!inSafeZone && distanceFromSpawn > 200 && contamination > 0.2) {
      if (this.noiseGen.noise(blockX * 0.03, blockY * 0.03, 7000) > 0.68) {
        return 'ruins';
      }
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
      if (moisture > 0.25 && elevation < 0.15) return 'plains'; // Savanna-like
    }
    
    // TEMPERATE BIOMES
    if (moisture > 0.28 && elevation > -0.08 && elevation < 0.25) {
      if (this.noiseGen.noise(blockX * 0.05, blockY * 0.05, 8000) > 0.25) return 'forest';
    }
    if (moisture > 0.48 && elevation > -0.08 && elevation < 0.12) return 'swamp';
    if (moisture < -0.15 && moisture > -0.45 && elevation > -0.08 && elevation < 0.35) return 'plains';
    
    return 'grasslands';
  }

  private getElevation(x: number, y: number): number {
    const scale = 0.012;
    const elev1 = this.noiseGen.noise(x * scale * 0.6, y * scale * 0.6, 3000);
    const elev2 = this.noiseGen.noise(x * scale * 1.8, y * scale * 1.8, 3100);
    return elev1 * 0.7 + elev2 * 0.3;
  }

  private getTileType(x: number, y: number): TileType {
    const scale = 0.012;
    const weights = this.getBiomeWeights(x * scale, y * scale);
    return this.determineBiome(weights, x * 16, y * 16);
  }

  private getTileVariant(x: number, y: number, type: TileType): number {
    const hash = this.noiseGen.noise(x * 0.08, y * 0.08, 9000);
    const count = 6; // Standard variant count
    return Math.floor((hash + 1) * 0.5 * count);
  }

  private calculateBlendFactor(weights: BiomeWeights): number {
    const boundaries = [
      Math.abs(weights.elevation + 0.55),
      Math.abs(weights.elevation + 0.32),
      Math.abs(weights.elevation - 0.58),
      Math.abs(weights.temperature + 0.25),
      Math.abs(weights.temperature - 0.35),
      Math.abs(weights.moisture + 0.28),
      Math.abs(weights.moisture - 0.28)
    ];
    
    const minDistance = Math.min(...boundaries);
    return Math.min(1, minDistance * 10);
  }

  private calculateZombieSpawnWeight(biomeType: TileType, blockX: number, blockY: number): number {
    const distanceFromSpawn = Math.sqrt(blockX * blockX + blockY * blockY);
    
    // Safe zone around spawn
    if (distanceFromSpawn < this.spawnSafeZoneRadius) {
      return 0.1;
    }
    
    // Base weights by biome
    const baseWeights: Partial<Record<TileType, number>> = {
      grasslands: 0.5,
      plains: 0.4,
      forest: 0.7,
      swamp: 0.9,
      wasteland: 1.0,
      ruins: 1.0,
      bunker: 0.1,
      jungle: 0.8,
      caves: 0.95,
      dead_zone: 1.0,
      infection_site: 1.0,
      desert: 0.4,
      mountain: 0.3,
      snowy_plains: 0.5,
      tundra: 0.3,
      oasis: 0.2,
      river: 0.1,
      ocean: 0.0
    };
    
    const baseWeight = baseWeights[biomeType] ?? 0.5;
    
    // Distance multiplier (more zombies further from spawn)
    const distanceMultiplier = Math.min(2.0, 0.5 + (distanceFromSpawn / 1000));
    
    return baseWeight * distanceMultiplier;
  }

  private shouldGenerateStructure(tileX: number, tileY: number, biomeType: TileType): boolean {
    // Structure generation based on biome
    const structureChance: Partial<Record<TileType, number>> = {
      ruins: 0.4,
      bunker: 0.8,
      wasteland: 0.2,
      plains: 0.05,
      grasslands: 0.03,
      desert: 0.08,
      forest: 0.06
    };
    
    const chance = structureChance[biomeType] ?? 0;
    if (chance === 0) return false;
    
    const noise = this.noiseGen.noise(tileX * 0.02, tileY * 0.02, 10000);
    return (noise + 1) * 0.5 < chance;
  }

  private getTileThreatLevel(biomeType: TileType): number {
    const threatLevels: Partial<Record<TileType, number>> = {
      grasslands: 0.3,
      plains: 0.2,
      forest: 0.5,
      swamp: 0.8,
      wasteland: 1.0,
      ruins: 1.0,
      bunker: 0.0,
      jungle: 0.7,
      caves: 0.95,
      dead_zone: 1.0,
      infection_site: 1.0,
      desert: 0.4,
      mountain: 0.2,
      snowy_plains: 0.4,
      river: 0.1,
      ocean: 0.0
    };
    
    return threatLevels[biomeType] ?? 0.5;
  }

  clearCache(): void {
    this.noiseGen.clearCache();
  }
}