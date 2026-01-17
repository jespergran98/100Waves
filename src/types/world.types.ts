// World generation and tile types with enhanced detail

export type TileType = 
  | 'grass' 
  | 'dirt' 
  | 'water' 
  | 'deep_water'
  | 'sand' 
  | 'stone' 
  | 'gravel'
  | 'forest'
  | 'dead_tree'
  | 'concrete'
  | 'asphalt';

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
  blendFactor?: number; // 0-1 for biome blending
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  variant?: number;
  blocks: Block[][]; // 16x16 grid of blocks
}

export interface WorldConfig {
  chunkSize: number;
  tileSize: number;
  blockSize: number; // New: size of each block within a tile
  blocksPerTile: number; // New: 16x16 blocks per tile
  viewDistance: number;
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

// Difficulty settings for gameplay mechanics
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
  tileSize: 32,
  blockSize: 2,        // Each block is 2x2 pixels
  blocksPerTile: 16,   // 16x16 blocks per tile
  viewDistance: 3
};