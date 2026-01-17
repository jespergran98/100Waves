// src/types/world.types.ts

/**
 * Biome types optimized for zombie survival gameplay
 * Each biome affects zombie behavior, resources, and player strategy
 */
export type TileType = 
  // Safe/Resource-rich biomes
  | 'grasslands'      // Moderate zombies, good visibility
  | 'plains'          // Open terrain, easy to spot zombies
  | 'forest'          // Dense cover, ambush danger
  
  // Strategic locations
  | 'river'           // Natural barriers
  | 'ocean'           // Impassable water
  | 'deep_ocean'      // Deep water
  
  // Dangerous biomes
  | 'swamp'           // Slow movement, high zombie density
  | 'wasteland'       // Irradiated, mutated zombies
  
  // Urban/Structure biomes
  | 'ruins'           // Abandoned cities, high loot, high danger
  | 'bunker'          // Safe zones, limited resources
  
  // Harsh environment biomes
  | 'snowy_plains'    // Cold damage, reduced zombie speed
  | 'frozen_ocean'    // Frozen water
  | 'deep_frozen_ocean'
  | 'taiga'           // Forest in cold regions
  | 'snowy_taiga'
  | 'tundra'          // Barren cold wasteland
  
  // Desert biomes
  | 'desert'          // Heat damage, mirages
  | 'badlands'        // Rocky, difficult terrain
  | 'canyon'          // Deep ravines
  
  // Rare/Special biomes
  | 'oasis'           // Safe haven in desert
  | 'coral_reef'      // Coastal areas
  | 'mangrove'        // Swampy coast
  | 'jungle'          // Dense vegetation, poor visibility
  
  // Mountain/Underground
  | 'mountain'        // High elevation, fewer zombies
  | 'caves'           // Underground, special infected
  | 'mines'           // Abandoned mines, rare resources
  
  // Apocalypse-themed legendary biomes
  | 'dead_zone'       // Ground zero, extreme danger
  | 'infection_site'; // Origin of outbreak, boss encounters

export type Difficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

export interface WorldData {
  name: string;
  seed: string;
  difficulty: Difficulty;
  daysSurvived?: number;
}

export interface Block {
  type: TileType;
  x: number;
  y: number;
  blendFactor?: number;
  elevation?: number;
  zombieSpawnWeight?: number; // How likely zombies spawn here
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  variant?: number;
  blocks: Block[][];
  elevation?: number;
  isExplored?: boolean;
  hasStructure?: boolean; // Buildings, bunkers, etc.
}

export interface WorldConfig {
  chunkSize: number;
  tileSize: number;
  blockSize: number;
  blocksPerTile: number;
  viewDistance: number;
  spawnX: number;
  spawnY: number;
  renderDistance: number;
  maxLoadedChunks: number;
}

export interface Chunk {
  x: number;
  y: number;
  tiles: Tile[][];
  threatLevel?: number; // 0-1 zombie danger rating
}

export interface ChunkKey {
  x: number;
  y: number;
}

export interface DifficultySettings {
  resourceMultiplier: number;
  zombieSpawnRate: number;
  zombieHealthMultiplier: number;
  playerDamageMultiplier: number;
  dayNightCycleSpeed: number;
  staminaDrainRate: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    resourceMultiplier: 1.5,
    zombieSpawnRate: 0.6,
    zombieHealthMultiplier: 0.7,
    playerDamageMultiplier: 1.3,
    dayNightCycleSpeed: 1.0,
    staminaDrainRate: 0.7
  },
  medium: {
    resourceMultiplier: 1.0,
    zombieSpawnRate: 1.0,
    zombieHealthMultiplier: 1.0,
    playerDamageMultiplier: 1.0,
    dayNightCycleSpeed: 1.0,
    staminaDrainRate: 1.0
  },
  hard: {
    resourceMultiplier: 0.7,
    zombieSpawnRate: 1.4,
    zombieHealthMultiplier: 1.3,
    playerDamageMultiplier: 0.85,
    dayNightCycleSpeed: 1.2,
    staminaDrainRate: 1.3
  },
  nightmare: {
    resourceMultiplier: 0.4,
    zombieSpawnRate: 2.0,
    zombieHealthMultiplier: 1.8,
    playerDamageMultiplier: 0.7,
    dayNightCycleSpeed: 1.5,
    staminaDrainRate: 1.6
  }
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  chunkSize: 12,           // 12x12 tiles per chunk
  tileSize: 128,           // 128px per tile
  blockSize: 8,            // 8px per block
  blocksPerTile: 16,       // 16x16 blocks per tile
  viewDistance: 1,         // Chunks around viewport
  spawnX: 0,
  spawnY: 0,
  renderDistance: 2,       // How far to render
  maxLoadedChunks: 200     // Memory management
};

// Biome rarity and threat levels
export type BiomeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'extreme';

export const BIOME_RARITY: Record<TileType, BiomeRarity> = {
  grasslands: 'common',
  plains: 'common',
  forest: 'common',
  river: 'common',
  ocean: 'common',
  deep_ocean: 'common',
  swamp: 'uncommon',
  wasteland: 'rare',
  ruins: 'uncommon',
  bunker: 'epic',
  snowy_plains: 'uncommon',
  frozen_ocean: 'uncommon',
  deep_frozen_ocean: 'uncommon',
  taiga: 'uncommon',
  snowy_taiga: 'rare',
  tundra: 'rare',
  desert: 'uncommon',
  badlands: 'rare',
  canyon: 'rare',
  oasis: 'epic',
  coral_reef: 'rare',
  mangrove: 'rare',
  jungle: 'rare',
  mountain: 'uncommon',
  caves: 'rare',
  mines: 'epic',
  dead_zone: 'legendary',
  infection_site: 'legendary'
};

export const BIOME_THREAT: Record<TileType, ThreatLevel> = {
  grasslands: 'low',
  plains: 'low',
  forest: 'medium',
  river: 'safe',
  ocean: 'safe',
  deep_ocean: 'safe',
  swamp: 'high',
  wasteland: 'extreme',
  ruins: 'extreme',
  bunker: 'safe',
  snowy_plains: 'medium',
  frozen_ocean: 'safe',
  deep_frozen_ocean: 'safe',
  taiga: 'medium',
  snowy_taiga: 'medium',
  tundra: 'low',
  desert: 'medium',
  badlands: 'medium',
  canyon: 'high',
  oasis: 'safe',
  coral_reef: 'low',
  mangrove: 'high',
  jungle: 'high',
  mountain: 'low',
  caves: 'extreme',
  mines: 'high',
  dead_zone: 'extreme',
  infection_site: 'extreme'
};

// Resource spawn rates per biome (0-1)
export const BIOME_RESOURCES: Record<TileType, number> = {
  grasslands: 0.7,
  plains: 0.6,
  forest: 0.8,
  river: 0.3,
  ocean: 0.1,
  deep_ocean: 0.0,
  swamp: 0.4,
  wasteland: 0.2,
  ruins: 0.9,
  bunker: 1.0,
  snowy_plains: 0.4,
  frozen_ocean: 0.1,
  deep_frozen_ocean: 0.0,
  taiga: 0.6,
  snowy_taiga: 0.5,
  tundra: 0.3,
  desert: 0.3,
  badlands: 0.4,
  canyon: 0.5,
  oasis: 0.9,
  coral_reef: 0.5,
  mangrove: 0.6,
  jungle: 0.7,
  mountain: 0.5,
  caves: 0.8,
  mines: 0.95,
  dead_zone: 0.6,
  infection_site: 0.8
};