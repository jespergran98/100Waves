// World generation and tile types with enhanced biome diversity

export type TileType = 
  // Common biomes
  | 'grasslands'
  | 'plains'
  | 'forest'
  | 'river'
  | 'ocean'
  | 'deep_ocean'
  | 'swamp'
  
  // Temperate biomes
  | 'savanna'
  | 'wooded_badlands'
  
  // Cold biomes
  | 'snowy_plains'
  | 'frozen_ocean'
  | 'deep_frozen_ocean'
  | 'taiga'
  | 'snowy_taiga'
  | 'tundra'
  
  // Hot/Dry biomes
  | 'desert'
  | 'badlands'
  | 'wastelands'
  
  // Rare biomes
  | 'oasis'
  | 'coral_reef'
  | 'mangrove'
  | 'jungle'
  
  // Mountain/Underground
  | 'mountain'
  | 'caves'
  | 'mines'
  
  // Ultra-rare biomes
  | 'ashlands'
  | 'molten_wastes';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WorldData {
  name: string;
  seed: string;
  difficulty: Difficulty;
}

export interface Block {
  type: TileType;
  x: number;
  y: number;
  blendFactor?: number;
  elevation?: number;
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  variant?: number;
  blocks: Block[][];
  elevation?: number;
}

export interface WorldConfig {
  chunkSize: number;
  tileSize: number;
  blockSize: number;
  blocksPerTile: number;
  viewDistance: number;
  spawnX: number;
  spawnY: number;
}

export interface Chunk {
  x: number;
  y: number;
  tiles: Tile[][];
}

export interface ChunkKey {
  x: number;
  y: number;
}

export interface DifficultySettings {
  resourceMultiplier: number;
  enemySpawnRate: number;
  enemyHealthMultiplier: number;
  playerDamageMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    resourceMultiplier: 1.5,
    enemySpawnRate: 0.7,
    enemyHealthMultiplier: 0.8,
    playerDamageMultiplier: 1.2
  },
  medium: {
    resourceMultiplier: 1.0,
    enemySpawnRate: 1.0,
    enemyHealthMultiplier: 1.0,
    playerDamageMultiplier: 1.0
  },
  hard: {
    resourceMultiplier: 0.6,
    enemySpawnRate: 1.4,
    enemyHealthMultiplier: 1.3,
    playerDamageMultiplier: 0.9
  }
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  chunkSize: 16,
  tileSize: 64,      // Increased from 32 for more zoom
  blockSize: 4,       // Increased from 2 for more zoom
  blocksPerTile: 16,
  viewDistance: 2,    // Reduced from 3 since we're more zoomed in
  spawnX: 0,
  spawnY: 0
};

// Biome rarity levels
export type BiomeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const BIOME_RARITY: Record<TileType, BiomeRarity> = {
  grasslands: 'common',
  plains: 'common',
  forest: 'common',
  river: 'common',
  ocean: 'common',
  deep_ocean: 'common',
  swamp: 'uncommon',
  savanna: 'uncommon',
  wooded_badlands: 'uncommon',
  snowy_plains: 'uncommon',
  frozen_ocean: 'uncommon',
  deep_frozen_ocean: 'uncommon',
  taiga: 'uncommon',
  snowy_taiga: 'rare',
  tundra: 'rare',
  desert: 'uncommon',
  badlands: 'rare',
  wastelands: 'rare',
  oasis: 'epic',
  coral_reef: 'rare',
  mangrove: 'rare',
  jungle: 'rare',
  mountain: 'uncommon',
  caves: 'rare',
  mines: 'epic',
  ashlands: 'legendary',
  molten_wastes: 'legendary'
};